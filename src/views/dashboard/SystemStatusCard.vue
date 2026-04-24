<script setup lang="ts">
import type { Component } from "vue";
import { computed } from "vue";

const props = withDefaults(
    defineProps<{
        title: string;
        icon: Component;
        value: number;
        iconColor?: string;
        normalBarClass?: string;
        threshold?: number;
    }>(),
    {
        iconColor: "text-blue-500",
        normalBarClass: "from-green-400 to-green-500",
        threshold: 70, // 默认超过 70% 标红
    },
);

// 判断是否超过阈值
const isAlert = computed(() => props.value > props.threshold);
</script>

<template>
    <div
        class="rounded-4xl border border-slate-200 bg-white p-3 shadow-sm sm:p-5"
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
                :class="isAlert ? 'text-red-500' : 'text-green-500'"
                class="shrink-0 text-sm font-bold sm:text-lg"
            >
                <span v-odometer="value"></span>%
            </span>
        </div>
        <div class="h-2 w-full overflow-hidden rounded-full bg-gray-100 sm:h-3">
            <div
                :class="[
                    'h-full rounded-full bg-linear-to-r transition-all duration-500',
                    isAlert ? 'from-red-400 to-red-500' : normalBarClass,
                ]"
                :style="{ width: `${value}%` }"
            ></div>
        </div>
    </div>
</template>
