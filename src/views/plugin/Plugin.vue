<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import {
    Anchor,
    Blocks,
    ChevronLeft,
    ChevronRight,
    Package,
    Pin,
    PinOff,
    Search,
    SlidersHorizontal,
    X,
} from "lucide-vue-next";
import { storeToRefs } from "pinia";
import type { PluginInfo } from "@/types/api-next.types";
import type { NbStorePlugin, StorePlugin } from "@/types/store.types";
import PluginCard from "@/components/zxcomponent/PluginCard/PluginCard.vue";
import PluginConfigModal from "@/components/zxcomponent/PluginConfigModal/PluginConfigModal.vue";
import StoreCard from "@/components/zxcomponent/StoreCard/StoreCard.vue";
import { ZXMessageBox, ZXNotification } from "@/services/ui";
import { ZXDropdown } from "@/components/zxcomponent/ZXDropdown";
import type { ZXDropdownOption } from "@/components/zxcomponent/ZXDropdown";
import { usePluginStore } from "@/store/plugin.ts";
import { useStoreStore } from "@/store/store.ts";
import { useGlobalStore } from "@/store/global.ts";
import { storeApi } from "@/utils/api-next";
import { ZXContextMenu } from "@/components/zxcomponent/ContextMenu";
import { CornerFrame } from "@/components/zxcomponent/CornerFrame";
import { gsap } from "gsap";

const pluginStore = usePluginStore();
const storeStore = useStoreStore();
const globalStore = useGlobalStore();
const route = useRoute();
const router = useRouter();

const { loadPlugins } = pluginStore;
const {
    plugins,
    loading,
    searchKeyword,
    statusFilter,
    showBuiltin,
    showThird,
    pinnedModules,
    residentModules,
} = storeToRefs(pluginStore);
const { togglePinned, toggleResident } = pluginStore;
const { loading: storeLoading, storeData } = storeToRefs(storeStore);
const { loadStoreData } = storeStore;

// 移动 / 平板：筛选与统计默认收起，点「筛选」展开
const filtersExpanded = ref(false);

const activeView = ref<"local" | "market">(
    route.query.tab === "market" ? "market" : "local",
);

// 防抖定时器
let searchTimeout: ReturnType<typeof setTimeout> | null = null;

// 监听搜索变化，防抖加载（状态/类型筛选与标记都在前端过滤，不触发请求）
watch(searchKeyword, () => {
    if (searchTimeout) clearTimeout(searchTimeout);
    searchTimeout = setTimeout(loadPlugins, 300);
});

// 过滤后的插件列表：状态/类型按开关过滤，
// 但置顶与常驻的插件始终保留（标记即常显），置顶按先后排最前
const filteredLocalPlugins = computed(() => {
    const isMarked = (module: string) =>
        pinnedModules.value.includes(module) ||
        residentModules.value.includes(module);
    const list = plugins.value.filter((p) => {
        if (isMarked(p.module)) return true;
        if (statusFilter.value === "active" && !p.is_enabled) return false;
        if (statusFilter.value === "inactive" && p.is_enabled) return false;
        return p.is_builtin ? showBuiltin.value : showThird.value;
    });
    const pinIndex = (module: string) => {
        const i = pinnedModules.value.indexOf(module);
        return i === -1 ? Number.MAX_SAFE_INTEGER : i;
    };
    return [...list].sort((a, b) => pinIndex(a.module) - pinIndex(b.module));
});

// 右键卡片：置顶 / 常驻
const openPluginMenu = (e: MouseEvent, plugin: PluginInfo) => {
    const pinned = pinnedModules.value.includes(plugin.module);
    const resident = residentModules.value.includes(plugin.module);
    ZXContextMenu.show({
        x: e.clientX,
        y: e.clientY,
        items: [
            {
                label: pinned ? "取消置顶" : "置顶插件",
                icon: pinned ? PinOff : Pin,
                action: () => togglePinned(plugin.module),
            },
            {
                label: resident ? "取消常驻" : "常驻插件",
                icon: Anchor,
                action: () => toggleResident(plugin.module),
            },
        ],
    });
};

