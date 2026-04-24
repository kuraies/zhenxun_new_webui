<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";
import { Blocks, Search, X } from "lucide-vue-next";
import type { PluginInfo } from "@/types/api-next.types";
import PluginCard from "@/components/zxcomponent/PluginCard/PluginCard.vue";
import PluginConfigModal from "@/components/zxcomponent/PluginConfigModal/PluginConfigModal.vue";
import { ZXNotification } from "@/components";
import { usePluginStore } from "@/store/plugin.ts";
import { storeToRefs } from "pinia";
import { useGlobalStore } from "@/store/global.ts";

const pluginStore = usePluginStore();
const globalStore = useGlobalStore();

const { loadPlugins } = pluginStore;
const { plugins, loading, searchKeyword, statusFilter, typeFilter } =
    storeToRefs(pluginStore);

// 防抖定时器
let searchTimeout: ReturnType<typeof setTimeout> | null = null;

// 监听搜索和过滤条件变化，防抖加载
watch([searchKeyword, statusFilter, typeFilter], () => {
    if (searchTimeout) clearTimeout(searchTimeout);
    searchTimeout = setTimeout(loadPlugins, 300);
});

// 过滤后的插件列表（API 已处理过滤，直接返回）
const filteredPlugins = computed(() => plugins.value);

// 统计信息
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

// 处理插件状态变化
const handleStatusChange = (module: string, newStatus: boolean) => {
    const plugin = plugins.value.find((p) => p.module === module);
    if (plugin) {
        plugin.is_enabled = newStatus;
    }
};

// 配置弹窗
const configModalVisible = ref(false);
const currentPluginModule = ref("");
const currentPluginName = ref("");

// 打开配置弹窗
const handleOpenConfig = (plugin: PluginInfo) => {
    if (!plugin.allow_setting) {
        ZXNotification({
            title: "提示",
            message: `插件 "${plugin.name}" 没有配置项 (｡•́︿•̀｡)`,
            type: "info",
            position: "top-right",
        });
        return;
    }
    currentPluginModule.value = plugin.module;
    currentPluginName.value = plugin.name;
    configModalVisible.value = true;
};

// 配置更新后
const handleConfigUpdated = () => {
    // 重新加载插件列表
    loadPlugins();
};

onMounted(() => {
    loadPlugins();
});
</script>

