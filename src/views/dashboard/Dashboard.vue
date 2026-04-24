<script lang="ts" setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";
import {
    Activity,
    Cpu,
    Gauge,
    GitBranch,
    HardDrive,
    Hash,
    Info,
    MemoryStick,
    MessageSquare,
    Minus,
    Plug,
    Server,
    TrendingDown,
    TrendingUp,
    Wifi,
} from "lucide-vue-next";
import { useSystemStore } from "@/store/system.js";
import { useBotStore } from "@/store/bot";
import { analyticsApi, mainApi, systemApi } from "@/utils/api-next";

import { usePolling } from "@/composables/usePolling";

import SystemStatusCard from "./SystemStatusCard.vue";
import StatisticsCard from "@/views/dashboard/StatisticsCard.vue";
import UserCard from "@/views/dashboard/UserCard.vue";
import CommitTimeline from "@/views/dashboard/CommitTimeline.vue";
import LogCard from "@/views/dashboard/LogCard.vue";

const systemStore = useSystemStore();
const botStore = useBotStore();

// 启动时间
const botStartTime = ref<Date | null>(null);

// 当前时间，用于实时计算运行时长（每秒更新）
const currentTime = ref(new Date());

// 系统状态
const systemHealth = ref<"healthy" | "warning" | "error">("healthy");

// 监听系统状态变化，更新健康状态指示器
// WebSocket 已通过 systemStore.systemStatus 更新数据
watch(
    () => systemStore.systemStatus,
    (status) => {
        if (status.cpu > 90 || status.memory > 90 || status.disk > 90) {
            systemHealth.value = "error";
        } else if (status.cpu > 70 || status.memory > 70 || status.disk > 70) {
            systemHealth.value = "warning";
        } else {
            systemHealth.value = "healthy";
        }
    },
    { immediate: true, deep: true },
);

// 系统信息
const systemInfo = ref({
    version: "v1.0.0", // 版本号
    system: "",
    cpuBrand: "",
    cpuCores: 0,
    cpuFreq: 0,
    memoryTotal: 0,
});

// 网络状态：'checking' 表示检测中，true/false 表示可达/不可达
const networkStatus = ref<{
    google: boolean | "checking";
    baidu: boolean | "checking";
}>({
    google: "checking",
    baidu: "checking",
});

// 统计数据趋势（从后端获取）
const statsTrend = ref<{
    chat_num: "up" | "down" | "stable";
    chat_day: "up" | "down" | "stable";
    call_num: "up" | "down" | "stable";
    call_day: "up" | "down" | "stable";
}>({
    chat_num: "stable",
    chat_day: "stable",
    call_num: "stable",
    call_day: "stable",
});

// 获取趋势图标
/**
 * @param {string} trend
 */
const getTrendIcon = (trend: "up" | "down" | "stable" | undefined) => {
    switch (trend) {
        case "up":
            return { icon: TrendingUp, color: "text-green-500" };
        case "down":
            return { icon: TrendingDown, color: "text-red-500" };
        default:
            return { icon: Minus, color: "text-gray-400" };
    }
};

