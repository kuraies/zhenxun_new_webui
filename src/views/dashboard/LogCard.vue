<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";
import { useLogsStore } from "@/store/logs";
import { FileText } from "lucide-vue-next";

const logsStore = useLogsStore();

// 自动滚动
const autoScroll = ref(true);
const logsContainer = ref<HTMLElement | null>(null);

// 过滤（这里默认不过滤，保留结构方便以后扩展）
const filteredLogs = computed(() => logsStore.logs);

// 时间格式
const formatTimestamp = (timestamp: string) => {
    if (!timestamp) return "";

    const date = new Date(timestamp);
    if (isNaN(date.getTime())) return timestamp;

    const h = String(date.getHours()).padStart(2, "0");
    const m = String(date.getMinutes()).padStart(2, "0");
    const s = String(date.getSeconds()).padStart(2, "0");

    return `${h}:${m}:${s}`;
};

// 自动滚动
const scrollToBottom = () => {
    if (logsContainer.value) {
        logsContainer.value.scrollTop = logsContainer.value.scrollHeight;
    }
};

watch(
    () => logsStore.logs.length,
    () => {
        if (autoScroll.value) {
            scrollToBottom();
        }
    },
);

onMounted(() => {
    logsStore.initWebSocket();
    scrollToBottom();
});
</script>

<template>
    <div
        class="flex h-full min-h-0 flex-col rounded-4xl border border-slate-200 bg-white p-5 pr-0.5 shadow-sm"
    >
        <!-- 标题（保留简化版） -->
        <div
            class="flex items-center justify-between border-b border-slate-100 pb-5"
        >
            <div class="flex items-center space-x-2">
                <FileText class="h-5 w-5 text-sky-600" />
                <span class="text-sm font-semibold text-gray-700"> 日志 </span>
            </div>
            <!--            <span class="text-xs text-gray-400">-->
            <!--                {{ filteredLogs.length }}-->
            <!--            </span>-->
        </div>

        <!-- 日志列表 -->
        <div ref="logsContainer" class="min-h-0 flex-1 overflow-y-auto">
            <div
                v-if="filteredLogs.length === 0"
                class="flex h-full items-center justify-center text-gray-400"
            >
                <span class="text-sm">暂无日志</span>
            </div>

            <div v-else class="divide-y divide-gray-100 pr-5">
                <div
                    v-for="(log, index) in filteredLogs"
                    :key="log.seq || index"
                    class="px-1 py-0.5 font-mono text-gray-700 hover:bg-gray-50 sm:text-sm"
                >
                    <span class="mr-2 text-xs text-gray-400">
                        {{ formatTimestamp(log.timestamp) }}
                    </span>
                    <span
                        :class="{
                            'text-red-500': log.level === 'ERROR',
                            'text-yellow-500': log.level === 'WARNING',
                            'text-blue-500': log.level === 'INFO',
                            'text-gray-500': log.level === 'DEBUG',
                        }"
                        class="mr-2 text-xs font-semibold"
                    >
                        [{{ log.level }}]
                    </span>

                    <span
                        v-if="log.module"
                        class="mr-2 text-xs text-purple-500"
                    >
                        ({{ log.module }})
                    </span>

                    <span class="text-xs break-all">
                        {{ log.message }}
                    </span>
                </div>
            </div>
        </div>
    </div>
</template>