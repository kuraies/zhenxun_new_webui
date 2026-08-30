<script setup lang="ts">
import {
    defineAsyncComponent,
    nextTick,
    onMounted,
    onUnmounted,
    ref,
    watch,
} from "vue";
import { gsap } from "gsap";
import { useGlobalStore } from "@/store/global";

const globalStore = useGlobalStore();
const Menu = defineAsyncComponent(() => import("@/views/sidebar/Sidebar.vue"));

const navRef = ref<HTMLElement | null>(null);
const overlayRef = ref<HTMLElement | null>(null);

let isModeSwitch = false;
let animationTl: gsap.core.Timeline | null = null;

const getNavWidth = () => {
    if (globalStore.navHidden) return 0;
    return globalStore.navMini ? 64 : 288; // 对应 w-15 和 w-72
};

const getNavWidthByState = (navMini: boolean, navHidden: boolean) => {
    if (navHidden) return 0;
    return navMini ? 64 : 288;
};

const lockDesktopWidth = (width: number) => {
    if (!navRef.value || globalStore.isMobileMode) return;
    const container = navRef.value.parentElement;
    if (!container) return;

    gsap.set([container, navRef.value], { width });
};

// ✅ 仅负责移动端判断（不再处理宽度）
const updateMobileMode = () => {
    const width = window.innerWidth;

    const newIsMobileMode = width < 640;
    const newIsTableMode = width >= 640 && width < 1024;

    if (newIsTableMode !== globalStore.isTableMode) {
        globalStore.isTableMode = newIsTableMode;

        // 平板模式自动 mini sidebar
        globalStore.navMini = newIsTableMode;
    }

    if (newIsMobileMode !== globalStore.isMobileMode) {
        isModeSwitch = true;
        globalStore.isMobileMode = newIsMobileMode;

        if (animationTl) {
            animationTl.kill();
            animationTl = null;
        }

        if (navRef.value) {
            navRef.value.style.transition = "none";

            // 清掉抽屉动画在容器/侧栏上留下的内联宽度：切回 PC 布局后
            // 容器是普通 flex 子项，残留的 width:0/60px 会让右侧区域
            // 不给侧边栏留位置，侧边栏被压在内容下面
            const container = navRef.value.parentElement;
            if (container) container.style.width = "";
            navRef.value.style.width = "";

            if (globalStore.isMobileMode) {
                // 手机端隐藏侧栏
                globalStore.navHidden = true;

                gsap.set(navRef.value, {
                    x: "-100%",
                    opacity: 0,
                });

                navRef.value.classList.add("hidden");

                if (overlayRef.value) {
                    gsap.set(overlayRef.value, { opacity: 0 });
                }
            } else {
                // 平板 / 桌面显示侧栏
                globalStore.navHidden = false;

                gsap.set(navRef.value, {
                    x: "0%",
                    opacity: 1,
                });

                navRef.value.classList.remove("hidden");
            }

            setTimeout(() => {
                if (navRef.value) {
                    navRef.value.style.transition = "";
                }

                isModeSwitch = false;
            }, 50);
        }
    }
};

// ✅ 侧边栏滑入/滑出（只用 transform）
const playNavAnimation = (show: boolean) => {
    if (!navRef.value) return;
    const container = navRef.value.parentElement;

    if (animationTl) animationTl.kill();
    gsap.killTweensOf([navRef.value, overlayRef.value, container]);

    if (show) navRef.value.classList.remove("hidden");

    animationTl = gsap.timeline({
        onComplete: () => {
            if (!show && navRef.value) navRef.value.classList.add("hidden");
            animationTl = null;
        },
    });

    // 移动端通常不需要动态改 container 宽度，因为它通常是 fixed 0 宽
    // 但为了严谨，我们重置它（移动端抽屉恒为全宽 288，不受 navMini 影响）
    gsap.set(container, {
        width: show ? (globalStore.isMobileMode ? 288 : globalStore.navMini ? 60 : 288) : 0,
    });

    animationTl.to(
        navRef.value,
        {
            x: show ? "0%" : "-100%",
            opacity: show ? 1 : 0,
            duration: 0.3,
            ease: "power2.inOut",
        },
        0,
    );

    if (globalStore.isMobileMode && overlayRef.value) {
        animationTl.to(
            overlayRef.value,
            { opacity: show ? 1 : 0, duration: 0.3 },
            0,
        );
    }
};

