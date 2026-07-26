<script setup lang="ts">
import { computed } from "vue";
import { Cpu, HardDrive, MemoryStick } from "lucide-vue-next";
import SystemStatusCard from "@/views/dashboard/SystemStatusCard.vue";

const props = defineProps<{
    cpu: number;
    memory: number;
    disk: number;
}>();

const resourceCards = computed(() => [
    {
        key: "cpu",
        title: "CPU",
        value: props.cpu,
        icon: Cpu,
        iconColor: "text-zx-primary",
        normalBarClass: "bg-zx-primary",
        class: "h-22",
    },
    {
        key: "memory",
        title: "内存",
        value: props.memory,
        icon: MemoryStick,
        iconColor: "text-zx-primary",
        normalBarClass: "bg-zx-primary",
        class: "h-22",
    },
    {
        key: "disk",
        title: "磁盘",
        value: props.disk,
        icon: HardDrive,
        iconColor: "text-zx-primary",
        normalBarClass: "bg-zx-primary",
        class: "h-22 sm:col-span-2 lg:col-span-1",
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
            :normal-bar-class="card.normalBarClass"
            :title="card.title"
            :class="card.class"
        />
    </div>
</template>
