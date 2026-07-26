import { computed, ref } from "vue";
import { Activity, MessageSquare, Plug } from "lucide-vue-next";
import { useSystemStore } from "@/store/system.js";
import { useBotStore } from "@/store/bot";
import { analyticsApi, mainApi, systemApi } from "@/utils/api-next";
import type {
    SystemInfo,
    SystemStatus,
    TrendData,
} from "@/types/api-next.types";
import type {
    DashboardNetworkStatus,
    DashboardStatCard,
    DashboardSystemInfo,
    Trend,
} from "@/views/dashboard/types";

const defaultSystemInfo: DashboardSystemInfo = {
    version: "v1.0.0",
    system: "",
    cpuBrand: "",
    cpuCores: 0,
    cpuFreq: 0,
    memoryTotal: 0,
};

const defaultNetworkStatus: DashboardNetworkStatus = {
    google: "checking",
    baidu: "checking",
};

const defaultStatsTrend: Record<string, Trend> = {
    chat_num: "stable",
    chat_day: "stable",
    call_num: "stable",
    call_day: "stable",
};

const toFiniteNumber = (value: unknown) => {
    const numberValue = Number(value);
    return Number.isFinite(numberValue) ? numberValue : null;
};

const compareTrend = (current: number, previous: number): Trend => {
    if (current > previous) return "up";
    if (current < previous) return "down";
    return "stable";
};

export const useDashboardData = () => {
    const systemStore = useSystemStore();
    const botStore = useBotStore();

    const systemInfo = ref<DashboardSystemInfo>({ ...defaultSystemInfo });
    const networkStatus = ref<DashboardNetworkStatus>({
        ...defaultNetworkStatus,
    });
    const statsTrend = ref<Record<string, Trend>>({ ...defaultStatsTrend });

    const updateSystemUsage = (data: SystemStatus) => {
        const cpu = toFiniteNumber(data?.cpu);
        const memory = toFiniteNumber(data?.memory);
        const disk = toFiniteNumber(data?.disk);

        if (cpu !== null) systemStore.systemStatus.cpu = cpu;
        if (memory !== null) systemStore.systemStatus.memory = memory;
        if (disk !== null) systemStore.systemStatus.disk = disk;
    };

    const updateSystemInfo = (data: SystemInfo) => {
        systemInfo.value = {
            version: data.version,
            system: data.system,
            cpuBrand: data.cpu_brand,
            cpuCores: data.cpu_cores,
            cpuFreq: data.cpu_freq_mhz,
            memoryTotal: data.memory_total,
        };
    };

    const updateTrendData = (trendData: TrendData) => {
        const points = trendData.data_points;
        if (!points || points.length < 2) return;

        const latest = points[points.length - 1];
        const previous = points[points.length - 2];

        statsTrend.value.chat_num = compareTrend(
            latest.message_count,
            previous.message_count,
        );
        statsTrend.value.call_num = compareTrend(
            latest.plugin_call_count,
            previous.plugin_call_count,
        );

        if (points.length < 3) return;

        const previousDay = points[points.length - 3];

        statsTrend.value.chat_day = compareTrend(
            latest.message_count,
            previousDay.message_count,
        );
        statsTrend.value.call_day = compareTrend(
            latest.plugin_call_count,
            previousDay.plugin_call_count,
        );
    };

    const checkNetwork = async () => {
        try {
            const response = await systemApi.checkNetwork();
            networkStatus.value =
                response?.success && response?.data
                    ? response.data
                    : { google: false, baidu: false };
        } catch {
            networkStatus.value = { google: false, baidu: false };
        }
    };

    const loadDashboardData = async () => {
        try {
            systemStore.fetchAllStatistics();
            systemStore.fetchCommits();

            const now = new Date();
            const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);

            const [botStatusRes, statusRes, infoRes, trendRes] =
                await Promise.allSettled([
                    mainApi.getBotStatus(),
                    systemApi.getStatus(),
                    systemApi.getSystemInfo(),
                    analyticsApi.getTrendData({
                        start_time: yesterday.toISOString(),
                        end_time: now.toISOString(),
                        granularity: "hour",
                    }),
                ]);

            if (
                botStatusRes.status === "fulfilled" &&
                botStatusRes.value?.success &&
                botStatusRes.value?.data?.uptime_formatted
            ) {
                botStore.updateUptimeFormatted(
                    botStatusRes.value.data.uptime_formatted,
                );
            }

            if (
                statusRes.status === "fulfilled" &&
                statusRes.value?.success &&
                statusRes.value?.data
            ) {
                updateSystemUsage(statusRes.value.data);
            }

            if (
                infoRes.status === "fulfilled" &&
                infoRes.value?.success &&
                infoRes.value?.data
            ) {
                updateSystemInfo(infoRes.value.data);
            }

            if (
                trendRes.status === "fulfilled" &&
                trendRes.value?.success &&
                trendRes.value?.data
            ) {
                updateTrendData(trendRes.value.data);
            }

            void checkNetwork();
        } catch (error: unknown) {
            console.error("加载 Dashboard 数据失败:", error);
        }
    };

    const startDashboard = async () => {
        systemStore.startPolling();
        await botStore.getBotList();
        await loadDashboardData();
    };

    const stopDashboard = () => {
        systemStore.stopPolling();
    };

    const statCards = computed<DashboardStatCard[]>(() => [
        {
            id: "chat_num",
            title: "消息总数",
            value: botStore.selectedBot?.messages_total ?? 0,
            icon: MessageSquare,
            bgClass: "bg-zx-primary-soft",
            colorClass: "text-zx-primary",
            trend: statsTrend.value.chat_num,
        },
        {
            id: "chat_day",
            title: "今日消息",
            value: botStore.selectedBot?.received_messages ?? 0,
            icon: Activity,
            bgClass: "bg-zx-primary-soft",
            colorClass: "text-zx-primary",
            trend: statsTrend.value.chat_day,
        },
        {
            id: "call_num",
            title: "调用总数",
            value: botStore.selectedBot?.total_call ?? 0,
            icon: Plug,
            bgClass: "bg-zx-primary-soft",
            colorClass: "text-zx-primary",
            trend: statsTrend.value.call_num,
        },
        {
            id: "call_day",
            title: "今日调用",
            value: botStore.selectedBot?.day_call ?? 0,
            icon: Activity,
            bgClass: "bg-zx-primary-soft",
            colorClass: "text-zx-primary",
            trend: statsTrend.value.call_day,
        },
    ]);

    return {
        systemStore,
        systemInfo,
        networkStatus,
        statCards,
        startDashboard,
        stopDashboard,
    };
};