// ✅ 桌面端隐藏/显示（不再改 width）
const updateDesktopNav = (fromWidth?: number) => {
    if (!navRef.value || globalStore.isMobileMode) return;

    // 获取外层容器 (navRef 的父级)
    const container = navRef.value.parentElement;
    if (!container) return;

    if (animationTl) {
        animationTl.kill();
        animationTl = null;
    }
    gsap.killTweensOf([navRef.value, container]);

    const targetWidth = getNavWidth();
    const isShowing = !globalStore.navHidden;
    const shouldTweenNavWidth = fromWidth !== undefined && isShowing;

    if (fromWidth !== undefined) {
        gsap.set(container, { width: fromWidth });
        gsap.set(navRef.value, { width: isShowing ? fromWidth : 64 });
    }

    // 同步执行：外层管宽度，内层管位移和透明度
    animationTl = gsap.timeline({
        defaults: { duration: 0.4, ease: "power2.inOut" },
        onComplete: () => {
            if (navRef.value) navRef.value.style.width = "";
            container.style.width = "";
            animationTl = null;
        },
    });

    animationTl.to(
        container,
        {
            width: targetWidth,
        },
        0,
    );

    if (shouldTweenNavWidth) {
        animationTl.to(
            navRef.value,
            {
                width: targetWidth,
            },
            0,
        );
    }

    animationTl.to(
        navRef.value,
        {
            x: isShowing ? "0%" : "-100%",
            opacity: isShowing ? 1 : 0,
            onStart: () => {
                if (isShowing) navRef.value?.classList.remove("hidden");
            },
            onComplete: () => {
                if (!isShowing) navRef.value?.classList.add("hidden");
            },
        },
        0,
    );
};

// ✅ 桌面端统一监听状态，避免一次点击触发多段互相覆盖的动画
watch(
    () => [globalStore.navMini, globalStore.navHidden] as const,
    ([, navHidden], [oldNavMini, oldNavHidden]) => {
        if (isModeSwitch) return;

        const previousWidth = getNavWidthByState(oldNavMini, oldNavHidden);
        lockDesktopWidth(previousWidth);

        nextTick(() => {
            if (globalStore.isMobileMode) {
                if (navHidden !== oldNavHidden) {
                    playNavAnimation(!navHidden);
                }
                return;
            }

            updateDesktopNav(previousWidth);
        });
    },
);

// ✅ mini 模式（完全交给 Tailwind，不写 JS 动画）
// watch(
//     () => globalStore.navMini,
//     () => {
//         // ❌ 不需要 JS 控制 width
//         // Tailwind 自动生效
//     },
// );

onMounted(() => {
    updateMobileMode();
    window.addEventListener("resize", updateMobileMode);
});

onUnmounted(() => {
    window.removeEventListener("resize", updateMobileMode);

    if (animationTl) {
        animationTl.kill();
        animationTl = null;
    }
});
</script>

<template>
    <div
        :class="[
            globalStore.isMobileMode
                ? 'fixed top-0 left-0 z-40 h-full'
                : 'relative',
            // 移动端抽屉全高贴边，不保留 PC 的底部留白
            globalStore.isMobileMode ? '' : 'pb-4',
        ]"
    >
        <div
            ref="navRef"
            class="h-full"
            :class="[
                globalStore.isMobileMode
                    ? 'w-72'
                    : globalStore.navMini
                      ? 'w-16'
                      : 'w-72',
            ]"
        >
            <Menu />
        </div>
    </div>

    <div
        ref="overlayRef"
        v-if="globalStore.isMobileMode"
        v-show="!globalStore.navHidden"
        @click="globalStore.navHidden = true"
        class="glass-overlay-light glass-overlay-animate fixed inset-0 z-30"
    ></div>
</template>
