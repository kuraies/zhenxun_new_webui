<script setup lang="ts">
import { defineAsyncComponent, onMounted, onUnmounted, watch, ref, nextTick } from "vue";
import { gsap } from "gsap";
import { Menu as MenuIcon, X } from 'lucide-vue-next'

import { useWebSocketStore } from "@/store/websocket";
import { useGlobalStore } from "@/store/global";
import { useBreakpoint } from "@/composables/useBreakpoint";
import { connectStatusWebSocket, disconnectStatusWebSocket, onStatusMessage, onConnectionStateChange } from "@/utils/api-next/websocket-status";
import { connectLogsWebSocket, disconnectLogsWebSocket, onLogMessage } from "@/utils/api-next/websocket-logs";
import User from "@/components/User.vue";

// Flip 插件引用
let FlipPlugin: any = null

// 动态导入 Flip 插件
import('gsap/Flip').then(module => {
    FlipPlugin = module.Flip
    gsap.registerPlugin(FlipPlugin)
})

const socketStore = useWebSocketStore();
const globalStore = useGlobalStore();

const Menu = defineAsyncComponent(() => import("@/views/menu/Menu.vue"));
const navRef = ref<HTMLElement | null>(null);
const overlayRef = ref<HTMLElement | null>(null);
const contentRef = ref<HTMLElement | null>(null);

// 标记当前是否是模式切换过程中
let isModeSwitch = false;
let animationTl: gsap.core.Timeline | null = null; // GSAP 时间轴，用于管理复杂动画

// 断点变化处理 - 用于触发 FLIP 动画
const handleBreakpointChange = (from: string, to: string) => {
    if (!contentRef.value || globalStore.isMobileMode || !FlipPlugin) return

    // 获取内容区域内的所有卡片
    const cards = contentRef.value.querySelectorAll('.flip-card')
    if (cards.length === 0) return

    // 记录当前状态
    const state = FlipPlugin.getState(cards)

    // 等待 DOM 更新后播放 FLIP 动画
    nextTick(() => {
        FlipPlugin.from(state, {
            duration: 0.35,
            ease: 'power2.inOut',
            stagger: 0.025
        })
    })
}

// 使用断点 Hook
const { currentBreakpoint } = useBreakpoint(handleBreakpointChange)

// 根据屏幕尺寸计算侧边栏宽度
const getNavWidth = (isMini: boolean): string => {
    const width = window.innerWidth;
    if (isMini) {
        // 迷你模式：所有尺寸统一
        return '4.5rem';
    }
    // 展开模式：响应式宽度
    if (width < 1024) {
        return '11rem';  // lg 以下
    } else if (width < 1280) {
        return '15rem';  // lg 到 xl
    } else {
        return '18rem';  // xl 以上
    }
};

// 切换侧边栏显示状态（用户手动操作）
const toggleNav = () => {
    globalStore.navHidden = !globalStore.navHidden;
};

// 检查屏幕尺寸并更新模式
const updateMobileMode = () => {
    const newIsMobileMode = window.innerWidth < 640;

    // 仅在模式改变时处理
    if (newIsMobileMode !== globalStore.isMobileMode) {
        isModeSwitch = true;
        globalStore.isMobileMode = newIsMobileMode;

        // 取消之前的动画
        if (animationTl) {
            animationTl.kill();
            animationTl = null;
        }

        if (navRef.value) {
            // 禁用过渡动画
            navRef.value.style.transition = 'none';
            navRef.value.style.willChange = 'auto';

            if (globalStore.isMobileMode) {
                // 切换到移动模式：隐藏侧边栏
                globalStore.navHidden = true;
                gsap.set(navRef.value, { x: "-100%", opacity: 0, width: getNavWidth(false) });
                navRef.value.classList.add("hidden");
                if (overlayRef.value) {
                    gsap.set(overlayRef.value, { opacity: 0 });
                }
            } else {
                // 切换到桌面模式：显示侧边栏（并排）
                globalStore.navHidden = false;
                const targetWidth = getNavWidth(globalStore.navMini);
                gsap.set(navRef.value, { x: "0%", opacity: 1, width: targetWidth });
                navRef.value.classList.remove("hidden");
            }

            // 恢复过渡效果
            setTimeout(() => {
                if (navRef.value) {
                    navRef.value.style.transition = '';
                    navRef.value.style.willChange = 'auto';
                }
                isModeSwitch = false;
            }, 50);
        }
    } else if (!newIsMobileMode && navRef.value && !isModeSwitch) {
        // 桌面模式下，确保宽度正确（防止刷新后宽度丢失）
        const targetWidth = globalStore.navHidden ? '0rem' : getNavWidth(globalStore.navMini);
        gsap.set(navRef.value, { width: targetWidth });
    }
};

