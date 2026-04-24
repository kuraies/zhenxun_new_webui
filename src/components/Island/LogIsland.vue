<script setup lang="ts">
import { FileText } from "lucide-vue-next";
import { storeToRefs } from "pinia";
import { useLogsStore } from "@/store/logs.ts";

const logsStore = useLogsStore();

const { autoScroll } = storeToRefs(logsStore);

// 清空日志
const clearLogs = () => {
    logsStore.clearLogs();
};
</script>

<template>
    <div class="flex w-full items-center justify-between">
        <div
            class="group flex w-fit items-center space-x-3 rounded-full border border-white/10 bg-white px-4 py-2 shadow-sm transition-all hover:scale-105"
        >
            <FileText class="h-5 w-5 text-blue-500" />
            <span class="text-sm font-medium text-slate-700">实时日志</span>
        </div>
        <div class="flex w-full items-center space-x-2 sm:w-auto">
            <button
                @click="autoScroll = !autoScroll"
                :class="
                    autoScroll
                        ? 'bg-blue-100 text-blue-700'
                        : 'bg-gray-100 text-gray-600'
                "
                class="btn-touch flex-shrink-0 cursor-pointer rounded-2xl px-3 py-1.5 text-sm font-medium shadow-sm transition-colors"
            >
                自动滚动 {{ autoScroll ? "开" : "关" }}
            </button>
            <button
                @click="clearLogs"
                class="btn-touch flex-shrink-0 cursor-pointer rounded-2xl bg-red-50 px-3 py-1.5 text-sm font-medium text-red-600 shadow-sm transition-colors hover:bg-red-100"
            >
                清空日志
            </button>
        </div>
    </div>
</template>

<style scoped></style>
