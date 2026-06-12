<script setup lang="ts">
import {
    computed,
    onBeforeUnmount,
    onMounted,
    ref,
    useAttrs,
    watch,
} from "vue";
import { useLogsStore } from "@/store/logs";
import LogEntries from "./LogEntries.vue";
import LogPanelHeader from "./LogPanelHeader.vue";
import { useLogFullscreen } from "@/views/dashboard/composables/useLogFullscreen";

const logsStore = useLogsStore();
defineOptions({ inheritAttrs: false });

const attrs = useAttrs();

// 自动滚动
const autoScroll = ref(true);
const cardRoot = ref<HTMLElement | null>(null);
const logsContainer = ref<HTMLElement | null>(null);
const fullscreenLogsContainer = ref<HTMLElement | null>(null);
const {
    isFullscreen,
    isClosing,
    fullscreenFrame,
    openFullscreen,
    closeFullscreen,
} = useLogFullscreen(cardRoot);

// 过滤（这里默认不过滤，保留结构方便以后扩展）
const filteredLogs = computed(() => logsStore.logs);

// 自动滚动
const scrollToBottom = () => {
    const container = isFullscreen.value
        ? fullscreenLogsContainer.value
        : logsContainer.value;

    if (container) {
        container.scrollTop = container.scrollHeight;
    }
};

const toggleFullscreen = async () => {
    if (isFullscreen.value) {
        closeFullscreen();
        return;
    }

    await openFullscreen();

    if (autoScroll.value) {
        scrollToBottom();
    }
};

const handleKeydown = (event: KeyboardEvent) => {
    if (event.key === "Escape" && isFullscreen.value) {
        closeFullscreen();
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
    window.addEventListener("keydown", handleKeydown);
    scrollToBottom();
});

onBeforeUnmount(() => {
    window.removeEventListener("keydown", handleKeydown);
});
</script>

<template>
    <div
        v-bind="attrs"
        v-tile-glow
        ref="cardRoot"
        :class="[
            'flex h-full min-h-0 flex-col rounded-3xl border border-slate-200 bg-white p-5 pr-0.5 shadow-sm transition-all duration-200',
            isFullscreen ? 'pointer-events-none invisible' : '',
        ]"
    >
        <LogPanelHeader :expanded="isFullscreen" @toggle="toggleFullscreen" />

        <!-- 日志列表 -->
        <div ref="logsContainer" class="min-h-0 flex-1 overflow-y-auto">
            <LogEntries :logs="filteredLogs" />
        </div>
    </div>

    <Teleport to="body">
        <div
            v-if="isFullscreen"
            :class="[
                'fixed z-[80] flex min-h-0 flex-col rounded-3xl border border-slate-200 bg-white p-5 pr-0.5 shadow-xl',
                isClosing ? 'log-card-collapse' : 'log-card-expand',
            ]"
            :style="fullscreenFrame"
        >
            <LogPanelHeader expanded @toggle="closeFullscreen" />

            <div
                ref="fullscreenLogsContainer"
                class="min-h-0 flex-1 overflow-y-auto"
            >
                <LogEntries :logs="filteredLogs" />
            </div>
        </div>
    </Teleport>
</template>

<style scoped>
.log-card-expand {
    animation: log-card-expand 0.36s cubic-bezier(0.16, 1, 0.3, 1) both;
}

.log-card-collapse {
    animation: log-card-collapse 0.28s cubic-bezier(0.7, 0, 0.84, 0) both;
}

@keyframes log-card-expand {
    from {
        transform: translate(-28px, 28px) scale(0.9);
        transform-origin: left bottom;
    }
    to {
        transform: scale(1);
        transform-origin: left bottom;
    }
}

@keyframes log-card-collapse {
    from {
        transform: scale(1);
        transform-origin: left bottom;
    }
    to {
        transform: translate(-28px, 28px) scale(0.9);
        transform-origin: left bottom;
    }
}
</style>
