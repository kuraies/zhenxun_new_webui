<script setup lang="ts">
import {
    computed,
    nextTick,
    onBeforeUnmount,
    onDeactivated,
    onMounted,
    ref,
    watch,
} from "vue";
import { gsap } from "gsap";
import { usePolling } from "@/composables/usePolling";
import { initWebSocket, isConnected } from "@/utils/api-next/websocket-chat";
import { useGlobalStore } from "@/store/global.ts";
import { useChatStore } from "@/store/chat.ts";
import { openContextMenu } from "@/components/zxcomponent/ContextMenu";
import ChatContactTab from "@/views/chat/ChatContactTab.vue";
import ChatMessages from "@/views/chat/ChatMessages.vue";
import { storeToRefs } from "pinia";
import ManageOverview from "@/views/manage/ManageOverview.vue";

const globalStore = useGlobalStore();
const chatStore = useChatStore();
const { selectedContact, selectedId } = storeToRefs(chatStore);
const { setupMessageReceiver } = chatStore;

const manageTargetType = computed(() => {
    if (selectedContact.value === "group") return "group";
    if (selectedContact.value === "friend") return "friend";

    return null;
});

const manageTargetId = computed(() => selectedId.value || null);

// 右侧详情面板：点击聊天头部右侧的按钮切换显示
const showDetailPanel = ref(false);
const detailVisible = ref(false);
const detailPanelRef = ref<HTMLElement | null>(null);

const detailWidth = () =>
    window.matchMedia("(min-width: 1536px)").matches ? 384 : 288;

// xl 及以上：gsap 驱动，整卡从视窗右侧滑入，宽度动画给左侧聊天区让位；
// xl 以下（手机/平板/窄桌面）面板是全屏抽屉，直接显隐——gsap 写入的
// 内联 width 会压过抽屉的 max-xl:w-full，所以补间只允许在 xl 以上跑
watch(showDetailPanel, (open) => {
    const el = detailPanelRef.value;
    const desktop = window.matchMedia("(min-width: 1280px)").matches;
    if (!el || !desktop) {
        detailVisible.value = open;
        return;
    }
    gsap.killTweensOf(el);
    if (open) {
        detailVisible.value = true;
        nextTick(() => {
            gsap.fromTo(
                el,
                { width: 0, x: 384, autoAlpha: 0 },
                {
                    width: detailWidth(),
                    x: 0,
                    autoAlpha: 1,
                    duration: 0.32,
                    ease: "power3.out",
                },
            );
        });
    } else {
        gsap.to(el, {
            width: 0,
            x: 384,
            autoAlpha: 0,
            duration: 0.26,
            ease: "power2.in",
            onComplete: () => {
                detailVisible.value = false;
                // 清掉内联样式，避免残留宽度影响后续跨断点显示
                gsap.set(el, {
                    clearProps: "width,transform,opacity,visibility",
                });
            },
        });
    }
});

onBeforeUnmount(() => {
    if (detailPanelRef.value) gsap.killTweensOf(detailPanelRef.value);
});

// 页面被 KeepAlive 缓存（切走）时立即终止面板补间：gsap 的 ticker 会在
// 后台逐帧改写 aside 内联样式，页面级滑动过渡期间正好赶上时会干扰布局
onDeactivated(() => {
    if (detailPanelRef.value) gsap.killTweensOf(detailPanelRef.value);
});

// 连接状态检查轮询（页面可见性感知）
const { start: startConnectionPolling, stop: stopConnectionPolling } =
    usePolling(
        () => {
            globalStore.wsConnected = isConnected();
        },
        1000,
        { autoStart: false },
    );

// 初始化 WebSocket 连接
const initWebSocketConnection = () => {
    initWebSocket();
    // 立即检查一次
    globalStore.wsConnected = isConnected();
    // 启动可见性感知的连接状态轮询
    startConnectionPolling();
};

onMounted(async () => {
    initWebSocketConnection();
    setupMessageReceiver();
});

onBeforeUnmount(() => {
    // 停止连接状态轮询
    stopConnectionPolling();
    // 注意：不断开 WebSocket 连接，因为其他组件可能还在使用
});
</script>

<template>
    <!-- 整页接管右键：原生菜单不出现，选中文本时提供复制；
         联系人行在子层 .stop 已优先弹自定义菜单 -->
    <div
        class="flex h-full w-full flex-col space-y-4"
        @contextmenu="openContextMenu"
    >
        <!-- 注意用 gap 而不是 space-x：Tailwind v4 的 space-x 会给"除最后
             一个子元素外"都加 margin，常驻的隐藏详情面板会让消息卡片永远
             背着一个右边距；gap 只在实际渲染的盒子之间生效 -->
        <div
            class="flex min-h-0 min-w-0 flex-1 flex-col gap-3 sm:flex-row lg:gap-4"
        >
            <!-- 联系人列表 - 使用标签页切换好友/群组 -->
            <ChatContactTab />

            <!-- 聊天区域 -->
            <ChatMessages
                :detail-open="showDetailPanel"
                @toggle-detail="showDetailPanel = !showDetailPanel"
            />

            <!-- 管理区域 - 类似 QQ 聊天右侧资料/管理栏；
                 xl 以下为全屏抽屉：覆盖聊天区，点遮罩或面板内返回按钮关闭 -->
            <div
                v-if="detailVisible"
                class="fixed inset-0 z-30 bg-black/30 backdrop-blur-[2px] xl:hidden"
                @click="showDetailPanel = false"
            ></div>
            <aside
                v-show="detailVisible"
                ref="detailPanelRef"
                class="flex h-full w-72 flex-shrink-0 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm 2xl:w-96 max-xl:fixed max-xl:inset-0 max-xl:z-40 max-xl:w-full max-xl:rounded-none max-xl:border-0"
            >
                <!-- 固定宽度的内容层：桌面端动画期间内容不随宽度重排；
                     手机/平板全屏铺开 -->
                <div
                    class="h-full w-72 shrink-0 2xl:w-96 max-xl:w-full"
                >
                    <ManageOverview
                        embedded
                        :target-id="manageTargetId"
                        :target-type="manageTargetType"
                        @close="showDetailPanel = false"
                    />
                </div>
            </aside>
        </div>
    </div>
</template>

<style scoped></style>
