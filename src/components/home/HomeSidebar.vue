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
    // 但为了严谨，我们重置它
    gsap.set(container, { width: show ? (globalStore.navMini ? 60 : 288) : 0 });

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
const updateDesktopNav = () => {
    if (!navRef.value || globalStore.isMobileMode) return;

    // 获取外层容器 (navRef 的父级)
    const container = navRef.value.parentElement;
    if (!container) return;

    gsap.killTweensOf([navRef.value, container]);

    const targetWidth = getNavWidth();
    const isShowing = !globalStore.navHidden;

    // 同步执行：外层管宽度，内层管位移和透明度
    const tl = gsap.timeline({
        defaults: { duration: 0.4, ease: "power2.inOut" },
    });

    tl.to(
        container,
        {
            width: targetWidth,
        },
        0,
    );

    tl.to(
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

// ✅ 关键：监听 Mini 模式切换也要触发动画同步
watch(
    () => globalStore.navMini,
    () => {
        if (!globalStore.isMobileMode) {
            updateDesktopNav();
        }
    },
);

// ✅ 监听隐藏/显示
watch(
    () => globalStore.navHidden,
    (newVal) => {
        if (isModeSwitch) return;
        nextTick(() => {
            globalStore.isMobileMode
                ? playNavAnimation(!newVal)
                : updateDesktopNav();
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
            'pb-4', // 必须加 overflow-hidden，否则宽度减小时内容会溢出
        ]"
    >
        <div
            ref="navRef"
            class="h-full"
            :class="[globalStore.navMini ? 'w-16' : 'w-72']"
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
