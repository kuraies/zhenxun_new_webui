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
        class="flex rounded-4xl border border-slate-200 bg-white px-6 py-4 shadow-sm transition-shadow hover:shadow-md"
    >
        <div class="flex flex-1 flex-col justify-between truncate">
            <div class="text-md mb-4 truncate text-slate-600">
                {{ title }}
            </div>

            <div
                class="flex items-baseline gap-2 text-4xl font-bold text-gray-800"
            >
                <span v-odometer="value"></span>{{ showPercent ? "%" : "" }}

                <!--                <component-->
                <!--                    v-if="trendIcon"-->
                <!--                    :is="trendIcon"-->
                <!--                    :class="[trendColorClass, 'h-4 w-4 flex-shrink-0']"-->
                <!--                />-->
            </div>
        </div>

        <div class="ml-auto flex items-start">
            <div
                :class="[
                    // iconBgClass || 'bg-slate-900',
                    'flex items-center justify-center rounded-full p-2 transition-colors',
                ]"
            >
                <component
                    :is="icon"
                    :class="[iconColorClass || 'text-white', 'h-10 w-10']"
                />
            </div>
        </div>
    </div>
</template>
