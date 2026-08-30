<script setup lang="ts">
import type { LogEntry } from "@/types/api-next.types";

defineProps<{
    logs: LogEntry[];
}>();

const formatTimestamp = (timestamp: string) => {
    if (!timestamp) return "";

    const date = new Date(timestamp);
    if (isNaN(date.getTime())) return timestamp;

    const h = String(date.getHours()).padStart(2, "0");
    const m = String(date.getMinutes()).padStart(2, "0");
    const s = String(date.getSeconds()).padStart(2, "0");

    return `${h}:${m}:${s}`;
};

const levelClass = (level: LogEntry["level"]) => {
    switch (level) {
        case "ERROR":
            return "text-red-600";
        case "WARNING":
            return "text-amber-600";
        case "INFO":
            return "text-sky-600";
        case "DEBUG":
            return "text-slate-500";
        default:
            return "text-slate-500";
    }
};
</script>

<template>
    <div
        v-if="logs.length === 0"
        class="flex h-full items-center justify-center text-gray-400"
    >
        <span class="text-sm">暂无日志</span>
    </div>

    <div v-else class="space-y-0.5 pr-2 font-mono text-xs sm:pr-5">
        <div
            v-for="(log, index) in logs"
            :key="log.seq || index"
            class="grid grid-cols-[2.5rem_2.6rem_minmax(0,1fr)] items-center gap-1 rounded-lg px-1 text-slate-700 transition-colors hover:bg-slate-200/70 sm:grid-cols-[3rem_3rem_minmax(0,1fr)] sm:gap-1.5 sm:px-2"
        >
            <span class="text-[10px] text-slate-400 tabular-nums ">
                {{ formatTimestamp(log.timestamp) }}
            </span>
            <span
                :class="levelClass(log.level)"
                class="flex h-5 items-center justify-center text-[12px] font-semibold"
            >
                {{ log.level }}
            </span>

            <div class="min-w-0 leading-5">
                <span
                    v-if="log.module"
                    class="mr-2 inline-flex max-w-40 align-baseline"
                >
                    <span
                        :title="log.module"
                        class="truncate py-0.5 pr-1 text-[12px] font-bold text-violet-500"
                    >
                        {{ log.module }}
                    </span>
                </span>
                <span class="break-words text-slate-700 select-text">
                    {{ log.message }}
                </span>
            </div>
        </div>
    </div>
</template>
