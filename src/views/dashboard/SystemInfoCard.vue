<script setup lang="ts">
import { computed } from "vue";
import {
    Cpu,
    Gauge,
    GitBranch,
    Hash,
    Info,
    MemoryStick,
    Server,
} from "lucide-vue-next";
import type {
    DashboardNetworkStatus,
    DashboardSystemInfo,
} from "@/views/dashboard/types";

const props = defineProps<{
    systemInfo: DashboardSystemInfo;
    networkStatus: DashboardNetworkStatus;
}>();

const statusText = (status: boolean | "checking") => {
    if (status === "checking") return "检测中";
    return status ? "可达" : "不可达";
};

const statusDotClass = (status: boolean | "checking") => {
    if (status === "checking") return "animate-pulse bg-yellow-500";
    return status ? "animate-pulse bg-green-500" : "bg-red-500";
};

const statusTextClass = (status: boolean | "checking") => {
    if (status === "checking") return "text-yellow-600";
    return status ? "text-green-600" : "text-red-600";
};

const networkItems = computed(() => [
    { key: "baidu", label: "百度", status: props.networkStatus.baidu },
    { key: "google", label: "谷歌", status: props.networkStatus.google },
]);

const infoItems = computed(() => [
    {
        key: "version",
        label: "版本",
        value: props.systemInfo.version,
        icon: GitBranch,
        iconClass: "text-blue-600",
    },
    {
        key: "system",
        label: "系统",
        value: props.systemInfo.system || "-",
        title: props.systemInfo.system,
        icon: Server,
        iconClass: "text-purple-600",
    },
    {
        key: "cpu",
        label: "CPU",
        value: props.systemInfo.cpuBrand || "-",
        title: props.systemInfo.cpuBrand,
        icon: Cpu,
        iconClass: "text-green-600",
    },
    {
        key: "cores",
        label: "核心",
        value: `${props.systemInfo.cpuCores || "-"} 核心`,
        icon: Hash,
        iconClass: "text-orange-600",
    },
    {
        key: "frequency",
        label: "主频",
        value: `${
            props.systemInfo.cpuFreq
                ? (props.systemInfo.cpuFreq / 1000).toFixed(2)
                : "-"
        } GHz`,
        icon: Gauge,
        iconClass: "text-red-600",
    },
    {
        key: "memory",
        label: "内存",
        value: `${
            props.systemInfo.memoryTotal
                ? props.systemInfo.memoryTotal.toFixed(2)
                : "-"
        } GB`,
        icon: MemoryStick,
        iconClass: "text-indigo-600",
    },
]);
</script>

<template>
    <div
        v-tile-glow
        class="rounded-3xl border border-slate-200 bg-white p-3 shadow-sm sm:p-4"
    >
        <div
            class="mb-3 flex flex-wrap items-center justify-between gap-x-3 gap-y-2"
        >
            <div class="flex items-center space-x-2">
                <Info class="h-5 w-5 text-cyan-500" />
                <h3 class="text-sm font-semibold text-gray-700 sm:text-base">
                    系统信息
                </h3>
            </div>
            <div class="flex flex-wrap items-center gap-x-3 gap-y-1">
                <div
                    v-for="item in networkItems"
                    :key="item.key"
                    class="flex items-center space-x-1.5"
                >
                    <div
                        :class="statusDotClass(item.status)"
                        class="h-2 w-2 rounded-full"
                    ></div>
                    <span class="text-xs text-gray-500">{{ item.label }}</span>
                    <span
                        :class="statusTextClass(item.status)"
                        class="text-xs font-medium"
                    >
                        {{ statusText(item.status) }}
                    </span>
                </div>
            </div>
        </div>
        <div class="grid grid-cols-1 gap-2 sm:grid-cols-2 2xl:grid-cols-1">
            <div
                v-for="item in infoItems"
                :key="item.key"
                class="flex min-w-0 items-center space-x-2"
            >
                <div
                    class="flex h-7 w-7 shrink-0 items-center justify-center rounded-2xl"
                >
                    <component
                        :is="item.icon"
                        :class="[item.iconClass, 'h-4 w-4']"
                    />
                </div>
                <div class="flex min-w-0 flex-1 items-center gap-1 text-sm">
                    <span class="shrink-0 text-xs text-gray-500"
                        >{{ item.label }}：</span
                    >
                    <span
                        :title="item.title || String(item.value)"
                        class="truncate font-medium text-gray-800"
                    >
                        {{ item.value }}
                    </span>
                </div>
            </div>
        </div>
    </div>
</template>
