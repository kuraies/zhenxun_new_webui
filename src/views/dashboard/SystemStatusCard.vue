<script setup lang="ts">
import type { Component } from "vue";
import { computed } from "vue";

const props = withDefaults(
    defineProps<{
        title: string;
        icon: Component;
        value: number;
        iconColor?: string;
        threshold?: number;
        /** 进度条下方的小字说明，如频率/核心数、已用/总量 */
        subtitle?: string;
        /** 首屏数据加载中：数值与进度区显示骨架 */
        loading?: boolean;
    }>(),
    {
        iconColor: "text-zx-primary",
        threshold: 70, // 默认超过 70% 数字标红
    },
);

// 判断是否超过阈值
const isAlert = computed(() => props.value > props.threshold);

// 按百分比做 RGB 分段线性插值，在绿->红的锚点色之间精确计算当前纯色
const GREEN_TO_RED: [number, number, number][] = [
    [0x00, 0xd2, 0x6a], // 鲜绿
    [0xa8, 0xe0, 0x10], // 鲜黄绿
    [0xff, 0xd6, 0x00], // 鲜黄
    [0xff, 0x8a, 0x00], // 鲜橙
    [0xff, 0x2e, 0x2e], // 鲜红
];

const barColor = computed(() => {
    const v = Math.min(100, Math.max(0, props.value));
    const t = (v / 100) * (GREEN_TO_RED.length - 1);
    const i = Math.min(GREEN_TO_RED.length - 2, Math.floor(t));
    const f = t - i;
    const [r1, g1, b1] = GREEN_TO_RED[i];
    const [r2, g2, b2] = GREEN_TO_RED[i + 1];
    const mix = (a: number, b: number) => Math.round(a + (b - a) * f);
    return `rgb(${mix(r1, r2)}, ${mix(g1, g2)}, ${mix(b1, b2)})`;
});
</script>

<template>
    <div
        v-tile-glow
        class="rounded-3xl border border-slate-200 bg-white p-3 shadow-sm sm:p-5"
    >
        <div class="mb-2 flex items-center justify-between sm:mb-3">
            <div class="flex min-w-0 items-center space-x-1.5 sm:space-x-2">
                <component
                    :is="icon"
                    :class="[iconColor, 'h-3.5 w-3.5 shrink-0 sm:h-5 sm:w-5']"
                />
                <span
                    class="truncate text-xs font-semibold text-gray-700 sm:text-base"
                >
                    {{ title }}
                </span>
            </div>
            <span
                v-if="loading"
                class="h-4 w-12 shrink-0 animate-pulse rounded-full bg-slate-100 sm:h-5"
            ></span>
            <span
                v-else
                :class="isAlert ? 'text-red-500' : 'text-slate-800'"
                class="shrink-0 text-sm font-bold sm:text-lg"
            >
                <span v-odometer="value"></span>%
            </span>
        </div>
        <div class="h-2 w-full overflow-hidden rounded-full bg-gray-100 sm:h-3">
            <div
                v-if="loading"
                class="h-full w-1/2 animate-pulse rounded-full bg-slate-200"
            ></div>
            <div
                v-else
                class="h-full rounded-full transition-all duration-500"
                :style="{ width: `${value}%`, backgroundColor: barColor }"
            ></div>
        </div>
        <div v-if="loading" class="mt-2 h-3.5 w-28 animate-pulse rounded-full bg-slate-100"></div>
        <div
            v-else-if="subtitle"
            class="mt-2 truncate text-sm text-slate-400"
        >
            {{ subtitle }}
        </div>
    </div>
</template>
