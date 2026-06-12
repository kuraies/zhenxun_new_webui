<script setup lang="ts">
import type { Component } from "vue";

defineProps<{
    title: string;
    value: number | string;
    icon: Component;
    iconBgClass?: string; // 改为可选，默认可使用代码二的 bg-slate-900
    iconColorClass?: string; // 改为可选，默认可使用 text-white
    trendIcon?: Component;
    trendColorClass?: string;
    showPercent?: boolean; // 额外增加一个控制是否显示百分比的开关
}>();
</script>

<template>
    <div
        v-tile-glow
        class="flex h-full min-w-0 items-center justify-between gap-3 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm transition-[box-shadow,border-color] hover:border-slate-300 hover:shadow-md"
    >
        <div class="flex min-w-0 flex-1 flex-col justify-between gap-3">
            <div class="truncate text-sm font-medium text-slate-500">
                {{ title }}
            </div>

            <div
                class="flex min-w-0 items-end gap-2 text-3xl leading-none font-bold text-gray-800"
            >
                <span class="min-w-0 truncate" v-odometer="value"></span>
                <span v-if="showPercent" class="text-lg text-slate-500">%</span>
                <component
                    v-if="trendIcon"
                    :is="trendIcon"
                    :class="[
                        trendColorClass || 'text-gray-400',
                        'mb-0.5 h-4 w-4 shrink-0',
                    ]"
                />
            </div>
        </div>

        <div class="flex shrink-0 items-start self-start">
            <div
                :class="[
                    iconBgClass || 'bg-slate-100',
                    'flex h-10 w-10 items-center justify-center rounded-2xl transition-colors',
                ]"
            >
                <component
                    :is="icon"
                    :class="[iconColorClass || 'text-slate-600', 'h-5 w-5']"
                />
            </div>
        </div>
    </div>
</template>