// 加载 Dashboard 数据（使用新后端 API）
const loadDashboardData = async () => {
    try {
        // 这两个内部自己更新 store，不阻塞
        systemStore.fetchAllStatistics();
        systemStore.fetchCommits();

        const now = new Date();
        const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);

        // 需要返回值的并发请求
        const [healthRes, botStatusRes, statusRes, infoRes, trendRes] =
            await Promise.allSettled([
                systemApi.getHealth(),
                mainApi.getBotStatus(),
                systemApi.getStatus(),
                systemApi.getSystemInfo(),
                analyticsApi.getTrendData({
                    start_time: yesterday.toISOString(),
                    end_time: now.toISOString(),
                    granularity: "hour",
                }),
            ]);

        // 获取系统健康状态
        if (
            healthRes.status === "fulfilled" &&
            healthRes.value?.success &&
            healthRes.value?.data
        ) {
            systemHealth.value = healthRes.value.data.status;
        }

        // 获取 Bot 状态（包含运行时长）
        if (
            botStatusRes.status === "fulfilled" &&
            botStatusRes.value?.success &&
            botStatusRes.value?.data
        ) {
            if (botStatusRes.value.data.start_time) {
                botStartTime.value = new Date(
                    botStatusRes.value.data.start_time,
                );
            }

            if (botStatusRes.value.data.uptime_formatted) {
                botStore.updateUptimeFormatted(
                    botStatusRes.value.data.uptime_formatted,
                );
            }
        }

        // 获取系统状态用于 CPU/内存/磁盘显示
        if (
            statusRes.status === "fulfilled" &&
            statusRes.value?.success &&
            statusRes.value?.data
        ) {
            const cpu = Number(statusRes.value.data.cpu);
            const memory = Number(statusRes.value.data.memory);
            const disk = Number(statusRes.value.data.disk);

            if (!isNaN(cpu) && isFinite(cpu)) {
                systemStore.systemStatus.cpu = cpu;
            }

            if (!isNaN(memory) && isFinite(memory)) {
                systemStore.systemStatus.memory = memory;
            }

            if (!isNaN(disk) && isFinite(disk)) {
                systemStore.systemStatus.disk = disk;
            }
        }

        // 获取系统信息
        if (
            infoRes.status === "fulfilled" &&
            infoRes.value?.success &&
            infoRes.value?.data
        ) {
            systemInfo.value = {
                version: infoRes.value.data.version,
                system: infoRes.value.data.system,
                cpuBrand: infoRes.value.data.cpu_brand,
                cpuCores: infoRes.value.data.cpu_cores,
                cpuFreq: infoRes.value.data.cpu_freq_mhz,
                memoryTotal: infoRes.value.data.memory_total,
            };
        }

        // 网络检测，不阻塞主流程
        systemApi
            .checkNetwork()
            .then((networkRes) => {
                if (networkRes?.success && networkRes?.data) {
                    networkStatus.value = networkRes.data;
                } else {
                    networkStatus.value = {
                        google: false,
                        baidu: false,
                    };
                }
            })
            .catch(() => {
                networkStatus.value = {
                    google: false,
                    baidu: false,
                };
            });

        // 获取趋势数据
        if (
            trendRes.status === "fulfilled" &&
            trendRes.value?.success &&
            trendRes.value?.data?.data_points &&
            trendRes.value.data.data_points.length >= 2
        ) {
            const dataPoints = trendRes.value.data.data_points;

            const latest = dataPoints[dataPoints.length - 1];

            const previous = dataPoints[dataPoints.length - 2];

            if (latest.message_count > previous.message_count) {
                statsTrend.value.chat_num = "up";
            } else if (latest.message_count < previous.message_count) {
                statsTrend.value.chat_num = "down";
            } else {
                statsTrend.value.chat_num = "stable";
            }

            if (latest.plugin_call_count > previous.plugin_call_count) {
                statsTrend.value.call_num = "up";
            } else if (latest.plugin_call_count < previous.plugin_call_count) {
                statsTrend.value.call_num = "down";
            } else {
                statsTrend.value.call_num = "stable";
            }

            if (dataPoints.length >= 3) {
                const prevDay = dataPoints[dataPoints.length - 3];

                statsTrend.value.chat_day =
                    latest.message_count > prevDay.message_count
                        ? "up"
                        : latest.message_count < prevDay.message_count
                          ? "down"
                          : "stable";

                statsTrend.value.call_day =
                    latest.plugin_call_count > prevDay.plugin_call_count
                        ? "up"
                        : latest.plugin_call_count < prevDay.plugin_call_count
                          ? "down"
                          : "stable";
            }
        }
    } catch (error: any) {
        console.error("加载 Dashboard 数据失败:", error);

        if (error?.response?.status) {
            console.warn("趋势数据获取失败，使用默认值");
        }
    }
};
// 定时器 - 使用页面可见性感知的轮询
// uptimePolling: 每秒更新当前时间用于实时显示运行时长
const { start: startUptimePolling, stop: stopUptimePolling } = usePolling(
    () => {
        currentTime.value = new Date();
    },
    1000,
    { autoStart: false },
);

onMounted(async () => {
    systemStore.startPolling();
    await botStore.getBotList();
    await loadDashboardData();

    // 启动运行时长计时器（页面可见性感知）
    startUptimePolling();
});

onBeforeUnmount(() => {
    systemStore.stopPolling();
    stopUptimePolling();
});

const statCards = computed(() => [
    {
        id: "chat_num",
        title: "消息总数",
        value: botStore.selectedBot?.messages_total ?? 0,
        icon: MessageSquare,
        bgClass: "bg-blue-100",
        colorClass: "text-blue-600",
        trend: statsTrend.value.chat_num as "up" | "down" | "stable",
    },
    {
        id: "chat_day",
        title: "今日消息",
        value: botStore.selectedBot?.received_messages ?? 0,
        icon: Activity,
        bgClass: "bg-green-100",
        colorClass: "text-green-600",
        trend: statsTrend.value.chat_day as "up" | "down" | "stable",
    },
    {
        id: "call_num",
        title: "调用总数",
        value: botStore.selectedBot?.total_call ?? 0,
        icon: Plug,
        bgClass: "bg-purple-100",
        colorClass: "text-purple-600",
        trend: statsTrend.value.call_num as "up" | "down" | "stable",
    },
    {
        id: "call_day",
        title: "今日调用",
        value: botStore.selectedBot?.day_call ?? 0,
        icon: Activity,
        bgClass: "bg-pink-100",
        colorClass: "text-pink-600",
        trend: statsTrend.value.call_day as "up" | "down" | "stable",
    },
]);
</script>

