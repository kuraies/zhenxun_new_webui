<script setup lang="ts">
import { onMounted, onUnmounted, ref } from "vue";

import { useWebSocketStore } from "@/store/websocket";
import {
    connectStatusWebSocket,
    disconnectStatusWebSocket,
    onConnectionStateChange,
    onStatusMessage,
} from "@/utils/api-next/websocket-status";
import {
    connectLogsWebSocket,
    disconnectLogsWebSocket,
    onLogMessage,
} from "@/utils/api-next/websocket-logs";
import { whiteScreen } from "@/services/ui";
import { routeLoading, router } from "@/router";
import { getMenuOrderMap } from "@/config/menu";
import { gsap } from "gsap";
import { useBotStore } from "@/store/bot";
import { useManageStore } from "@/store/manage";
import { useThemeStore } from "@/store/theme";
import { useChatStore } from "@/store/chat";

// 引入拆分出的组件
import HomeHeader from "@/components/home/HomeHeader.vue";
import HomeSidebar from "@/components/home/HomeSidebar.vue";
import { useGlobalStore } from "@/store/global.ts";
import { ChevronLeft, ChevronRight } from "lucide-vue-next";

const socketStore = useWebSocketStore();
const botStore = useBotStore();
const manageStore = useManageStore();
const contentRef = ref<HTMLElement | null>(null);
const globalStore = useGlobalStore();

// ==================== 方向感知的页面滑动 ====================
// 按侧边栏菜单顺序判断方向：目标在上方 → 新页从顶部滑入、旧页向下退场；
// 目标在下方则相反
const menuOrderMap = getMenuOrderMap();
const slideName = ref<"slide-from-top" | "slide-from-bottom">(
    "slide-from-bottom",
);

// 在导航确认前同步算好方向：过渡钩子保证读到的一定是本次导航的方向，
// 不会出现新页沿用上一次方向（方向看起来反了）的情况
const removeSlideDirectionGuard = router.beforeEach((to, from) => {
    const toOrder = menuOrderMap[to.meta.menuKey as string];
    const fromOrder = menuOrderMap[from.meta.menuKey as string];
    if (toOrder === undefined || fromOrder === undefined) return;
    slideName.value =
        toOrder < fromOrder ? "slide-from-top" : "slide-from-bottom";
});

// ==================== gsap 驱动的胶片式页面切换 ====================
// 不走 CSS 过渡（:css="false"）：整段动画由 gsap 逐帧驱动，结束判定
// 走补间回调，与 CSS 类的添加/移除时机、页面根上的内联样式彻底解耦，
// 不会出现方向偶发反向或直接瞬移的情况
const onPageEnter = (el: Element, done: () => void) => {
    gsap.killTweensOf(el);
    // 清掉上次退场留下的内联样式（absolute 定位 / pointer-events 等）：
    // 这些样式会跟着 KeepAlive 缓存一起回来，不清掉页面将无法滚动、
    // 无法点击（触摸/滚轮事件全部被 pointer-events: none 穿透）
    const style = (el as HTMLElement).style;
    style.position = "";
    style.top = "";
    style.left = "";
    style.width = "";
    style.pointerEvents = "";
    gsap.fromTo(
        el,
        { yPercent: slideName.value === "slide-from-top" ? -100 : 100 },
        {
            yPercent: 0,
            duration: 0.55,
            ease: "power4.out",
            onComplete: () => {
                gsap.set(el, { clearProps: "transform" });
                done();
            },
            // 被下一次导航打断时也要释放，否则 Transition 会一直等 done
            onInterrupt: () => done(),
        },
    );
};

const onPageLeave = (el: Element, done: () => void) => {
    gsap.killTweensOf(el);
    // 退场页绝对定位脱离文档流，与新页同屏叠放成胶片带
    const style = (el as HTMLElement).style;
    style.position = "absolute";
    style.top = "0";
    style.left = "0";
    style.width = "100%";
    style.pointerEvents = "none";
    gsap.to(el, {
        yPercent: slideName.value === "slide-from-top" ? 100 : -100,
        duration: 0.55,
        ease: "power4.out",
        onComplete: done,
        onInterrupt: () => done(),
    });
};

// WebSocket 消息处理
const handleStatusMessage = (data: any) => {
    // bot 上下线事件（真实协议端 / 调试模拟端接入或断开）：即时刷新 bot 列表，
    // 并联动刷新联系人——下线 bot 的好友/群列表可能变化，右侧需同步回到空状态
    if (data?.type === "bot_update") {
        botStore.getBotList().then(() => useChatStore().loadContacts());
        return;
    }
    // 收到新的好友/群请求：即时刷新请求列表（侧栏徽标数跟着变）
    if (data?.type === "request_update") {
        manageStore.loadRequestList();
        return;
    }
    // 好友/群组成员变化（审批通过、退群、踢人等）：刷新 bot 好友/群数量
    if (data?.type === "contacts_update") {
        botStore.getBotList().then(() => useChatStore().loadContacts());
        return;
    }
    // 主题变更广播：多端统一开启的端跟随新主题
    if (data?.type === "theme_update" && data.data) {
        useThemeStore().applyRemoteTheme(data.data);
        return;
    }
    // 系统状态推送：解包后存入 system_status 命名空间
    // （system store 监听此处实现卡片实时更新）
    if (data?.type === "status" && data.data) {
        socketStore.addMessage("system_status", data.data, true, 10);
        localStorage.setItem("system_status", JSON.stringify(data.data));
        return;
    }
    socketStore.addMessage("status", data, true, 10);
};

