<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { Package, Search, X } from "lucide-vue-next";
import { storeApi } from "@/utils/api-next";
import type { StorePlugin } from "@/types/store.types";
import StoreCard from "@/components/zxcomponent/StoreCard/StoreCard.vue";
import { ZXMessageBox, ZXNotification } from "@/components";
import { useStoreStore } from "@/store/store.ts";
import { storeToRefs } from "pinia";
import { useGlobalStore } from "@/store/global.ts";

const storeStore = useStoreStore();
const globalStore = useGlobalStore();
const { loading, storeData } = storeToRefs(storeStore);
const { loadStoreData } = storeStore;

// 搜索关键词
const searchKeyword = ref("");

// 状态过滤
const filterType = ref<"all" | "installed" | "not-installed">("all");

// 安装插件
const handleInstall = async (plugin: StorePlugin) => {
    ZXMessageBox({
        title: "安装插件",
        message: `确定要安装 "${plugin.name}" 插件吗？`,
        cancelButtonText: "取消",
        confirmButtonText: "安装",
        onConfirm: async () => {
            try {
                const res = await storeApi.installPlugin(plugin.id);
                if (res?.success) {
                    plugin.is_installed = true;
                    // 同步更新 install_module 列表
                    if (
                        storeData.value &&
                        !storeData.value.install_module.includes(plugin.module)
                    ) {
                        storeData.value.install_module.push(plugin.module);
                    }
                    ZXNotification({
                        title: "安装成功~",
                        message: `"${plugin.name}" 已经安装成功啦！重启Bot生效`,
                        type: "🎉",
                        position: "top-right",
                        confetti: true,
                    });
                }
            } catch (error) {
                ZXNotification({
                    title: "安装失败",
                    message: "插件安装失败了，请再试一次 (´；ω；`)",
                    type: "😭",
                    position: "top-right",
                });
            }
        },
    });
};

// 更新插件
const handleUpdate = async (plugin: StorePlugin) => {
    try {
        const res = await storeApi.updatePlugin(plugin.id);
        if (res?.success) {
            ZXNotification({
                title: "更新成功~",
                message: `"${plugin.name}" 已经更新到最新版本啦！`,
                type: "🥳",
                position: "top-right",
                confetti: true,
            });
        }
    } catch (error) {
        ZXNotification({
            title: "更新失败",
            message: "插件更新失败了 (´；ω；`)",
            type: "😭",
            position: "top-right",
        });
    }
};

// 过滤后的插件列表
const filteredPlugins = computed(() => {
    if (!storeData.value) return [];

    let result = storeData.value.plugin_list;

    // 搜索过滤
    if (searchKeyword.value) {
        const keyword = searchKeyword.value.toLowerCase();
        result = result.filter(
            (plugin: StorePlugin) =>
                plugin.name.toLowerCase().includes(keyword) ||
                plugin.module.toLowerCase().includes(keyword) ||
                plugin.description?.toLowerCase().includes(keyword) ||
                plugin.author?.toLowerCase().includes(keyword),
        );
    }

    // 安装状态过滤
    if (filterType.value === "installed") {
        result = result.filter((plugin: StorePlugin) => plugin.is_installed);
    } else if (filterType.value === "not-installed") {
        result = result.filter((plugin: StorePlugin) => !plugin.is_installed);
    }

    return result;
});

// 统计信息
const stats = computed(() => {
    if (!storeData.value) return { total: 0, installed: 0, available: 0 };
    const total = storeData.value.plugin_list.length;
    const installed = storeData.value.plugin_list.filter(
        (p: StorePlugin) => p.is_installed,
    ).length;
    return { total, installed, available: total - installed };
});

onMounted(() => {
    loadStoreData();
});
</script>

