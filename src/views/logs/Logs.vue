<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { useLogsStore } from "@/store/logs";
import { FileText, Search, X } from "lucide-vue-next";
import type { LogLevel } from "@/types/log.types";
import { storeToRefs } from "pinia";
import { useGlobalStore } from "@/store/global.ts";

const logsStore = useLogsStore();
const globalStore = useGlobalStore();

const { autoScroll } = storeToRefs(logsStore);

// 日志级别配置
const levelConfig: Record<
    LogLevel,
    { color: string; icon: string; label: string }
> = {
    INFO: { color: "bg-blue-100 text-blue-700", icon: "ℹ️", label: "信息" },
    WARNING: {
        color: "bg-yellow-100 text-yellow-700",
        icon: "⚠️",
        label: "警告",
    },
    ERROR: { color: "bg-red-100 text-red-700", icon: "❌", label: "错误" },
    DEBUG: { color: "bg-gray-100 text-gray-700", icon: "🐛", label: "调试" },
};

// 可选的日志级别（按严重程度排序：ERROR > WARNING > INFO > DEBUG）
const availableLevels: LogLevel[] = ["ERROR", "WARNING", "INFO", "DEBUG"];

// 选中的过滤级别（默认全选）
const selectedLevels = ref<LogLevel[]>(["ERROR", "WARNING", "INFO", "DEBUG"]);

// 搜索关键词
const searchKeyword = ref("");

// 日志容器 ref
const logsContainer = ref<HTMLElement | null>(null);

// 过滤后的日志
const filteredLogs = computed(() => {
    let result = logsStore.logs;

    // 级别过滤
    if (
        selectedLevels.value.length > 0 &&
        selectedLevels.value.length < availableLevels.length
    ) {
        result = result.filter((log) =>
            selectedLevels.value.includes(log.level),
        );
    }

    // 搜索过滤
    if (searchKeyword.value) {
        const keyword = searchKeyword.value.toLowerCase();
        result = result.filter(
            (log) =>
                log.message.toLowerCase().includes(keyword) ||
                (log.module && log.module.toLowerCase().includes(keyword)),
        );
    }

    return result;
});

// 格式化时间戳（统一显示格式为 HH:mm:ss）
const formatTimestamp = (timestamp: string) => {
    if (!timestamp) return "";

    const date = new Date(timestamp);
    if (isNaN(date.getTime())) return timestamp; // 无效日期返回原始值

    const hours = date.getHours().toString().padStart(2, "0");
    const minutes = date.getMinutes().toString().padStart(2, "0");
    const seconds = date.getSeconds().toString().padStart(2, "0");
    return `${hours}:${minutes}:${seconds}`;
};

// 切换日志级别选择
const toggleLevel = (level: LogLevel) => {
    const index = selectedLevels.value.indexOf(level);
    if (index > -1) {
        selectedLevels.value = selectedLevels.value.filter((l) => l !== level);
    } else {
        selectedLevels.value.push(level);
    }
};

// 全选/取消全选
const toggleSelectAll = () => {
    if (selectedLevels.value.length === availableLevels.length) {
        selectedLevels.value = [];
    } else {
        selectedLevels.value = [...availableLevels];
    }
};

// 清空日志
const clearLogs = () => {
    logsStore.clearLogs();
};

// 滚动到底部
const scrollToBottom = () => {
    if (logsContainer.value) {
        logsContainer.value.scrollTop = logsContainer.value.scrollHeight;
    }
};

// 监听日志变化，自动滚动
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

onBeforeUnmount(() => {
    // 清理 WebSocket 连接（可选）
});
</script>

