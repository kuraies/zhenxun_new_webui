<script setup lang="ts">
import type { Component } from "vue";

defineProps<{
    title: string;
    value: number | string;
    icon: Component;
    iconBgClass?: string; // 改为可选，默认可使用代码二的 bg-slate-900
    iconColorClass?: string; // 改为可选，默认可使用 text-white
    /** 实心图标:对封闭形状的 lucide 图标填充 currentColor */
    iconFilled?: boolean;
    /** 描边宽度:lucide 默认 2，需要更粗的描边图标时传入 */
    iconStrokeWidth?: number | string;
    trendIcon?: Component;
    trendColorClass?: string;
    /** 相对上一周期的变化百分比，跟在趋势图标后展示 */
    change?: number | null;
    showPercent?: boolean; // 额外增加一个控制是否显示百分比的开关
    /** 首屏数据加载中：数值与趋势区显示骨架 */
    loading?: boolean;
}>();
</script>

<template>
    <div
        v-tile-glow
        class="flex h-full min-w-0 items-center justify-around gap-3 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm transition-[box-shadow,border-color] hover:border-slate-300 hover:shadow-md"
    >
        <div class="flex min-w-0 flex-1 flex-col justify-between gap-3">
            <div class="truncate text-base font-medium text-slate-500">
                {{ title }}
            </div>

            <div
                class="flex min-w-0 items-end gap-2 text-3xl leading-none font-bold text-gray-800"
            >
                <span
                    v-if="loading"
                    class="h-8 w-20 animate-pulse rounded-full bg-slate-100"
                ></span>
                <template v-else>
                    <span class="min-w-0 truncate" v-odometer="value"></span>
                    <span v-if="showPercent" class="text-lg text-slate-500"
                        >%</span
                    >
                    <component
                        v-if="trendIcon"
                        :is="trendIcon"
                        :class="[
                            trendColorClass || 'text-gray-400',
                            'mb-0.5 h-4 w-4 shrink-0',
                        ]"
                    />
                    <span
                        v-if="
                            trendIcon && change !== null && change !== undefined
                        "
                        :class="trendColorClass || 'text-gray-400'"
                        class="mb-0.5 shrink-0 text-xs font-bold"
                    >
                        {{ change > 0 ? "+" : "" }}{{ change.toFixed(1) }}%
                    </span>
                </template>
            </div>
        </div>

        <div class="flex shrink-0 items-start self-start">
            <div
                :class="[
                    iconBgClass || 'bg-transparent',
                    'flex h-14 w-14 items-center justify-center rounded-2xl transition-colors',
                ]"
            >
                <component
                    :is="icon"
                    :fill="iconFilled ? 'currentColor' : 'none'"
                    :stroke-width="iconStrokeWidth"
                    :class="[iconColorClass || 'text-slate-600', 'h-9 w-9']"
                />
            </div>
        </div>
    </div>
</template>