// 播放侧边栏滑入/滑出动画（仅移动模式）
const playNavAnimation = (show: boolean) => {
    if (!navRef.value) return;

    // 终止之前的动画，确保状态正确
    if (animationTl) {
        animationTl.kill();
        animationTl = null;
    }
    gsap.killTweensOf(navRef.value);
    if (overlayRef.value) {
        gsap.killTweensOf(overlayRef.value);
    }

    // 先移除 hidden 类（如果需要显示）
    if (show && navRef.value.classList.contains("hidden")) {
        navRef.value.classList.remove("hidden");
    }

    // 设置初始状态 - 使用 forceInit 确保状态正确
    gsap.set(navRef.value, {
        willChange: "transform, opacity",
        x: show ? "-100%" : "0%",
        opacity: show ? 0 : 1
    });

    // 创建时间轴
    animationTl = gsap.timeline({
        onComplete: () => {
            if (!show && navRef.value) {
                navRef.value.classList.add("hidden");
            }
            if (navRef.value) {
                navRef.value.style.willChange = 'auto';
            }
            animationTl = null;
        }
    });

    // 侧边栏动画 - 使用 to 从设置的初始状态动画到目标状态
    animationTl.to(navRef.value, {
        x: show ? "0%" : "-100%",
        opacity: show ? 1 : 0,
        duration: 0.3,
        ease: "power2.inOut"
    }, 0);

    // 遮罩层动画（仅移动模式）
    if (globalStore.isMobileMode && overlayRef.value) {
        animationTl.to(overlayRef.value, {
            opacity: show ? 1 : 0,
            duration: 0.3
        }, 0);
    }
};

// 桌面模式下更新侧边栏宽度
const updateDesktopNavWidth = () => {
    if (!navRef.value || globalStore.isMobileMode) return;

    // 清除之前的宽度动画，确保状态正确
    gsap.killTweensOf(navRef.value);

    // 桌面模式下，根据 navHidden 和 navMini 状态更新宽度
    if (globalStore.navHidden) {
        // 隐藏侧边栏：宽度设为 0
        gsap.to(navRef.value, {
            width: 0,
            duration: 0.3,
            ease: "power2.inOut"
        });
    } else {
        // 显示侧边栏
        const targetWidth = getNavWidth(globalStore.navMini);
        gsap.to(navRef.value, {
            width: targetWidth,
            duration: 0.3,
            ease: "power2.inOut"
        });
    }
};

// 监听 navHidden 的变化，触发动画（仅用户手动切换时）
watch(
    () => globalStore.navHidden,
    (newVal, oldVal) => {
        // 如果是模式切换过程中或初始化，跳过
        if (isModeSwitch || oldVal === undefined) {
            return;
        }

        // 等待下一帧确保 DOM 已更新
        nextTick(() => {
            if (globalStore.isMobileMode) {
                // 移动模式：播放滑入/滑出动画
                playNavAnimation(!newVal);
            } else {
                // 桌面模式：更新宽度
                updateDesktopNavWidth();
            }
        });
    }
);

// 监听 navMini 的变化，使用 FLIP 动画更新内容区域
watch(
    () => globalStore.navMini,
    (newVal, oldVal) => {
        if (globalStore.isMobileMode || globalStore.navHidden) return
        if (oldVal === undefined) return // 初始化时跳过

        // 更新侧边栏宽度
        updateDesktopNavWidth()

        // 对内容区域内的卡片执行 FLIP 动画
        if (contentRef.value && FlipPlugin) {
            const cards = contentRef.value.querySelectorAll('.flip-card')
            if (cards.length > 0) {
                // 记录当前状态
                const state = FlipPlugin.getState(cards)

                // 等待布局变化完成后播放动画
                nextTick(() => {
                    FlipPlugin.from(state, {
                        duration: 0.35,
                        ease: 'power2.inOut',
                        stagger: 0.025
                    })
                })
            }
        }
    }
);

// 桌面模式下窗口大小变化时更新侧边栏宽度
const handleResize = () => {
    if (!globalStore.isMobileMode && !globalStore.navHidden && navRef.value) {
        const targetWidth = getNavWidth(globalStore.navMini);
        gsap.to(navRef.value, {
            width: targetWidth,
            duration: 0.2,
            ease: "power2.out"
        });
    }
};

