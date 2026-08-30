import { computed, ref } from "vue";
import { Activity, Flame, MessageSquare, Package } from "lucide-vue-next";
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
    diskTotal: 0,
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

const defaultStatsChange: Record<string, number | null> = {
    chat_num: null,
    chat_day: null,
    call_num: null,
    call_day: null,
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

/** 趋势方向 + 相对变化百分比（基数为 0 时无法计算，返回 null） */
const compareWithChange = (
    current: number,
    previous: number,
): { trend: Trend; change: number | null } => {
    // 基数为 0 但当前有数据时按 +100% 展示，否则百分比永远缺席
    const change =
        previous > 0
            ? ((current - previous) / previous) * 100
            : current > 0
              ? 100
              : null;
    return { trend: compareTrend(current, previous), change };
};

/** 本地时间的 ISO 风格字符串（不带时区）：
 *  后端按本地时间入库，toISOString 的 UTC 会造成查询窗口偏移 */
const toLocalIso = (d: Date) => {
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
};

export const useDashboardData = () => {
    const systemStore = useSystemStore();
    const botStore = useBotStore();

    const systemInfo = ref<DashboardSystemInfo>({ ...defaultSystemInfo });
    const networkStatus = ref<DashboardNetworkStatus>({
        ...defaultNetworkStatus,
    });
    // 首屏骨架屏开关：仅首次加载数据期间为 true，轮询刷新不影响
    const loading = ref(true);
    const statsTrend = ref<Record<string, Trend>>({ ...defaultStatsTrend });
    const statsChange = ref<Record<string, number | null>>({
        ...defaultStatsChange,
    });

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
            diskTotal: data.disk_total ?? 0,
        };
    };

    const updateTrendData = (trendData: TrendData) => {
        const points = trendData.data_points;
        if (!points || points.length < 2) return;

        const latest = points[points.length - 1];
        const previous = points[points.length - 2];

        const numResult = compareWithChange(
            latest.message_count,
            previous.message_count,
        );
        statsTrend.value.chat_num = numResult.trend;
        statsChange.value.chat_num = numResult.change;

        const callResult = compareWithChange(
            latest.plugin_call_count,
            previous.plugin_call_count,
        );
        statsTrend.value.call_num = callResult.trend;
        statsChange.value.call_num = callResult.change;

        if (points.length < 3) return;

        const previousDay = points[points.length - 3];

        const dayNumResult = compareWithChange(
            latest.message_count,
            previousDay.message_count,
        );
        statsTrend.value.chat_day = dayNumResult.trend;
        statsChange.value.chat_day = dayNumResult.change;

        const dayCallResult = compareWithChange(
            latest.plugin_call_count,
            previousDay.plugin_call_count,
        );
        statsTrend.value.call_day = dayCallResult.trend;
        statsChange.value.call_day = dayCallResult.change;
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
                        start_time: toLocalIso(yesterday),
                        end_time: toLocalIso(now),
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
        try {
            await loadDashboardData();
        } finally {
            loading.value = false;
        }
    };

    const stopDashboard = () => {
        systemStore.stopPolling();
    };

    const statCards = computed<DashboardStatCard[]>(() => [
        {
            id: "chat_num",
            title: "消息总数",
            // 计数值由 system store 每 5 秒轮询刷新，保证实时性
            value: systemStore.count.chat_num,
            icon: MessageSquare,
            strokeWidth: 2,
            colorClass: "text-sky-500",
            trend: statsTrend.value.chat_num,
            change: statsChange.value.chat_num,
        },
        {
            id: "chat_day",
            title: "今日消息",
            value: systemStore.count.chat_day,
            icon: Activity,
            strokeWidth: 2,
            colorClass: "text-emerald-500",
            trend: statsTrend.value.chat_day,
            change: statsChange.value.chat_day,
        },
        {
            id: "call_num",
            title: "调用总数",
            value: systemStore.count.call_num,
            icon: Package,
            strokeWidth: 2,
            colorClass: "text-amber-500",
            trend: statsTrend.value.call_num,
            change: statsChange.value.call_num,
        },
        {
            id: "call_day",
            title: "今日调用",
            value: systemStore.count.call_day,
            icon: Flame,
            strokeWidth: 2,
            colorClass: "text-violet-500",
            trend: statsTrend.value.call_day,
            change: statsChange.value.call_day,
        },
    ]);

    return {
        systemStore,
        systemInfo,
        networkStatus,
        statCards,
        loading,
        startDashboard,
        stopDashboard,
    };
};
