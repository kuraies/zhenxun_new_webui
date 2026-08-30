<script setup lang="ts">
import { computed } from "vue";
import { Cpu, HardDrive, MemoryStick } from "lucide-vue-next";
import SystemStatusCard from "@/views/dashboard/SystemStatusCard.vue";
import type { DashboardSystemInfo } from "@/views/dashboard/types";

const props = withDefaults(
    defineProps<{
        cpu: number;
        memory: number;
        disk: number;
        systemInfo: DashboardSystemInfo;
        /** 首屏数据加载中：透传给资源卡的数值骨架 */
        loading?: boolean;
    }>(),
    {
        loading: false,
    },
);

// systemInfo 里的总量单位已经是 GB（后端换算好的），
// 这里按百分比直接算已用量，不要再当字节除一次 1024³
const usageSubtitle = (percent: number, totalGb: number) =>
    totalGb > 0
        ? `${((totalGb * percent) / 100).toFixed(1)} GB / ${totalGb.toFixed(1)} GB`
        : undefined;

const resourceCards = computed(() => [
    {
        key: "cpu",
        title: "CPU",
        value: props.cpu,
        icon: Cpu,
        iconColor: "text-zx-primary",
        subtitle:
            props.systemInfo.cpuFreq > 0 && props.systemInfo.cpuCores > 0
                ? `${(props.systemInfo.cpuFreq / 1000).toFixed(1)} GHz / ${props.systemInfo.cpuCores} 核心`
                : undefined,
        class: "h-30",
    },
    {
        key: "memory",
        title: "内存",
        value: props.memory,
        icon: MemoryStick,
        iconColor: "text-zx-primary",
        subtitle: usageSubtitle(props.memory, props.systemInfo.memoryTotal),
        class: "h-30",
    },
    {
        key: "disk",
        title: "磁盘",
        value: props.disk,
        icon: HardDrive,
        iconColor: "text-zx-primary",
        subtitle: usageSubtitle(props.disk, props.systemInfo.diskTotal),
        class: "h-30 sm:col-span-2 lg:col-span-1",
    },
]);
</script>

<template>
    <div
        class="grid h-full grid-cols-1 sm:grid-cols-2 sm:gap-4 lg:col-span-2 lg:grid-cols-3 2xl:row-start-2"
    >
        <SystemStatusCard
            v-for="card in resourceCards"
            :key="card.key"
            :icon="card.icon"
            :value="card.value"
            :icon-color="card.iconColor"
            :title="card.title"
            :subtitle="card.subtitle"
            :loading="props.loading"
            :class="card.class"
        />
    </div>
</template>