<template>
    <div class="flex h-full w-full flex-col space-y-3 sm:space-y-4">
        <!-- 头部标题和统计 -->
        <div
            class="flex flex-col items-start justify-between gap-3 rounded-4xl border-1 border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:gap-0"
            v-if="!globalStore.isDesktopMode"
        >
            <div class="flex items-center space-x-3">
                <Blocks class="h-6 w-6 flex-shrink-0 text-blue-500" />
                <h2 class="text-lg font-semibold text-gray-800">插件管理</h2>
                <span class="text-sm text-gray-500"
                    >(共 {{ filteredPlugins.length }} 个)</span
                >
            </div>

            <!-- 刷新按钮 -->
            <button
                @click="loadPlugins"
                :disabled="loading"
                class="btn-touch rounded-full bg-gray-100 p-2 transition-colors hover:bg-gray-200 disabled:opacity-50"
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

        <!-- 统计卡片 - 简洁布局 -->
        <div
            class="grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3"
            v-if="!globalStore.isDesktopMode"
        >
            <div
                class="rounded-3xl border-1 border-slate-200 bg-white p-3 text-center shadow-sm"
            >
                <div class="text-lg font-bold text-gray-800 sm:text-xl">
                    {{ stats.total }}
                </div>
                <div class="mt-0.5 text-xs text-gray-500">总插件数</div>
            </div>
            <div
                class="rounded-3xl border-1 border-slate-200 bg-white p-3 text-center shadow-sm"
            >
                <div class="text-lg font-bold text-green-600 sm:text-xl">
                    {{ stats.active }}
                </div>
                <div class="mt-0.5 text-xs text-gray-500">已启用</div>
            </div>
            <div
                class="rounded-3xl border-1 border-slate-200 bg-white p-3 text-center shadow-sm"
            >
                <div class="text-lg font-bold text-gray-600 sm:text-xl">
                    {{ stats.inactive }}
                </div>
                <div class="mt-0.5 text-xs text-gray-500">已禁用</div>
            </div>
            <div
                class="rounded-3xl border-1 border-slate-200 bg-white p-3 text-center shadow-sm"
            >
                <div class="text-lg font-bold text-purple-600 sm:text-xl">
                    {{ stats.builtin }}
                </div>
                <div class="mt-0.5 text-xs text-gray-500">内置插件</div>
            </div>
        </div>

        <!-- 搜索和过滤 - 响应式布局 -->
        <div
            class="flex flex-col items-stretch space-y-3 rounded-3xl border-1 border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:space-y-0 sm:space-x-4"
        >
            <!-- 搜索框 -->
            <div class="relative flex-1">
                <Search
                    class="absolute top-1/2 left-3 h-5 w-5 -translate-y-1/2 transform text-gray-400"
                />
                <input
                    v-model="searchKeyword"
                    type="text"
                    placeholder="搜索插件名称..."
                    class="w-full rounded-4xl border border-gray-200 py-2 pr-10 pl-10 text-sm focus:outline-none"
                />
                <button
                    v-if="searchKeyword"
                    @click="searchKeyword = ''"
                    class="btn-touch absolute top-1/2 right-3 -translate-y-1/2 transform text-gray-400 hover:text-gray-600"
                >
                    <X class="h-4 w-4" />
                </button>
            </div>

            <!-- 状态过滤 -->
            <div class="flex flex-shrink-0 flex-wrap items-center gap-1">
                <span class="flex-shrink-0 text-sm text-gray-600">状态:</span>
                <button
                    @click="statusFilter = 'all'"
                    :class="
                        statusFilter === 'all'
                            ? 'bg-blue-100 text-blue-700'
                            : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                    "
                    class="btn-touch cursor-pointer rounded-4xl px-3 py-1.5 text-xs font-medium transition-colors"
                >
                    全部
                </button>
                <button
                    @click="statusFilter = 'active'"
                    :class="
                        statusFilter === 'active'
                            ? 'bg-green-100 text-green-700'
                            : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                    "
                    class="btn-touch cursor-pointer rounded-4xl px-3 py-1.5 text-xs font-medium transition-colors"
                >
                    启用
                </button>
                <button
                    @click="statusFilter = 'inactive'"
                    :class="
                        statusFilter === 'inactive'
                            ? 'bg-gray-300 text-gray-700'
                            : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                    "
                    class="btn-touch cursor-pointer rounded-4xl px-3 py-1.5 text-xs font-medium transition-colors"
                >
                    禁用
                </button>
            </div>

            <!-- 类型过滤 -->
            <div class="flex flex-shrink-0 flex-wrap items-center gap-1">
                <span class="flex-shrink-0 text-sm text-gray-600">类型:</span>
                <button
                    @click="typeFilter = 'all'"
                    :class="
                        typeFilter === 'all'
                            ? 'bg-blue-100 text-blue-700'
                            : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                    "
                    class="btn-touch cursor-pointer rounded-4xl px-3 py-1.5 text-xs font-medium transition-colors"
                >
                    全部
                </button>
                <button
                    @click="typeFilter = 'builtin'"
                    :class="
                        typeFilter === 'builtin'
                            ? 'bg-purple-100 text-purple-700'
                            : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                    "
                    class="btn-touch cursor-pointer rounded-4xl px-3 py-1.5 text-xs font-medium transition-colors"
                >
                    内置
                </button>
                <button
                    @click="typeFilter = 'third'"
                    :class="
                        typeFilter === 'third'
                            ? 'bg-orange-100 text-orange-700'
                            : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                    "
                    class="btn-touch cursor-pointer rounded-4xl px-3 py-1.5 text-xs font-medium transition-colors"
                >
                    三方
                </button>
            </div>
        </div>

        <!-- 插件网格 -->
        <div class="flex-1 overflow-y-auto px-1">
            <div v-if="loading" class="flex h-full items-center justify-center">
                <div class="text-center text-gray-400">
                    <Blocks class="mx-auto mb-4 h-12 w-12 animate-pulse" />
                    <p>加载中...</p>
                </div>
            </div>

            <div
                v-else-if="filteredPlugins.length === 0"
                class="flex h-full items-center justify-center"
            >
                <div class="text-center text-gray-400">
                    <Blocks class="mx-auto mb-4 h-16 w-16 opacity-50" />
                    <p class="text-lg">没有找到插件</p>
                    <p class="mt-2 text-sm">尝试调整搜索或过滤条件</p>
                </div>
            </div>

            <!-- 网格视图 -->
            <div
                v-else
                class="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5"
            >
                <PluginCard
                    v-for="plugin in filteredPlugins"
                    :key="plugin.module"
                    :plugin="plugin"
                    @status-change="handleStatusChange"
                    @open-config="handleOpenConfig"
                />
            </div>
        </div>

        <!-- 配置弹窗 -->
        <PluginConfigModal
            v-model:visible="configModalVisible"
            :module="currentPluginModule"
            :plugin-name="currentPluginName"
            @updated="handleConfigUpdated"
        />
    </div>
</template>

<style scoped></style>
