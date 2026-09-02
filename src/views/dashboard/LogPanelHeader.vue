<script setup lang="ts">
import { FileText, Maximize2, Minimize2 } from "lucide-vue-next";

// 日志等级筛选按钮:无底色，启用时文字与小圆点亮等级色，与日志条目的等级色呼应
const LEVEL_CHIPS = [
    {
        key: "INFO",
        textClass: "text-sky-600",
        dotClass: "bg-sky-500",
    },
    {
        key: "WARNING",
        textClass: "text-amber-600",
        dotClass: "bg-amber-500",
    },
    {
        key: "ERROR",
        textClass: "text-red-600",
        dotClass: "bg-red-500",
    },
    {
        key: "DEBUG",
        textClass: "text-slate-500",
        dotClass: "bg-slate-400",
    },
] as const;

defineProps<{
    expanded?: boolean;
    /** 当前启用的日志等级 */
    activeLevels: string[];
}>();

const emit = defineEmits<{
    toggle: [];
    toggleLevel: [level: string];
    toggleAll: [];
}>();
</script>

<template>
    <div
        class="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pr-4 pb-3 sm:pb-5"
    >
        <div class="flex min-w-0 items-center space-x-2">
            <FileText class="h-5 w-5 shrink-0 text-zx-primary" />
            <span class="shrink-0 text-sm font-semibold text-gray-700">日志</span>
        </div>

        <div class="flex min-w-0 flex-wrap items-center gap-2">
            <!-- 等级筛选 -->
            <div class="flex items-center gap-1">
                <button
                    :class="
                        activeLevels.length === LEVEL_CHIPS.length
                            ? 'text-slate-700'
                            : 'text-slate-400 hover:text-slate-600'
                    "
                    class="btn-touch flex h-6 cursor-pointer items-center gap-1 rounded-full px-2 text-[10px] font-semibold transition-colors sm:text-[11px]"
                    type="button"
                    @click="emit('toggleAll')"
                >
                    <span
                        class="size-1.5 rounded-full transition-colors"
                        :class="
                            activeLevels.length === LEVEL_CHIPS.length
                                ? 'bg-slate-400'
                                : 'bg-slate-300'
                        "
                    ></span>
                    全部
                </button>
                <button
                    v-for="chip in LEVEL_CHIPS"
                    :key="chip.key"
                    :class="
                        activeLevels.includes(chip.key)
                            ? chip.textClass
                            : 'text-slate-400 hover:text-slate-600'
                    "
                    class="btn-touch flex h-6 cursor-pointer items-center gap-1 rounded-full px-2 text-[10px] font-semibold transition-colors sm:text-[11px]"
                    type="button"
                    @click="emit('toggleLevel', chip.key)"
                >
                    <span
                        class="size-1.5 rounded-full transition-colors"
                        :class="
                            activeLevels.includes(chip.key)
                                ? chip.dotClass
                                : 'bg-slate-300'
                        "
                    ></span>
                    {{ chip.key }}
                </button>
            </div>

            <button
                :aria-label="expanded ? '退出全屏' : '全屏查看日志'"
                :title="expanded ? '退出全屏' : '全屏查看日志'"
                class="btn-touch flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-full text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
                type="button"
                @click="emit('toggle')"
            >
                <Minimize2 v-if="expanded" class="h-4 w-4" />
                <Maximize2 v-else class="h-4 w-4" />
            </button>
        </div>
    </div>
</template>