const handleStatusStateChange = (isOpen: boolean) => {
    if (!isOpen) console.log("系统状态 WebSocket 连接断开");
};

const handleLogMessage = (log: any) => {
    // console.log("收到日志消息:", log);
};

onMounted(async () => {
    document.documentElement.classList.add("bg-gray-100");

    // 多端统一：白屏揭开前先等云端主题落地（2s 兜底），避免首屏闪白
    const themeStore = useThemeStore();
    if (themeStore.syncEnabled) {
        await Promise.race([
            themeStore.syncFromBackend(),
            new Promise((resolve) => setTimeout(resolve, 2000)),
        ]);
    }

    whiteScreen.out();
    connectStatusWebSocket();
    onStatusMessage(handleStatusMessage);
    onConnectionStateChange(handleStatusStateChange);

    connectLogsWebSocket();
    onLogMessage(handleLogMessage);
});

onUnmounted(() => {
    document.documentElement.classList.remove("bg-gray-100");
    socketStore.socketManger.disconnectAll();

    disconnectStatusWebSocket();
    disconnectLogsWebSocket();
    removeSlideDirectionGuard();
});

const toggleNav = () => {
    // 移动端只有两态：抽屉全展开 / 全缩回，不参与 PC 的三段切换
    if (globalStore.isMobileMode) {
        globalStore.navHidden = !globalStore.navHidden;
        return;
    }

    // hidden -> 全还原
    if (globalStore.navHidden) {
        globalStore.navMini = false;
        globalStore.navHidden = false;
        return;
    }

    // 普通 -> mini
    if (!globalStore.navMini) {
        globalStore.navMini = true;
        return;
    }

    // mini -> hidden：保留 mini 宽度，避免收起动画闪回完整侧边栏
    globalStore.navHidden = true;
};
</script>

<template>
    <div
        class="flex h-screen w-full flex-col space-y-2 bg-gray-100 sm:space-y-4 sm:pt-4 sm:pl-4"
    >
        <HomeHeader />

        <div
            ref="contentRef"
            class="bottom relative flex min-h-0 flex-1 flex-col sm:flex-row"
        >
            <HomeSidebar ref="menuRef" />

            <div
                :class="
                    routeLoading
                        ? 'pointer-events-none opacity-45 blur-[1.5px]'
                        : ''
                "
                class="right relative flex h-full flex-1 flex-col px-2 pb-2 sm:px-4 sm:pb-4 transition-[opacity,filter] duration-200 ease-out"
            >
                <!-- 胶片带容器：overflow 裁掉上下页，位移时不会顶出滚动条 -->
                <div class="page-strip relative min-h-0 flex-1 overflow-hidden">
                    <router-view v-slot="{ Component }">
                        <Transition
                            :css="false"
                            @enter="onPageEnter"
                            @leave="onPageLeave"
                        >
                            <KeepAlive :max="8">
                                <component :is="Component" :key="$route.path" />
                            </KeepAlive>
                        </Transition>
                    </router-view>
                </div>
            </div>
        </div>
    </div>

    <div
        @click="toggleNav"
        :class="[
            'fixed top-1/2 left-0 z-[60] flex h-10 w-4 -translate-y-1/2 items-center justify-center',
            'rounded-r-full border border-l-0 border-slate-200 bg-white/80 shadow-sm backdrop-blur-sm transition-all duration-300',
            'hover:w-5 hover:bg-white hover:shadow-md active:scale-95 disabled:cursor-not-allowed disabled:opacity-50',
            // 按钮处于非活跃状态时的轻微透明感
        ]"
        class="cursor-pointer"
    >
        <div class="relative flex items-center justify-center">
            <ChevronRight
                v-if="globalStore.navHidden"
                class="h-4 w-4 text-slate-500 transition-all duration-300 group-hover:text-indigo-600"
            />
            <ChevronLeft
                v-else
                class="h-4 w-4 text-slate-500 transition-all duration-300 group-hover:text-indigo-600"
            />
        </div>
    </div>
</template>

<style scoped>
/* 胶片带容器：overflow 裁掉上下页，位移时不会顶出滚动条。
   页面进出场动画由 gsap 在 Transition 的 enter/leave 钩子里驱动 */
.page-strip {
    position: relative;
    overflow: hidden;
}

/* 页面高度锁定为胶片格高度，超长内容在页面内部滚动：
   这样位移量恒等于一个页高，胶片接缝始终对齐 */
.page-strip > :deep(*) {
    height: 100%;
    overflow-y: auto;
    overscroll-behavior: contain;
}
</style>