const storeSearchKeyword = ref("");
const storeFilterType = ref<"all" | "installed" | "not-installed">("all");

// 插件市场源，下拉只显示当前源
const storeSource = ref<"zhenxun" | "nonebot">("zhenxun");
const storeSourceOptions: ZXDropdownOption[] = [
    { label: "真寻源", value: "zhenxun" },
    { label: "NoneBot源", value: "nonebot" },
];

// ==================== NoneBot 源 ====================
const nbPlugins = ref<NbStorePlugin[]>([]);
const nbLoading = ref(false);

const loadNbStore = async () => {
    nbLoading.value = true;
    try {
        const res = await storeApi.getNbStoreList();
        if (res?.success && res?.data) {
            nbPlugins.value = res.data;
        }
    } catch {
        ZXNotification({
            title: "呜呼~",
            message: "NoneBot 插件列表加载失败了 (´；ω；`)",
            type: "😭",
            position: "top-right",
        });
    } finally {
        nbLoading.value = false;
    }
};

const handleStoreSourceChange = (value: string) => {
    storeSource.value = value as "zhenxun" | "nonebot";
    marketPage.value = 1;
    if (value === "nonebot" && !nbPlugins.value.length) {
        loadNbStore();
    }
};

// NB 源搜索 + 安装状态过滤
const filteredNbPlugins = computed(() => {
    let result = nbPlugins.value;
    if (storeSearchKeyword.value) {
        const keyword = storeSearchKeyword.value.toLowerCase();
        result = result.filter(
            (p) =>
                p.name.toLowerCase().includes(keyword) ||
                p.module_name.toLowerCase().includes(keyword) ||
                p.desc?.toLowerCase().includes(keyword) ||
                p.author?.toLowerCase().includes(keyword),
        );
    }
    if (storeFilterType.value === "installed") {
        result = result.filter((p) => p.installed);
    } else if (storeFilterType.value === "not-installed") {
        result = result.filter((p) => !p.installed);
    }
    return result;
});

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

// NB 标签品牌色：标签名 -> 背景色（文字黑白由 StoreCard 按亮度计算）
const nbTagColors = computed<Record<string, string> | undefined>(() => {
    if (storeSource.value !== "nonebot") return undefined;
    const map: Record<string, string> = {};
    for (const p of nbPlugins.value) {
        for (const t of p.tags) {
            if (t.label && t.color) map[t.label] = t.color;
        }
    }
    return map;
});

// 市场视图统一卡片数据（NoneBot 源映射为 StoreCard 的字段）
const marketCards = computed<StorePlugin[]>(() => {
    if (storeSource.value === "nonebot") {
        return filteredNbPlugins.value.map((p) => ({
            id: 0,
            module: p.module_name,
            name: p.name,
            description: p.desc,
            author: p.author,
            version:
                p.has_update && p.local_version
                    ? `${p.version}（当前 v${p.local_version}）`
                    : p.version,
            plugin_type: p.is_official ? "官方" : "",
            is_installed: p.installed,
            has_update: p.has_update,
            homepage: p.homepage || "",
            tags: p.tags.map((t) => t.label),
        }));
    }
    return filteredStorePlugins.value;
});

// ==================== 市场分页（真寻源 / NoneBot 源共用） ====================
const MARKET_PAGE_SIZE = 20;
const marketPage = ref(1);
const marketPageTotal = computed(() =>
    Math.max(1, Math.ceil(marketCards.value.length / MARKET_PAGE_SIZE)),
);
const pagedMarketCards = computed(() =>
    marketCards.value.slice(
        (marketPage.value - 1) * MARKET_PAGE_SIZE,
        marketPage.value * MARKET_PAGE_SIZE,
    ),
);
// 页码窗口：总数超过 7 时以当前页居中滑动
const marketPageList = computed(() => {
    const total = marketPageTotal.value;
    if (total <= 7) {
        return Array.from({ length: total }, (_, i) => i + 1);
    }
    const start = Math.max(1, Math.min(marketPage.value - 3, total - 6));
    return Array.from({ length: 7 }, (_, i) => start + i);
});

