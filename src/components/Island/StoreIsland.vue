<script lang="ts" setup>
import { Package } from "lucide-vue-next";
import { useStoreStore } from "@/store/store.ts";
import { storeToRefs } from "pinia";
import { computed } from "vue";
import { StorePlugin } from "@/types";

const storeStore = useStoreStore();

const { loading, storeData } = storeToRefs(storeStore);
const { loadStoreData } = storeStore;

// 统计信息
const stats = computed(() => {
    if (!storeData.value) return { total: 0, installed: 0, available: 0 };
    const total = storeData.value.plugin_list.length;
    const installed = storeData.value.plugin_list.filter(
        (p: StorePlugin) => p.is_installed,
    ).length;
    return { total, installed, available: total - installed };
});
</script>

<template>
    <div class="flex w-full items-center justify-between">
        <div class="flex space-x-4 whitespace-nowrap">
            <div
                class="group flex w-fit items-center space-x-3 rounded-full border border-white/10 bg-white px-4 py-2 shadow-sm transition-all hover:scale-105"
            >
                <Package class="h-5 w-5 text-blue-500" />
                <span class="text-sm font-medium text-slate-700">插件管理</span>
            </div>

            <div
                class="group flex w-fit items-center space-x-2 rounded-full border border-white/10 bg-white px-4 shadow-sm transition-all hover:scale-105"
            >
                <span
                    v-odometer="stats.total"
                    class="text-sm font-black text-blue-500"
                ></span>
                <div class="h-3 w-[1px] bg-black/30"></div>
                <span class="text-xs text-slate-600">总插件数</span>
            </div>
            <div
                class="group flex w-fit items-center space-x-2 rounded-full border border-white/10 bg-white px-4 shadow-sm transition-all hover:scale-105"
            >
                <span
                    v-odometer="stats.installed"
                    class="text-sm font-black text-green-500"
                ></span>
                <div class="h-3 w-[1px] bg-black/30"></div>
                <span class="text-xs text-slate-600">已安装</span>
            </div>
            <div
                class="group flex w-fit items-center space-x-2 rounded-full border border-white/10 bg-white px-4 shadow-sm transition-all hover:scale-105"
            >
                <span
                    v-odometer="stats.available"
                    class="text-sm font-black text-orange-500"
                ></span>
                <div class="h-3 w-[1px] bg-black/30"></div>
                <span class="text-xs text-slate-600">可安装</span>
            </div>
        </div>

        <button
            @click="loadStoreData"
            :disabled="loading"
            class="btn-touch rounded-full bg-white p-2 shadow-sm transition-colors hover:bg-gray-200 disabled:opacity-50"
            title="刷新列表"
        >
            <svg
                class="h-5 w-5"
                :class="{ 'animate-spin': loading }"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
            >
                <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
            </svg>
        </button>
    </div>
</template>

<style scoped></style>
