<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { Blocks, Package, Search, X } from "lucide-vue-next";
import { storeToRefs } from "pinia";
import type { PluginInfo } from "@/types/api-next.types";
import type { StorePlugin } from "@/types/store.types";
import PluginCard from "@/components/zxcomponent/PluginCard/PluginCard.vue";
import PluginConfigModal from "@/components/zxcomponent/PluginConfigModal/PluginConfigModal.vue";
import StoreCard from "@/components/zxcomponent/StoreCard/StoreCard.vue";
import { ZXMessageBox, ZXNotification } from "@/services/ui";
import { usePluginStore } from "@/store/plugin.ts";
import { useStoreStore } from "@/store/store.ts";
import { useGlobalStore } from "@/store/global.ts";
import { storeApi } from "@/utils/api-next";

const pluginStore = usePluginStore();
const storeStore = useStoreStore();
const globalStore = useGlobalStore();
const route = useRoute();
const router = useRouter();

const { loadPlugins } = pluginStore;
const { plugins, loading, searchKeyword, statusFilter, typeFilter } =
    storeToRefs(pluginStore);
const { loading: storeLoading, storeData } = storeToRefs(storeStore);
const { loadStoreData } = storeStore;

const activeView = ref<"local" | "market">(
    route.query.tab === "market" ? "market" : "local",
);

// 防抖定时器
let searchTimeout: ReturnType<typeof setTimeout> | null = null;

// 监听搜索和过滤条件变化，防抖加载
watch([searchKeyword, statusFilter, typeFilter], () => {
    if (searchTimeout) clearTimeout(searchTimeout);
    searchTimeout = setTimeout(loadPlugins, 300);
});

// 过滤后的插件列表（API 已处理过滤，直接返回）
const filteredLocalPlugins = computed(() => plugins.value);

const storeSearchKeyword = ref("");
const storeFilterType = ref<"all" | "installed" | "not-installed">("all");

const filteredStorePlugins = computed(() => {
    if (!storeData.value) return [];

    let result = storeData.value.plugin_list;

    if (storeSearchKeyword.value) {
        const keyword = storeSearchKeyword.value.toLowerCase();
        result = result.filter(
            (plugin: StorePlugin) =>
                plugin.name.toLowerCase().includes(keyword) ||
                plugin.module.toLowerCase().includes(keyword) ||
                plugin.description?.toLowerCase().includes(keyword) ||
                plugin.author?.toLowerCase().includes(keyword),
        );
    }

    if (storeFilterType.value === "installed") {
        result = result.filter((plugin: StorePlugin) => plugin.is_installed);
    } else if (storeFilterType.value === "not-installed") {
        result = result.filter((plugin: StorePlugin) => !plugin.is_installed);
    }

    return result;
});