const setMarketPage = (page: number) => {
    if (
        page < 1 ||
        page > marketPageTotal.value ||
        page === marketPage.value
    ) {
        return;
    }
    marketPage.value = page;
    contentRef.value?.scrollTo({ top: 0 });
    nextTick(animateCardsIn);
};

// 搜索 / 安装状态过滤变化时回到第一页
watch([storeSearchKeyword, storeFilterType], () => {
    marketPage.value = 1;
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
        : marketCards.value.length,
);

const currentLoading = computed(() => {
    if (activeView.value === "local") return loading.value;
    return storeSource.value === "nonebot"
        ? nbLoading.value
        : storeLoading.value;
});

// 过渡：内容区淡入淡出、卡片入场、筛选行展开
const contentRef = ref<HTMLElement | null>(null);
const headerRef = ref<HTMLElement | null>(null);

// 游离四角取景框：市场卡片悬浮时瞬移跟随
const frameRef = ref<InstanceType<typeof CornerFrame> | null>(null);
let framedCard: HTMLElement | null = null;
let frameDwellTimer: ReturnType<typeof setTimeout> | null = null;
let frameHideTimer: ReturnType<typeof setTimeout> | null = null;

const clearFrameTimers = () => {
    if (frameDwellTimer) {
        clearTimeout(frameDwellTimer);
        frameDwellTimer = null;
    }
    if (frameHideTimer) {
        clearTimeout(frameHideTimer);
        frameHideTimer = null;
    }
};

const onMarketOver = (e: MouseEvent) => {
    const card = (e.target as HTMLElement | null)?.closest?.(
        ".market-card",
    ) as HTMLElement | null;
    // 回到同一张卡：取消未决的隐藏即可
    if (card && card === framedCard) {
        if (frameHideTimer) {
            clearTimeout(frameHideTimer);
            frameHideTimer = null;
        }
        return;
    }
    clearFrameTimers();
    if (!card) {
        // 卡片间隙 / 空白：延迟隐藏，快速跨间隙不会闪烁
        if (framedCard && frameHideTimer === null) {
            frameHideTimer = setTimeout(() => {
                frameHideTimer = null;
                framedCard = null;
                frameRef.value?.hide();
            }, 100);
        }
        return;
    }
    // 新卡片：极短的移入判定
    const target = card;
    frameDwellTimer = setTimeout(() => {
        frameDwellTimer = null;
        framedCard = target;
        frameRef.value?.moveTo(target);
    }, 20);
};

const onMarketLeave = () => {
    clearFrameTimers();
    framedCard = null;
    frameRef.value?.hide();
};

const animateCardsIn = () => {
    const el = contentRef.value;
    if (!el) return;
    const cards = el.querySelectorAll(".grid > *");
    if (!cards.length) return;
    // 卡片自带 transition-all，先禁用避免和 GSAP 补间打架，结束后还原
    gsap.fromTo(
        cards,
        { opacity: 0, y: 14, transition: "none" },
        {
            opacity: 1,
            y: 0,
            duration: 0.32,
            stagger: 0.035,
            ease: "power2.out",
            clearProps: "all",
        },
    );
};

watch(currentLoading, (isLoading) => {
    if (!isLoading) nextTick(animateCardsIn);
});

watch(filtersExpanded, async (expanded) => {
    if (!expanded) return;
    await nextTick();
    const rows = headerRef.value?.querySelectorAll(".filter-row");
    if (!rows?.length) return;
    gsap.fromTo(
        rows,
        { opacity: 0, y: -6 },
        { opacity: 1, y: 0, duration: 0.25, ease: "power2.out", clearProps: "all" },
    );
});

// ==================== gsap 驱动的胶片式视图切换（横向版，同侧边栏切页） ====================
const onViewEnter = (el: Element, done: () => void) => {
    gsap.killTweensOf(el);
    const style = (el as HTMLElement).style;
    style.position = "";
    style.pointerEvents = "";
    gsap.fromTo(
        el,
        { xPercent: activeView.value === "market" ? 100 : -100 },
        {
            xPercent: 0,
            duration: 0.55,
            ease: "power4.out",
            onComplete: () => {
                gsap.set(el, { clearProps: "transform" });
                done();
            },
            // 被下一次切换打断时也要释放，否则 Transition 会一直等 done
            onInterrupt: () => done(),
        },
    );
};

const onViewLeave = (el: Element, done: () => void) => {
    gsap.killTweensOf(el);
    // 退场视图绝对定位脱离文档流，与新视图同屏叠放成胶片带
    const style = (el as HTMLElement).style;
    style.position = "absolute";
    style.top = "0";
    style.left = "0";
    style.width = "100%";
    style.pointerEvents = "none";
    gsap.to(el, {
        xPercent: activeView.value === "market" ? -100 : 100,
        duration: 0.55,
        ease: "power4.out",
        onComplete: done,
        onInterrupt: () => done(),
    });
};

const switchView = (view: "local" | "market") => {
    if (activeView.value === view) return;
    activeView.value = view;
    // 新视图从顶部开始，同时保证退场视图在可视区内滑出
    contentRef.value?.scrollTo({ top: 0 });
    clearFrameTimers();
    frameRef.value?.hide();
};

watch(activeView, (view) => {
    router.replace({
        path: "/plugin",
        query: view === "market" ? { tab: "market" } : {},
    });

    if (view === "market" && storeSource.value === "nonebot") {
        if (!nbPlugins.value.length) loadNbStore();
    } else if (view === "market" && !storeData.value) {
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
                if (storeSource.value === "nonebot") {
                    const res = await storeApi.installNbPlugin(plugin.module);
                    if (res?.success) {
                        ZXNotification({
                            title: "安装成功~",
                            message:
                                res.message ||
                                `"${plugin.name}" 已经安装成功啦！重启Bot生效`,
                            type: "🎉",
                            position: "top-right",
                            confetti: true,
                        });
                        loadNbStore();
                    } else {
                        ZXNotification({
                            title: "安装失败",
                            message:
                                res?.message ||
                                "插件安装失败了，请再试一次 (´；ω；`)",
                            type: "😭",
                            position: "top-right",
                        });
                    }
                    return;
                }
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
        if (storeSource.value === "nonebot") {
            const res = await storeApi.updateNbPlugin(plugin.module);
            if (res?.success) {
                ZXNotification({
                    title: "更新成功~",
                    message:
                        res.message || `"${plugin.name}" 已经更新到最新版本啦！`,
                    type: "🥳",
                    position: "top-right",
                    confetti: true,
                });
                loadNbStore();
            } else {
                ZXNotification({
                    title: "更新失败",
                    message:
                        res?.message || "插件更新失败了 (´；ω；`)",
                    type: "😭",
                    position: "top-right",
                });
            }
            return;
        }
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
        <!-- 搜索和过滤 - 响应式布局（移动/平板：视图切换、刷新、统计、过滤全部集成在这张卡里） -->
        <div
            ref="headerRef"
            class="flex flex-col items-stretch gap-3 rounded-3xl border-1 border-slate-200 bg-white p-3 shadow-sm sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-4 sm:gap-y-3 sm:p-4"
        >
            <!-- 视图切换 + 刷新（非桌面把刷新并入；桌面无此卡由搜索过滤条独立呈现） -->
            <div
                class="flex items-center gap-2"
                :class="
                    globalStore.isDesktopMode
                        ? 'flex-shrink-0'
                        : globalStore.isMobileMode
                          ? 'min-w-0 flex-1'
                          : 'w-fit flex-shrink-0'
                "
            >
                <div class="flex min-w-0 flex-1 rounded-2xl border border-slate-200 bg-gray-100 p-1">
                <button
                    @click="switchView('local')"
                    :class="
                        activeView === 'local'
                            ? 'bg-white text-blue-700 shadow-sm'
                            : 'text-gray-500 hover:text-gray-700'
                    "
                    class="btn-touch flex items-center gap-1 whitespace-nowrap rounded-2xl px-3 py-1.5 text-xs font-medium transition-colors"
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
                    class="btn-touch flex items-center gap-1 whitespace-nowrap rounded-2xl px-3 py-1.5 text-xs font-medium transition-colors"
                >
                    <Package class="h-4 w-4" />
                    <span>插件市场</span>
                </button>
                </div>
                <button
                    v-if="!globalStore.isDesktopMode"
                    class="btn-touch flex h-[38px] w-[38px] shrink-0 cursor-pointer items-center justify-center rounded-full border border-slate-200 bg-gray-100 text-gray-500 transition-colors hover:bg-gray-200 hover:text-gray-700 disabled:opacity-50"
                    title="刷新列表"
                    type="button"
                    :disabled="currentLoading"
                    @click="
                        activeView === 'local'
                            ? loadPlugins()
                            : storeSource === 'nonebot'
                              ? loadNbStore()
                              : loadStoreData()
                    "
                >
                    <svg
                        class="h-4 w-4"
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

            <!-- 搜索框 + 筛选开关（移动/平板把筛选嵌进搜索框右侧；空间不足时整块换行占满一行，避免输入区被挤瘪） -->
            <div class="flex min-w-[220px] flex-1 items-center gap-2">
                <!-- 市场源切换（下拉只显示当前源；NoneBot 源暂未实现） -->
                <ZXDropdown
                    v-if="activeView === 'market'"
                    :model-value="storeSource"
                    :options="storeSourceOptions"
                    trigger-class="btn-touch flex h-[38px] flex-shrink-0 whitespace-nowrap rounded-full border border-slate-200 bg-gray-100 pl-3.5 pr-2.5 text-xs font-medium text-gray-500 transition-colors hover:text-gray-700"
                    @update:model-value="handleStoreSourceChange"
                />
                <div
                    class="flex min-w-0 flex-1 items-center gap-1 rounded-full border border-slate-200 bg-slate-50 py-1.5 pl-3.5 pr-1.5 transition-colors focus-within:bg-white"
                >
                    <Search
                        class="h-4 w-4 shrink-0 text-slate-400"
                    />
                    <input
                        v-if="activeView === 'local'"
                        v-model="searchKeyword"
                        type="text"
                        placeholder="搜索插件名称..."
                        class="min-w-0 flex-1 bg-transparent text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none"
                    />
                    <input
                        v-else
                        v-model="storeSearchKeyword"
                        type="text"
                        placeholder="搜索插件名称、模块、描述或作者..."
                        class="min-w-0 flex-1 bg-transparent text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none"
                    />
                    <button
                        v-if="
                            activeView === 'local'
                                ? searchKeyword
                                : storeSearchKeyword
                        "
                        class="flex h-6 w-6 shrink-0 cursor-pointer items-center justify-center rounded-full text-slate-400 transition-colors hover:text-slate-600"
                        type="button"
                        @click="
                            activeView === 'local'
                                ? (searchKeyword = '')
                                : (storeSearchKeyword = '')
                        "
                    >
                        <X class="h-4 w-4" />
                    </button>
                    <button
                        class="flex h-7 w-7 shrink-0 cursor-pointer items-center justify-center rounded-full transition-colors"
                        :class="
                            filtersExpanded
                                ? 'text-zx-primary'
                                : 'text-slate-400 hover:text-zx-primary'
                        "
                        title="筛选"
                        type="button"
                        @click="filtersExpanded = !filtersExpanded"
                    >
                        <SlidersHorizontal class="h-4 w-4" />
                    </button>
                </div>
            </div>

            <!-- 状态 / 类型过滤（移动/平板默认收起，点「筛选」展开） -->
            <div
                v-if="activeView === 'local'"
                                :class="!filtersExpanded ? 'hidden' : ''"
                class="filter-row flex w-full flex-wrap items-center justify-between gap-x-4 gap-y-2"
            >
                <div class="flex items-center gap-1">
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

                <div class="flex items-center gap-1">
                <span class="flex-shrink-0 text-sm text-gray-600">类型:</span>
                <button
                    @click="showBuiltin = !showBuiltin"
                    :class="
                        showBuiltin
                            ? 'bg-purple-100 text-purple-700'
                            : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                    "
                    class="btn-touch cursor-pointer rounded-2xl px-3 py-1.5 text-xs font-medium transition-colors"
                >
                    内置
                </button>
                <button
                    @click="showThird = !showThird"
                    :class="
                        showThird
                            ? 'bg-orange-100 text-orange-700'
                            : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                    "
                    class="btn-touch cursor-pointer rounded-2xl px-3 py-1.5 text-xs font-medium transition-colors"
                >
                    三方
                </button>
                </div>
            </div>

            <div
                v-else
                                :class="!filtersExpanded ? 'hidden' : ''"
                class="filter-row flex w-full flex-wrap items-center gap-1"
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
        <div
            ref="contentRef"
            class="relative flex-1 overflow-x-hidden overflow-y-auto px-1"
            @mouseover="onMarketOver"
            @mouseleave="onMarketLeave"
        >
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
                        : marketCards.length === 0
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

            <Transition
                v-else
                :css="false"
                @enter="onViewEnter"
                @leave="onViewLeave"
            >
                <!-- 网格视图 -->
                <div
                    v-if="activeView === 'local'"
                    key="local"
                    class="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5"
                >
                    <PluginCard
                        v-for="plugin in filteredLocalPlugins"
                        :key="plugin.module"
                        :plugin="plugin"
                        :pinned="pinnedModules.includes(plugin.module)"
                        :resident="residentModules.includes(plugin.module)"
                        @contextmenu.prevent="openPluginMenu($event, plugin)"
                        @status-change="handleStatusChange"
                        @open-config="handleOpenConfig"
                    />
                </div>

                <!-- 插件市场（与管理相同的网格） -->
                <div
                    v-else
                    key="market"
                    class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5"
                >
                    <StoreCard
                        v-for="plugin in pagedMarketCards"
                        :key="plugin.module"
                        :plugin="plugin"
                        :tag-colors="nbTagColors"
                        @install="handleInstall"
                        @update="handleUpdate"
                    />
                </div>
            </Transition>

            <!-- 游离四角取景框：瞬移到悬停的市场卡片 -->
            <CornerFrame ref="frameRef" />

            <!-- 分页（市场两个源共用） -->
            <div
                v-if="
                    !currentLoading &&
                    marketCards.length > 0 &&
                    marketPageTotal > 1
                "
                class="flex items-center justify-center gap-1 pb-1 pt-4"
            >
                <button
                    class="btn-touch flex h-8 w-8 cursor-pointer items-center justify-center rounded-full transition-colors disabled:cursor-not-allowed disabled:opacity-40"
                    :class="
                        marketPage === 1
                            ? 'text-gray-300'
                            : 'text-gray-500 hover:bg-gray-100'
                    "
                    :disabled="marketPage === 1"
                    type="button"
                    @click="setMarketPage(marketPage - 1)"
                >
                    <ChevronLeft class="h-4 w-4" />
                </button>
                <button
                    v-for="page in marketPageList"
                    :key="page"
                    class="btn-touch h-8 min-w-8 cursor-pointer rounded-full px-2 text-sm transition-colors"
                    :class="
                        page === marketPage
                            ? 'bg-zx-primary font-medium text-white'
                            : 'text-gray-500 hover:bg-gray-100'
                    "
                    type="button"
                    @click="setMarketPage(page)"
                >
                    {{ page }}
                </button>
                <button
                    class="btn-touch flex h-8 w-8 cursor-pointer items-center justify-center rounded-full transition-colors disabled:cursor-not-allowed disabled:opacity-40"
                    :class="
                        marketPage === marketPageTotal
                            ? 'text-gray-300'
                            : 'text-gray-500 hover:bg-gray-100'
                    "
                    :disabled="marketPage === marketPageTotal"
                    type="button"
                    @click="setMarketPage(marketPage + 1)"
                >
                    <ChevronRight class="h-4 w-4" />
                </button>
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

<style scoped>
/* 果冻动画样式已在 custom.css 中统一定义 */
</style>
