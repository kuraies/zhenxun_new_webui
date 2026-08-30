<script setup lang="ts">
import { Minus, TrendingDown, TrendingUp } from "lucide-vue-next";
import StatisticsCard from "@/views/dashboard/StatisticsCard.vue";
import type { DashboardStatCard, Trend } from "@/views/dashboard/types";

defineProps<{
    cards: DashboardStatCard[];
    /** 首屏数据加载中：透传给统计卡的数值骨架 */
    loading?: boolean;
}>();

const getTrendIcon = (trend: Trend | undefined) => {
    switch (trend) {
        case "up":
            return { icon: TrendingUp, color: "text-green-500" };
        case "down":
            return { icon: TrendingDown, color: "text-red-500" };
        default:
            return { icon: Minus, color: "text-gray-400" };
    }
};
</script>

<template>
    <div class="grid h-full grid-cols-2 grid-rows-2 gap-4">
        <StatisticsCard
            v-for="item in cards"
            :key="item.id"
            :title="item.title"
            :value="item.value"
            :icon="item.icon"
            :icon-bg-class="item.bgClass"
            :icon-color-class="item.colorClass"
            :icon-filled="item.filled"
            :icon-stroke-width="item.strokeWidth"
            :change="item.change"
            :trend-icon="item.trend ? getTrendIcon(item.trend).icon : undefined"
            :trend-color-class="
                item.trend ? getTrendIcon(item.trend).color : undefined
            "
            :loading="loading"
        />
    </div>
</template>
