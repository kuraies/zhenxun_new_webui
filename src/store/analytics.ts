// @/store/analytics.ts
import { defineStore } from "pinia";
import { ref } from "vue";

export const useAnalyticsStore = defineStore("analytics", () => {
    const startTime = ref<string>("");
    const endTime = ref<string>("");
    const granularity = ref("day");
    const selectedQuickRange = ref("30d");

    // 格式化 ISO 时间
    const formatToISOString = (date: Date): string => {
        const pad = (n: number) => n.toString().padStart(2, "0");
        return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
    };

    const setDefaultTimeRange = (hours: number = 30 * 24) => {
        const end = new Date();
        const start = new Date();
        start.setHours(start.getHours() - hours);
        startTime.value = formatToISOString(start);
        endTime.value = formatToISOString(end);
    };

    // 用于通知页面刷新的计数器或标志
    const refreshSignal = ref(0);
    const triggerRefresh = () => refreshSignal.value++;

    return {
        startTime,
        endTime,
        granularity,
        selectedQuickRange,
        setDefaultTimeRange,
        refreshSignal,
        triggerRefresh,
    };
});