<template>
    <div class="flex h-full w-full flex-col space-y-3 sm:space-y-4">
        <!-- 头部标题和统计 -->
        <div
            class="flex flex-col items-start justify-between gap-3 rounded-2xl bg-white p-4 shadow-sm outline-1 outline-slate-200 sm:flex-row sm:items-center sm:gap-0"
            v-if="globalStore.isMobileMode"
        >
            <div class="flex items-center space-x-3">
                <Package class="h-6 w-6 flex-shrink-0 text-blue-500" />
                <h2 class="text-lg font-semibold text-gray-800">插件市场</h2>
                <span class="text-sm text-gray-500"
                    >(共 {{ filteredPlugins.length }} 个)</span
                >
            </div>

            <!-- 刷新按钮 -->
            <button
                @click="loadStoreData"
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
            class="grid grid-cols-3 gap-2 sm:gap-3"
            v-if="globalStore.isMobileMode"
        >
            <div
                class="rounded-2xl bg-white p-3 text-center shadow-sm outline-1 outline-slate-200"
            >
                <div class="text-lg font-bold text-blue-600 sm:text-xl">
                    {{ stats.total }}
                </div>
                <div class="mt-0.5 text-xs text-gray-500">总插件数</div>
            </div>
            <div
                class="rounded-2xl bg-white p-3 text-center shadow-sm outline-1 outline-slate-200"
            >
                <div class="text-lg font-bold text-green-600 sm:text-xl">
                    {{ stats.installed }}
                </div>
                <div class="mt-0.5 text-xs text-gray-500">已安装</div>
            </div>
            <div
                class="rounded-2xl bg-white p-3 text-center shadow-sm outline-1 outline-slate-200"
            >
                <div class="text-lg font-bold text-pink-600 sm:text-xl">
                    {{ stats.available }}
                </div>
                <div class="mt-0.5 text-xs text-gray-500">可安装</div>
            </div>
        </div>

        <!-- 搜索和过滤 - 响应式布局 -->
        <div
            class="flex flex-col items-stretch space-y-3 rounded-3xl bg-white p-4 shadow-sm outline-1 outline-slate-200 sm:flex-row sm:items-center sm:space-y-0 sm:space-x-4"
        >
            <!-- 搜索框 -->
            <div class="relative flex-1">
                <Search
                    class="absolute top-1/2 left-3 h-5 w-5 -translate-y-1/2 transform text-gray-400"
                />
                <input
                    v-model="searchKeyword"
                    type="text"
                    placeholder="搜索插件名称、模块、描述或作者..."
                    class="w-full rounded-full border border-gray-200 py-2 pr-10 pl-10 text-sm focus:outline-none"
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
                    @click="filterType = 'all'"
                    :class="
                        filterType === 'all'
                            ? 'bg-blue-100 text-blue-700'
                            : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                    "
                    class="btn-touch cursor-pointer rounded-2xl px-3 py-1.5 text-xs font-medium transition-colors"
                >
                    全部
                </button>
                <button
                    @click="filterType = 'installed'"
                    :class="
                        filterType === 'installed'
                            ? 'bg-green-100 text-green-700'
                            : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                    "
                    class="btn-touch cursor-pointer rounded-2xl px-3 py-1.5 text-xs font-medium transition-colors"
                >
                    已安装
                </button>
                <button
                    @click="filterType = 'not-installed'"
                    :class="
                        filterType === 'not-installed'
                            ? 'bg-gray-300 text-gray-700'
                            : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                    "
                    class="btn-touch cursor-pointer rounded-2xl px-3 py-1.5 text-xs font-medium transition-colors"
                >
                    未安装
                </button>
            </div>
        </div>

        <!-- 插件网格 -->
        <div class="flex-1 overflow-y-auto">
            <div v-if="loading" class="flex h-full items-center justify-center">
                <div class="text-center text-gray-400">
                    <Package class="mx-auto mb-4 h-12 w-12 animate-pulse" />
                    <p>加载中...</p>
                </div>
            </div>

            <div
                v-else-if="filteredPlugins.length === 0"
                class="flex h-full items-center justify-center"
            >
                <div class="text-center text-gray-400">
                    <Package class="mx-auto mb-4 h-16 w-16 opacity-50" />
                    <p class="text-lg">没有找到插件</p>
                    <p class="mt-2 text-sm">尝试调整搜索或过滤条件</p>
                </div>
            </div>

            <!-- 网格视图 -->
            <div
                v-else
                class="grid grid-cols-1 gap-3 p-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5"
            >
                <StoreCard
                    v-for="plugin in filteredPlugins"
                    :key="plugin.id"
                    :plugin="plugin"
                    @install="handleInstall"
                    @update="handleUpdate"
                />
            </div>
        </div>
    </div>
</template>

<style scoped></style>