<template>
    <div class="flex h-full w-full flex-col space-y-3 sm:space-y-4">
        <!-- 头部标题 -->
        <div
            class="flex flex-col items-start justify-between gap-3 rounded-2xl bg-white p-4 shadow-sm outline-1 outline-slate-200 sm:flex-row sm:items-center sm:gap-0"
            v-if="!globalStore.isDesktopMode"
        >
            <div class="flex items-center space-x-3">
                <FileText class="h-6 w-6 flex-shrink-0 text-blue-500" />
                <h2 class="text-lg font-semibold text-gray-800">实时日志</h2>
                <span class="text-sm text-gray-500"
                    >({{ filteredLogs.length }} 条)</span
                >
            </div>
            <div class="flex w-full items-center space-x-2 sm:w-auto">
                <button
                    @click="autoScroll = !autoScroll"
                    :class="
                        autoScroll
                            ? 'bg-blue-100 text-blue-700'
                            : 'bg-gray-100 text-gray-600'
                    "
                    class="btn-touch flex-shrink-0 rounded-2xl px-3 py-1.5 text-sm font-medium transition-colors"
                >
                    自动滚动 {{ autoScroll ? "开" : "关" }}
                </button>
                <button
                    @click="clearLogs"
                    class="btn-touch flex-shrink-0 rounded-2xl bg-red-50 px-3 py-1.5 text-sm font-medium text-red-600 transition-colors hover:bg-red-100"
                >
                    清空日志
                </button>
            </div>
        </div>

        <!-- 过滤工具栏 -->
        <div
            class="flex flex-col items-stretch space-y-3 rounded-3xl bg-white p-4 shadow-sm outline-1 outline-slate-200 sm:flex-row sm:items-center sm:space-y-0 sm:space-x-4"
        >
            <!-- 搜索框 -->
            <div class="relative flex-1">
                <Search
                    class="absolute top-1/2 left-3 h-5 w-5 -translate-y-1/2 transform text-gray-400"
                />
                <input
                    v-model="searchKeyword"
                    type="text"
                    placeholder="搜索日志内容或模块..."
                    class="w-full rounded-2xl border border-gray-200 py-2 pr-10 pl-10 text-sm focus:border-transparent focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
                <button
                    v-if="searchKeyword"
                    @click="searchKeyword = ''"
                    class="btn-touch absolute top-1/2 right-3 -translate-y-1/2 transform text-gray-400 hover:text-gray-600"
                >
                    <X class="h-4 w-4" />
                </button>
            </div>

            <!-- 级别过滤 -->
            <div class="flex flex-wrap items-center gap-2">
                <span class="flex-shrink-0 text-sm text-gray-600">级别:</span>
                <div class="flex flex-wrap items-center gap-1">
                    <button
                        @click="toggleSelectAll"
                        class="btn-touch cursor-pointer rounded-2xl px-2 py-1 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-100"
                    >
                        {{
                            selectedLevels.length === availableLevels.length
                                ? "全不选"
                                : "全选"
                        }}
                    </button>
                    <template v-for="level in availableLevels" :key="level">
                        <button
                            @click="toggleLevel(level)"
                            :class="
                                selectedLevels.includes(level)
                                    ? levelConfig[level].color
                                    : 'bg-gray-100 text-gray-400'
                            "
                            class="btn-touch flex flex-shrink-0 cursor-pointer items-center space-x-1 rounded-2xl px-4 py-1.5 text-xs font-medium transition-colors"
                        >
                            <span class="hidden sm:inline">{{ level }}</span>
                        </button>
                    </template>
                </div>
            </div>
        </div>

        <!-- 日志列表 -->
        <div
            ref="logsContainer"
            class="min-h-0 flex-1 rounded-4xl bg-white p-4 pr-0.5 shadow-sm outline-1 outline-slate-200"
        >
            <div class="h-full overflow-y-auto">
                <div
                    v-if="filteredLogs.length === 0"
                    class="flex h-full flex-col items-center justify-center text-gray-400"
                >
                    <FileText class="mb-4 h-16 w-16 opacity-50" />
                    <p class="text-lg">暂无日志</p>
                    <p class="mt-2 text-sm">等待系统日志输入...</p>
                </div>

                <div v-else class="divide-y divide-gray-100">
                    <div
                        v-for="(log, index) in filteredLogs"
                        :key="log.seq || index"
                        class="p-3 py-1 transition-colors hover:bg-gray-50"
                    >
                        <!-- 移动端：垂直布局，紧凑排列 -->
                        <div class="space-y-1 sm:hidden">
                            <!-- 第一行：级别 + 模块名 + 时间 -->
                            <div class="flex items-center gap-1.5">
                                <!-- 日志级别 -->
                                <div
                                    :class="levelConfig[log.level].color"
                                    class="flex-shrink-0 rounded-2xl px-1.5 py-0.5 text-[10px] font-bold"
                                >
                                    {{ log.level }}
                                </div>
                                <!-- 模块名（如果有） -->
                                <div
                                    v-if="log.module"
                                    class="max-w-24 flex-shrink-0 truncate rounded-2xl bg-purple-100 px-1.5 py-0.5 text-[10px] font-medium text-purple-700"
                                >
                                    {{ log.module }}
                                </div>
                                <!-- 时间戳 -->
                                <div
                                    class="ml-auto flex-shrink-0 font-mono text-[10px] text-gray-400"
                                >
                                    {{ formatTimestamp(log.timestamp) }}
                                </div>
                            </div>
                            <!-- 第二行：日志消息 -->
                            <div
                                class="font-mono text-xs leading-relaxed break-all text-gray-700"
                            >
                                {{ log.message }}
                            </div>
                        </div>

                        <!-- 桌面端：水平布局 -->
                        <div
                            class="hidden sm:flex sm:items-center sm:space-x-3"
                        >
                            <!-- 时间戳 -->
                            <div
                                class="w-20 flex-shrink-0 font-mono text-xs whitespace-nowrap text-gray-500"
                            >
                                {{ formatTimestamp(log.timestamp) }}
                            </div>

                            <!-- 日志级别 -->
                            <div
                                :class="levelConfig[log.level].color"
                                class="flex w-16 flex-shrink-0 items-center justify-center space-x-1 rounded-2xl px-2 py-0.5 text-xs font-bold"
                            >
                                <span>{{ log.level }}</span>
                            </div>

                            <!-- 模块名（如果有） -->
                            <div
                                v-if="log.module"
                                class="flex max-w-32 flex-shrink-0 items-center justify-center truncate rounded-2xl bg-purple-100 px-3 py-0.5 text-xs font-medium text-purple-700"
                            >
                                {{ log.module }}
                            </div>

                            <!-- 日志消息 -->
                            <div
                                class="min-w-0 flex-1 font-mono text-sm break-all text-gray-700"
                            >
                                {{ log.message }}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<style scoped>
/* 自定义滚动条样式 */
.logs-container::-webkit-scrollbar {
    width: 8px;
}

.logs-container::-webkit-scrollbar-track {
    background: #f1f5f9;
    border-radius: 4px;
}

.logs-container::-webkit-scrollbar-thumb {
    background: #cbd5e1;
    border-radius: 4px;
}

.logs-container::-webkit-scrollbar-thumb:hover {
    background: #94a3b8;
}
</style>