<template>
    <div class="flex min-h-full w-full flex-col sm:space-y-4">
        <div
            class="grid flex-1 grid-cols-1 gap-4 lg:grid-cols-2 2xl:min-h-0 2xl:grid-cols-3 2xl:grid-rows-[16rem_auto_minmax(0,1fr)]"
        >
            <!-- 顶部状态栏 -->
            <UserCard class="" />
            <!-- 核心统计 - 改进响应式网格 -->
            <div class="grid h-full grid-cols-2 grid-rows-2 gap-4">
                <StatisticsCard
                    v-for="item in statCards"
                    :key="item.id"
                    :title="item.title"
                    :value="item.value"
                    :icon="item.icon"
                    :icon-bg-class="item.bgClass"
                    :icon-color-class="item.colorClass"
                    :trend-icon="
                        item.trend ? getTrendIcon(item.trend).icon : undefined
                    "
                    :trend-color-class="
                        item.trend ? getTrendIcon(item.trend).color : undefined
                    "
                />
            </div>
            <CommitTimeline
                class="col-span-1 min-h-0 max-2xl:max-h-96 max-lg:max-h-64 lg:col-span-2 2xl:col-span-1 2xl:row-span-3 2xl:h-full"
            />
            <!-- 系统资源状态 - 改进响应式 -->
            <div
                class="grid h-full grid-cols-1 sm:grid-cols-2 sm:gap-4 lg:col-span-2 lg:grid-cols-3"
            >
                <SystemStatusCard
                    :icon="Cpu"
                    :value="systemStore.systemStatus.cpu"
                    icon-color="text-blue-500"
                    normal-bar-class="from-green-400 to-green-500"
                    title="CPU"
                    class="h-24"
                />

                <SystemStatusCard
                    :icon="MemoryStick"
                    :value="systemStore.systemStatus.memory"
                    icon-color="text-purple-500"
                    normal-bar-class="from-purple-400 to-purple-500"
                    title="内存"
                    class="h-24"
                />

                <SystemStatusCard
                    :icon="HardDrive"
                    :value="systemStore.systemStatus.disk"
                    class="h-24 sm:col-span-2 lg:col-span-1"
                    icon-color="text-orange-500"
                    normal-bar-class="from-orange-400 to-orange-500"
                    title="磁盘"
                />
            </div>
            <LogCard
                class="col-span-1 max-2xl:max-h-96 max-lg:max-h-64 lg:col-span-2"
            />
        </div>

        <!-- 系统信息 -->
        <div
            class="rounded-4xl border border-slate-200 bg-white p-3 shadow-sm sm:p-5"
        >
            <div class="mb-4 flex items-center space-x-2">
                <Info class="h-5 w-5 text-cyan-500" />
                <h3 class="text-sm font-semibold text-gray-700 sm:text-base">
                    系统信息
                </h3>
            </div>
            <div
                class="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3"
            >
                <!-- 版本信息 -->
                <div class="flex items-start space-x-2">
                    <div
                        class="flex h-8 w-8 shrink-0 items-center justify-center rounded-2xl"
                    >
                        <!--                        bg-blue-100-->
                        <GitBranch class="h-5 w-5 text-blue-600" />
                    </div>
                    <div class="min-w-0 flex-1">
                        <div class="text-xs text-gray-500">版本信息</div>
                        <div class="truncate text-sm font-medium text-gray-800">
                            {{ systemInfo.version }}
                        </div>
                    </div>
                </div>

                <!-- 系统版本 -->
                <div class="flex items-start space-x-2">
                    <div
                        class="flex h-8 w-8 shrink-0 items-center justify-center rounded-2xl"
                    >
                        <!--                        bg-purple-100-->
                        <Server class="h-5 w-5 text-purple-600" />
                    </div>
                    <div class="min-w-0 flex-1">
                        <div class="text-xs text-gray-500">系统版本</div>
                        <div
                            :title="systemInfo.system"
                            class="truncate text-sm font-medium text-gray-800"
                        >
                            {{ systemInfo.system || "-" }}
                        </div>
                    </div>
                </div>

                <!-- CPU 型号 -->
                <div class="flex items-start space-x-2">
                    <div
                        class="flex h-8 w-8 shrink-0 items-center justify-center rounded-2xl"
                    >
                        <!--                        bg-green-100-->
                        <Cpu class="h-5 w-5 text-green-600" />
                    </div>
                    <div class="min-w-0 flex-1">
                        <div class="text-xs text-gray-500">CPU 型号</div>
                        <div
                            :title="systemInfo.cpuBrand"
                            class="truncate text-sm font-medium text-gray-800"
                        >
                            {{ systemInfo.cpuBrand || "-" }}
                        </div>
                    </div>
                </div>

                <!-- 内核数 -->
                <div class="flex items-start space-x-2">
                    <div
                        class="flex h-8 w-8 shrink-0 items-center justify-center rounded-2xl"
                    >
                        <!--                        bg-orange-100-->
                        <Hash class="h-5 w-5 text-orange-600" />
                    </div>
                    <div class="min-w-0 flex-1">
                        <div class="text-xs text-gray-500">内核数</div>
                        <div class="text-sm font-medium text-gray-800">
                            {{ systemInfo.cpuCores || "-" }} 核心
                        </div>
                    </div>
                </div>

                <!-- CPU 主频 -->
                <div class="flex items-start space-x-2">
                    <div
                        class="flex h-8 w-8 shrink-0 items-center justify-center rounded-2xl"
                    >
                        <!--                        -->
                        <Gauge class="h-5 w-5 text-red-600" />
                    </div>
                    <div class="min-w-0 flex-1">
                        <div class="text-xs text-gray-500">CPU 主频</div>
                        <div class="text-sm font-medium text-gray-800">
                            {{
                                systemInfo.cpuFreq
                                    ? (systemInfo.cpuFreq / 1000).toFixed(2)
                                    : "-"
                            }}
                            GHz
                        </div>
                    </div>
                </div>

                <!-- 内存总量 -->
                <div class="flex items-start space-x-2">
                    <div
                        class="x flex h-8 w-8 shrink-0 items-center justify-center rounded-2xl"
                    >
                        <!--                        bg-red-100-->
                        <MemoryStick class="h-5 w-5 text-indigo-600" />
                    </div>
                    <div class="min-w-0 flex-1">
                        <div class="text-xs text-gray-500">内存总量</div>
                        <div class="text-sm font-medium text-gray-800">
                            {{
                                systemInfo.memoryTotal
                                    ? systemInfo.memoryTotal.toFixed(2)
                                    : "-"
                            }}
                            GB
                        </div>
                    </div>
                </div>
            </div>

            <!-- 网络状态 -->
            <div class="mt-4 border-t border-gray-100 pt-4">
                <div class="mb-3 flex items-center space-x-2">
                    <Wifi class="h-4 w-4 text-cyan-500" />
                    <h4 class="text-xs font-medium text-gray-600 sm:text-sm">
                        网络连接状态
                    </h4>
                </div>
                <div class="flex items-center space-x-4">
                    <div class="flex items-center space-x-2">
                        <div
                            :class="
                                networkStatus.baidu === 'checking'
                                    ? 'animate-pulse bg-yellow-500'
                                    : networkStatus.baidu
                                      ? 'animate-pulse bg-green-500'
                                      : 'bg-red-500'
                            "
                            class="h-2 w-2 rounded-full"
                        ></div>
                        <span class="text-xs text-gray-600 sm:text-sm"
                            >百度</span
                        >
                        <span
                            :class="
                                networkStatus.baidu === 'checking'
                                    ? 'text-yellow-600'
                                    : networkStatus.baidu
                                      ? 'text-green-600'
                                      : 'text-red-600'
                            "
                            class="text-xs font-medium"
                        >
                            {{
                                networkStatus.baidu === "checking"
                                    ? "检测中"
                                    : networkStatus.baidu
                                      ? "可达"
                                      : "不可达"
                            }}
                        </span>
                    </div>
                    <div class="flex items-center space-x-2">
                        <div
                            :class="
                                networkStatus.google === 'checking'
                                    ? 'animate-pulse bg-yellow-500'
                                    : networkStatus.google
                                      ? 'animate-pulse bg-green-500'
                                      : 'bg-red-500'
                            "
                            class="h-2 w-2 rounded-full"
                        ></div>
                        <span class="text-xs text-gray-600 sm:text-sm"
                            >谷歌</span
                        >
                        <span
                            :class="
                                networkStatus.google === 'checking'
                                    ? 'text-yellow-600'
                                    : networkStatus.google
                                      ? 'text-green-600'
                                      : 'text-red-600'
                            "
                            class="text-xs font-medium"
                        >
                            {{
                                networkStatus.google === "checking"
                                    ? "检测中"
                                    : networkStatus.google
                                      ? "可达"
                                      : "不可达"
                            }}
                        </span>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<style scoped></style>
