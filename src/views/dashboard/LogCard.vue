<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, useAttrs } from "vue";
import { useLogsStore } from "@/store/logs";
import LogEntries from "./LogEntries.vue";
import LogPanelHeader from "./LogPanelHeader.vue";
import { useLogFullscreen } from "@/views/dashboard/composables/useLogFullscreen";

const logsStore = useLogsStore();
defineOptions({ inheritAttrs: false });

const attrs = useAttrs();

// 自动滚动：滚动与跟随逻辑都在 LogEntries（虚拟滚动）内部
const autoScroll = ref(true);
const cardRoot = ref<HTMLElement | null>(null);
const {
    isFullscreen,
    isClosing,
    fullscreenFrame,
    openFullscreen,
    closeFullscreen,
} = useLogFullscreen(cardRoot);

// 日志等级筛选:默认全部启用，点击等级按钮开关
const LOG_LEVELS = ["INFO", "WARNING", "ERROR", "DEBUG"] as const;
const activeLevels = ref<string[]>([...LOG_LEVELS]);

const toggleLevel = (level: string) => {
    activeLevels.value = activeLevels.value.includes(level)
        ? activeLevels.value.filter(l => l !== level)
        : [...activeLevels.value, level];
};

const enableAllLevels = () => {
    activeLevels.value = [...LOG_LEVELS];
};

const filteredLogs = computed(() =>
    logsStore.logs.filter(log => activeLevels.value.includes(log.level)),
);

const toggleFullscreen = async () => {
    if (isFullscreen.value) {
        closeFullscreen();
        return;
    }

    await openFullscreen();
};

const handleKeydown = (event: KeyboardEvent) => {
    if (event.key === "Escape" && isFullscreen.value) {
        closeFullscreen();
    }
};

onMounted(() => {
    logsStore.initWebSocket();
    window.addEventListener("keydown", handleKeydown);
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
            'flex h-full min-h-0 flex-col rounded-3xl border border-slate-200 bg-white p-3 pr-1 shadow-sm transition-all duration-200 sm:p-5 sm:pr-0.5',
            isFullscreen ? 'pointer-events-none invisible' : '',
        ]"
    >
        <LogPanelHeader
            :expanded="isFullscreen"
            :active-levels="activeLevels"
            @toggle="toggleFullscreen"
            @toggle-level="toggleLevel"
            @toggle-all="enableAllLevels"
        />

        <!-- 日志列表（虚拟滚动） -->
        <LogEntries :logs="filteredLogs" :auto-scroll="autoScroll" />
    </div>

    <Teleport to="body">
        <div
            v-if="isFullscreen"
            :class="[
                'fixed z-[80] flex min-h-0 flex-col rounded-3xl border border-slate-200 bg-white p-3 pr-1 shadow-xl sm:p-5 sm:pr-0.5',
                isClosing ? 'log-card-collapse' : 'log-card-expand',
            ]"
            :style="fullscreenFrame"
        >
            <LogPanelHeader
                expanded
                :active-levels="activeLevels"
                @toggle="closeFullscreen"
                @toggle-level="toggleLevel"
                @toggle-all="enableAllLevels"
            />

            <LogEntries :logs="filteredLogs" :auto-scroll="autoScroll" />
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