// 统计信息
const pluginStats = computed(() => {
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

const storeStats = computed(() => {
    if (!storeData.value) return { total: 0, installed: 0, available: 0 };
    const total = storeData.value.plugin_list.length;
    const installed = storeData.value.plugin_list.filter(
        (p: StorePlugin) => p.is_installed,
    ).length;
    return { total, installed, available: total - installed };
});

const currentCount = computed(() =>
    activeView.value === "local"
        ? filteredLocalPlugins.value.length
        : filteredStorePlugins.value.length,
);

const currentLoading = computed(() =>
    activeView.value === "local" ? loading.value : storeLoading.value,
);

const switchView = (view: "local" | "market") => {
    activeView.value = view;
};

watch(activeView, (view) => {
    router.replace({
        path: "/plugin",
        query: view === "market" ? { tab: "market" } : {},
    });

    if (view === "market" && !storeData.value) {
        loadStoreData();
    }
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

// 配置更新后
const handleConfigUpdated = () => {
    // 重新加载插件列表
    loadPlugins();
};

onMounted(() => {
    loadPlugins();
    if (activeView.value === "market") {
        loadStoreData();
    }
});
</script>

<template>
    <div class="flex h-full w-full flex-col space-y-3 sm:space-y-4">
        <!-- 头部标题和统计 -->
        <div
            class="flex flex-col items-start justify-between gap-3 rounded-3xl border-1 border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:gap-0"
            v-if="!globalStore.isDesktopMode"
        >
            <div class="flex items-center space-x-3">
                <Blocks class="h-6 w-6 flex-shrink-0 text-blue-500" />
                <h2 class="text-lg font-semibold text-gray-800">插件管理</h2>
                <span class="text-sm text-gray-500"
                    >(共 {{ currentCount }} 个)</span
                >
            </div>

            <!-- 刷新按钮 -->
            <button
                @click="activeView === 'local' ? loadPlugins() : loadStoreData()"
                :disabled="currentLoading"
                class="btn-touch rounded-full bg-gray-100 p-2 transition-colors hover:bg-gray-200 disabled:opacity-50"
                title="刷新列表"
            >
                <svg
                    class="h-5 w-5"
                    :class="{ 'animate-spin': currentLoading }"
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
            v-if="!globalStore.isDesktopMode && activeView === 'local'"
        >
            <div
                class="rounded-3xl border-1 border-slate-200 bg-white p-3 text-center shadow-sm"
            >
                <div class="text-lg font-bold text-gray-800 sm:text-xl">
                    {{ pluginStats.total }}
                </div>
                <div class="mt-0.5 text-xs text-gray-500">总插件数</div>
            </div>
            <div
                class="rounded-3xl border-1 border-slate-200 bg-white p-3 text-center shadow-sm"
            >
                <div class="text-lg font-bold text-green-600 sm:text-xl">
                    {{ pluginStats.active }}
                </div>
                <div class="mt-0.5 text-xs text-gray-500">已启用</div>
            </div>
            <div
                class="rounded-3xl border-1 border-slate-200 bg-white p-3 text-center shadow-sm"
            >
                <div class="text-lg font-bold text-gray-600 sm:text-xl">
                    {{ pluginStats.inactive }}
                </div>
                <div class="mt-0.5 text-xs text-gray-500">已禁用</div>
            </div>
            <div
                class="rounded-3xl border-1 border-slate-200 bg-white p-3 text-center shadow-sm"
            >
                <div class="text-lg font-bold text-purple-600 sm:text-xl">
                    {{ pluginStats.builtin }}
                </div>
                <div class="mt-0.5 text-xs text-gray-500">内置插件</div>
            </div>
        </div>

        <div
            class="grid grid-cols-3 gap-2 sm:gap-3"
            v-if="!globalStore.isDesktopMode && activeView === 'market'"
        >
            <div
                class="rounded-3xl border-1 border-slate-200 bg-white p-3 text-center shadow-sm"
            >
                <div class="text-lg font-bold text-blue-600 sm:text-xl">
                    {{ storeStats.total }}
                </div>
                <div class="mt-0.5 text-xs text-gray-500">市场插件</div>
            </div>
            <div
                class="rounded-3xl border-1 border-slate-200 bg-white p-3 text-center shadow-sm"
            >
                <div class="text-lg font-bold text-green-600 sm:text-xl">
                    {{ storeStats.installed }}
                </div>
                <div class="mt-0.5 text-xs text-gray-500">已安装</div>
            </div>
            <div
                class="rounded-3xl border-1 border-slate-200 bg-white p-3 text-center shadow-sm"
            >
                <div class="text-lg font-bold text-pink-600 sm:text-xl">
                    {{ storeStats.available }}
                </div>
                <div class="mt-0.5 text-xs text-gray-500">可安装</div>
            </div>
        </div>

        <!-- 搜索和过滤 - 响应式布局 -->
        <div
            class="flex flex-col items-stretch space-y-3 rounded-3xl border-1 border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:space-y-0 sm:space-x-4"
        >
            <div class="flex flex-shrink-0 rounded-2xl bg-gray-100 p-1">
                <button
                    @click="switchView('local')"
                    :class="
                        activeView === 'local'
                            ? 'bg-white text-blue-700 shadow-sm'
                            : 'text-gray-500 hover:text-gray-700'
                    "
                    class="btn-touch flex items-center gap-1 rounded-2xl px-3 py-1.5 text-xs font-medium transition-colors"
                >
                    <Blocks class="h-4 w-4" />
                    <span>本地插件</span>
                </button>
                <button
                    @click="switchView('market')"
                    :class="
                        activeView === 'market'
                            ? 'bg-white text-blue-700 shadow-sm'
                            : 'text-gray-500 hover:text-gray-700'
                    "
                    class="btn-touch flex items-center gap-1 rounded-2xl px-3 py-1.5 text-xs font-medium transition-colors"
                >
                    <Package class="h-4 w-4" />
                    <span>插件市场</span>
                </button>
            </div>

            <!-- 搜索框 -->
            <div class="relative flex-1">
                <Search
                    class="absolute top-1/2 left-3 h-5 w-5 -translate-y-1/2 transform text-gray-400"
                />
                <input
                    v-if="activeView === 'local'"
                    v-model="searchKeyword"
                    type="text"
                    placeholder="搜索插件名称..."
                    class="w-full rounded-2xl border border-gray-200 py-2 pr-10 pl-10 text-sm focus:outline-none"
                />
                <input
                    v-else
                    v-model="storeSearchKeyword"
                    type="text"
                    placeholder="搜索插件名称、模块、描述或作者..."
                    class="w-full rounded-2xl border border-gray-200 py-2 pr-10 pl-10 text-sm focus:outline-none"
                />
                <button
                    v-if="
                        activeView === 'local'
                            ? searchKeyword
                            : storeSearchKeyword
                    "
                    @click="
                        activeView === 'local'
                            ? (searchKeyword = '')
                            : (storeSearchKeyword = '')
                    "
                    class="btn-touch absolute top-1/2 right-3 -translate-y-1/2 transform text-gray-400 hover:text-gray-600"
                >
                    <X class="h-4 w-4" />
                </button>
            </div>

            <!-- 状态过滤 -->
            <div
                v-if="activeView === 'local'"
                class="flex flex-shrink-0 flex-wrap items-center gap-1"
            >
                <span class="flex-shrink-0 text-sm text-gray-600">状态:</span>
                <button
                    @click="statusFilter = 'all'"
                    :class="
                        statusFilter === 'all'
                            ? 'bg-blue-100 text-blue-700'
                            : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                    "
                    class="btn-touch cursor-pointer rounded-2xl px-3 py-1.5 text-xs font-medium transition-colors"
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
                    class="btn-touch cursor-pointer rounded-2xl px-3 py-1.5 text-xs font-medium transition-colors"
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
                    class="btn-touch cursor-pointer rounded-2xl px-3 py-1.5 text-xs font-medium transition-colors"
                >
                    禁用
                </button>
            </div>

            <!-- 类型过滤 -->
            <div
                v-if="activeView === 'local'"
                class="flex flex-shrink-0 flex-wrap items-center gap-1"
            >
                <span class="flex-shrink-0 text-sm text-gray-600">类型:</span>
                <button
                    @click="typeFilter = 'all'"
                    :class="
                        typeFilter === 'all'
                            ? 'bg-blue-100 text-blue-700'
                            : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                    "
                    class="btn-touch cursor-pointer rounded-2xl px-3 py-1.5 text-xs font-medium transition-colors"
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
                    class="btn-touch cursor-pointer rounded-2xl px-3 py-1.5 text-xs font-medium transition-colors"
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
                    class="btn-touch cursor-pointer rounded-2xl px-3 py-1.5 text-xs font-medium transition-colors"
                >
                    三方
                </button>
            </div>

            <div
                v-else
                class="flex flex-shrink-0 flex-wrap items-center gap-1"
            >
                <span class="flex-shrink-0 text-sm text-gray-600">状态:</span>
                <button
                    @click="storeFilterType = 'all'"
                    :class="
                        storeFilterType === 'all'
                            ? 'bg-blue-100 text-blue-700'
                            : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                    "
                    class="btn-touch cursor-pointer rounded-2xl px-3 py-1.5 text-xs font-medium transition-colors"
                >
                    全部
                </button>
                <button
                    @click="storeFilterType = 'installed'"
                    :class="
                        storeFilterType === 'installed'
                            ? 'bg-green-100 text-green-700'
                            : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                    "
                    class="btn-touch cursor-pointer rounded-2xl px-3 py-1.5 text-xs font-medium transition-colors"
                >
                    已安装
                </button>
                <button
                    @click="storeFilterType = 'not-installed'"
                    :class="
                        storeFilterType === 'not-installed'
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
        <div class="flex-1 overflow-y-auto px-1">
            <div
                v-if="currentLoading"
                class="flex h-full items-center justify-center"
            >
                <div class="text-center text-gray-400">
                    <component
                        :is="activeView === 'local' ? Blocks : Package"
                        class="mx-auto mb-4 h-12 w-12 animate-pulse"
                    />
                    <p>加载中...</p>
                </div>
            </div>

            <div
                v-else-if="
                    activeView === 'local'
                        ? filteredLocalPlugins.length === 0
                        : filteredStorePlugins.length === 0
                "
                class="flex h-full items-center justify-center"
            >
                <div class="text-center text-gray-400">
                    <component
                        :is="activeView === 'local' ? Blocks : Package"
                        class="mx-auto mb-4 h-16 w-16 opacity-50"
                    />
                    <p class="text-lg">没有找到插件</p>
                    <p class="mt-2 text-sm">尝试调整搜索或过滤条件</p>
                </div>
            </div>

            <template v-else>
                <!-- 网格视图 -->
                <div
                    v-if="activeView === 'local'"
                    class="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5"
                >
                    <PluginCard
                        v-for="plugin in filteredLocalPlugins"
                        :key="plugin.module"
                        :plugin="plugin"
                        @status-change="handleStatusChange"
                        @open-config="handleOpenConfig"
                    />
                </div>

                <!-- 瀑布流视图 -->
                <div v-else class="market-masonry">
                    <StoreCard
                        v-for="plugin in filteredStorePlugins"
                        :key="plugin.id"
                        :plugin="plugin"
                        class="market-masonry-item"
                        @install="handleInstall"
                        @update="handleUpdate"
                    />
                </div>
            </template>
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

<style scoped>
.market-masonry {
    column-count: 1;
    column-gap: 0.75rem;
}

.market-masonry-item {
    display: block;
    margin-bottom: 0.75rem;
    break-inside: avoid;
}

@media (min-width: 640px) {
    .market-masonry {
        column-count: 2;
    }
}

@media (min-width: 1024px) {
    .market-masonry {
        column-count: 3;
    }
}

@media (min-width: 1280px) {
    .market-masonry {
        column-count: 4;
    }
}

@media (min-width: 1536px) {
    .market-masonry {
        column-count: 5;
    }
}
</style>
