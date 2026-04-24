<script lang="ts" setup>
import { Blocks } from "lucide-vue-next";
import { usePluginStore } from "@/store/plugin.ts";
import { storeToRefs } from "pinia";
import { computed } from "vue";

const pluginStore = usePluginStore();

const { loading, plugins } = storeToRefs(pluginStore);
const { loadPlugins } = pluginStore;

const stats = computed(() => {
    const total = plugins.value.length;
    const active = plugins.value.filter((p) => p.is_enabled).length;
    const builtin = plugins.value.filter((p) => p.is_builtin).length;
    return {
        total,
        active,
        inactive: total - active,
        builtin,
        third: total - builtin,
    };
});
</script>

<template>
    <div class="flex w-full items-center justify-between">
        <div class="flex space-x-4">
            <div
                class="group flex w-fit items-center space-x-3 rounded-full border border-white/10 bg-white px-4 py-2 shadow-sm transition-all hover:scale-105"
            >
                <Blocks class="h-5 w-5 text-blue-500" />
                <span
                    class="text-sm font-medium whitespace-nowrap text-slate-700"
                    >插件管理</span
                >
            </div>

            <div
                class="group flex w-fit items-center space-x-2 rounded-full border border-white/10 bg-white px-4 shadow-sm transition-all hover:scale-105"
            >
                <span
                    v-odometer="stats.total"
                    class="text-sm font-black text-blue-500"
                ></span>
                <div class="h-3 w-[1px] bg-black/30"></div>
                <span class="text-xs whitespace-nowrap text-slate-600"
                    >总插件数</span
                >
            </div>
            <div
                class="group flex w-fit items-center space-x-2 rounded-full border border-white/10 bg-white px-4 shadow-sm transition-all hover:scale-105"
            >
                <span
                    v-odometer="stats.active"
                    class="text-sm font-black text-green-500"
                ></span>
                <div class="h-3 w-[1px] bg-black/30"></div>
                <span class="text-xs whitespace-nowrap text-slate-600"
                    >已启用</span
                >
            </div>
            <div
                class="group flex w-fit items-center space-x-2 rounded-full border border-white/10 bg-white px-4 shadow-sm transition-all hover:scale-105"
            >
                <span
                    v-odometer="stats.inactive"
                    class="text-sm font-black text-slate-500"
                ></span>
                <div class="h-3 w-[1px] bg-black/30"></div>
                <span class="text-xs whitespace-nowrap text-slate-600"
                    >已禁用</span
                >
            </div>
            <div
                class="group flex w-fit items-center space-x-2 rounded-full border border-white/10 bg-white px-4 shadow-sm transition-all hover:scale-105"
            >
                <span
                    v-odometer="stats.builtin"
                    class="text-sm font-black text-purple-500"
                ></span>
                <div class="h-3 w-[1px] bg-black/30"></div>
                <span class="text-xs whitespace-nowrap text-slate-600"
                    >内置插件</span
                >
            </div>
        </div>

        <button
            :disabled="loading"
            class="btn-touch cursor-pointer rounded-full bg-white p-2 shadow-sm transition-colors hover:bg-gray-200 disabled:opacity-50"
            title="刷新列表"
            @click="loadPlugins"
        >
            <svg
                :class="{ 'animate-spin': loading }"
                class="h-5 w-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
            >
                <path
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                />
            </svg>
        </button>
    </div>
</template>

<style scoped></style>