// 页面切换动画 - 进入
const onPageEnter = (el: Element, done: () => void) => {
    const element = el as HTMLElement;
    gsap.fromTo(element,
        { opacity: 0, y: 12 },
        {
            opacity: 1,
            y: 0,
            duration: 0.35,
            ease: "power2.out",
            onComplete: done
        }
    );
};

// 页面切换动画 - 离开
const onPageLeave = (el: Element, done: () => void) => {
    const element = el as HTMLElement;
    gsap.to(element, {
        opacity: 0,
        y: -8,
        duration: 0.25,
        ease: "power2.in",
        onComplete: done
    });
};

// 处理系统状态消息
const handleStatusMessage = (data: any) => {
    socketStore.addMessage('status', data, true, 10);
    localStorage.setItem("system_status", JSON.stringify(data));
};

// 处理系统状态连接状态变化
const handleStatusStateChange = (isOpen: boolean) => {
    if (!isOpen) {
        console.log('系统状态 WebSocket 连接断开');
    }
};

// 处理日志消息
const handleLogMessage = (log: any) => {
    // 日志消息已在 websocket-logs.ts 中处理
    console.log('收到日志消息:', log);
};

onMounted(() => {
    document.documentElement.classList.add("bg-gray-100");

    // 初始化 WebSocket 连接
    connectStatusWebSocket();
    onStatusMessage(handleStatusMessage);
    onConnectionStateChange(handleStatusStateChange);

    connectLogsWebSocket();
    onLogMessage(handleLogMessage);

    // 初始化时检查屏幕大小
    updateMobileMode();

    // 监听窗口大小变化
    window.addEventListener('resize', updateMobileMode);
    window.addEventListener('resize', handleResize);
});

onUnmounted(() => {
    document.documentElement.classList.remove("bg-gray-100");
    socketStore.socketManger.disconnectAll();
    window.removeEventListener('resize', updateMobileMode);
    window.removeEventListener('resize', handleResize);

    // 断开 WebSocket 连接
    disconnectStatusWebSocket();
    disconnectLogsWebSocket();

    if (animationTl) {
        animationTl.kill();
        animationTl = null;
    }
});
</script>

<template>
    <div class="flex flex-col h-screen space-y-2 sm:space-y-4 bg-gray-100 p-2 sm:p-4 sm:py-6">
        <!-- 顶部栏：小屏幕下垂直排列 -->
        <div class="top flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-4 lg:space-x-8 flex-shrink-0 relative z-10">
            <div class="flex items-center gap-2 w-full sm:w-auto">
                <!-- 侧边栏切换按钮 -->
                <button
                    @click="toggleNav"
                    class="p-2 bg-white rounded-2xl shadow-sm outline-1 outline-slate-200 hover:bg-gray-50 transition-all duration-200 btn-touch flex-shrink-0 active:scale-95"
                >
                    <MenuIcon v-if="globalStore.navHidden" class="w-5 h-5 text-gray-600" />
                    <X v-else class="w-5 h-5 text-gray-600" />
                </button>
                <User class="min-w-0 flex-1"></User>
            </div>
        </div>
        <!-- 底部内容区 -->
        <div ref="contentRef" class="bottom flex min-h-0 flex-1 flex-col sm:flex-row sm:space-x-3 lg:space-x-4 xl:space-x-6 relative">
            <!-- 侧边栏 -->
            <div
                ref="navRef"
                class="left-nav select-none @container z-[35] sm:z-auto
                       absolute sm:relative
                       left-0 top-0 bottom-0 sm:left-auto sm:top-auto sm:bottom-auto
                       overflow-hidden"
            >
                <Menu></Menu>
            </div>

            <!-- 遮罩层（仅小屏幕模式且侧边栏显示时显示） -->
            <div
                ref="overlayRef"
                v-if="globalStore.isMobileMode"
                v-show="!globalStore.navHidden"
                @click="globalStore.navHidden = true"
                class="absolute inset-0 glass-overlay-light glass-overlay-animate z-30 sm:hidden pointer-events-auto"
            ></div>

            <!-- 右侧内容区 - 自动占满剩余空间 -->
            <div class="right flex h-full flex-1 flex-col space-y-3 sm:space-y-4 min-w-0 relative z-10">
                <router-view v-slot="{ Component }">
                    <transition
                        mode="out-in"
                        @enter="onPageEnter"
                        @leave="onPageLeave"
                    >
                        <component :is="Component" :key="$route.path" />
                    </transition>
                </router-view>
            </div>
        </div>

    </div>
</template>

<style scoped></style>
