<script setup lang="ts">
import { Bell, Settings, Palette, Ellipsis } from "lucide-vue-next";
import { computed, ref } from "vue";
import { storeToRefs } from "pinia";
import { useThemeStore } from "@/store/theme";
import { useManageStore } from "@/store/manage.ts";
import { onClickOutside } from "@vueuse/core";
import { gsap } from "gsap";
import ThemeCustomizer from "./ThemeCustomizer.vue";
import RequestCenter from "./RequestCenter.vue";

const themeStore = useThemeStore();
const manageStore = useManageStore();
const { requestDialogOpen, friendRequests, groupRequests } =
    storeToRefs(manageStore);

// 铃铛徽标 = 当前 bot 的待处理请求总数
const messageCount = computed(
    () => friendRequests.value.length + groupRequests.value.length,
);

const showThemePanel = ref(false);
const themePanelRef = ref<HTMLElement | null>(null);

onClickOutside(themePanelRef, () => {
    showThemePanel.value = false;
});

// 移动端 / 平板端（lg 以下）：三个按钮收纳为一个展开菜单
const showCompactMenu = ref(false);
const compactThemeOpen = ref(false);
const compactRef = ref<HTMLElement | null>(null);
const requestWrapRef = ref<HTMLElement | null>(null);

onClickOutside(compactRef, () => {
    showCompactMenu.value = false;
    compactThemeOpen.value = false;
});

// 点铃铛容器以外的地方（含主题按钮/页面其他区域）时关闭请求面板；
// 点铃铛本身属于容器内部，交给 toggle 正常开合
onClickOutside(requestWrapRef, () => {
    requestDialogOpen.value = false;
});

const openRequestCenter = () => {
    requestDialogOpen.value = true;
    showCompactMenu.value = false;
    compactThemeOpen.value = false;
    showThemePanel.value = false;
};

// 主题面板进出场：与请求面板同款（gsap 驱动）
// 快速连点保护：杀旧补间 + 令牌保证最新钩子的 done 生效
const onDropdownEnter = (el: Element, done: () => void) => {
    gsap.killTweensOf(el);
    const state = el as Element & { _tipDone?: () => void };
    state._tipDone = done;
    gsap.fromTo(
        el,
        { autoAlpha: 0, y: -8, scale: 0.96 },
        {
            autoAlpha: 1,
            y: 0,
            scale: 1,
            duration: 0.18,
            ease: "power2.out",
            onComplete: () => state._tipDone?.(),
        },
    );
};

const onDropdownLeave = (el: Element, done: () => void) => {
    gsap.killTweensOf(el);
    const state = el as Element & { _tipDone?: () => void };
    state._tipDone = done;
    gsap.to(el, {
        autoAlpha: 0,
        y: -6,
        scale: 0.96,
        duration: 0.15,
        ease: "power2.in",
        onComplete: () => state._tipDone?.(),
    });
};

// 两个面板互斥：打开一个就显式关掉另一个
const toggleRequestPanel = () => {
    requestDialogOpen.value = !requestDialogOpen.value;
    showThemePanel.value = false;
};

const toggleThemePanel = () => {
    showThemePanel.value = !showThemePanel.value;
    requestDialogOpen.value = false;
};
</script>

<template>
    <div class="flex items-center space-x-1 sm:space-x-2">
        <!-- 桌面端：三个独立按钮 -->
        <div class="hidden items-center space-x-1 sm:space-x-2 lg:flex">
            <div ref="requestWrapRef" class="relative hidden lg:block">
                <button
                    class="bell-btn group relative flex h-8 w-8 cursor-pointer items-center justify-center rounded-full border border-[var(--zx-color-border)] bg-[var(--zx-color-surface)] shadow-sm backdrop-blur-md transition-all hover:scale-105 hover:shadow-md sm:h-9 sm:w-9"
                    title="请求处理"
                    @click="toggleRequestPanel"
                >
                    <Bell class="h-3.5 w-3.5 transition-colors sm:h-4 sm:w-4" :class="messageCount > 0 ? 'text-orange-500 bell-notify' : 'text-slate-600 group-hover:text-orange-500'" />
                    <span v-if="messageCount > 0" class="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-orange-500 text-[10px] font-bold leading-none text-white">{{ messageCount }}</span>
                </button>
                <RequestCenter variant="desktop" />
            </div>

            <div class="relative" ref="themePanelRef">
                <button
                    class="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full border border-[var(--zx-color-border)] bg-[var(--zx-color-surface)] shadow-sm backdrop-blur-md transition-all hover:scale-105 hover:shadow-md sm:h-9 sm:w-9"
                    title="主题选择"
                    @click="toggleThemePanel"
                >
                    <Palette class="h-3.5 w-3.5 text-slate-600 sm:h-4 sm:w-4" />
                </button>
                <Transition :css="false" @enter="onDropdownEnter" @leave="onDropdownLeave">
                    <div
                        v-if="showThemePanel"
                        class="absolute right-0 top-full mt-2 w-72 rounded-xl border border-[var(--zx-color-border)] bg-[var(--zx-color-surface)] p-3 shadow-lg"
                    >
                        <ThemeCustomizer @applied="showThemePanel = false" />
                    </div>
                </Transition>
            </div>

            <button
                class="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full border border-[var(--zx-color-border)] bg-[var(--zx-color-surface)] shadow-sm backdrop-blur-md transition-all hover:scale-105 hover:shadow-md sm:h-9 sm:w-9"
                title="设置"
            >
                <Settings class="h-3.5 w-3.5 text-slate-600 sm:h-4 sm:w-4" />
            </button>
        </div>

        <!-- 移动端 / 平板端：收纳为一个按钮，点开菜单 -->
        <div class="relative lg:hidden" ref="compactRef">
            <button
                class="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full border border-[var(--zx-color-border)] bg-[var(--zx-color-surface)] shadow-sm backdrop-blur-md transition-all hover:scale-105 hover:shadow-md sm:h-9 sm:w-9"
                title="更多"
                @click="showCompactMenu = !showCompactMenu"
            >
                <Ellipsis class="h-3.5 w-3.5 text-slate-600 sm:h-4 sm:w-4" />
                <span v-if="messageCount > 0" class="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-orange-500 text-[10px] font-bold leading-none text-white">{{ messageCount }}</span>
            </button>
            <Transition :css="false" @enter="onDropdownEnter" @leave="onDropdownLeave">
                <div
                    v-if="showCompactMenu"
                    class="absolute right-0 top-full z-20 mt-2 w-72 rounded-2xl border border-[var(--zx-color-border)] bg-[var(--zx-color-surface)] p-1.5 shadow-lg"
                >
                    <ThemeCustomizer
                        v-if="compactThemeOpen"
                        @applied="
                            compactThemeOpen = false;
                            showCompactMenu = false;
                        "
                    />
                    <template v-else>
                        <button
                            class="flex w-full cursor-pointer items-center gap-2.5 rounded-xl px-3 py-2 text-[var(--zx-color-text)] transition-colors hover:bg-[var(--zx-color-surface-muted)]"
                            type="button"
                            @click="openRequestCenter"
                        >
                            <Bell class="h-4 w-4 shrink-0 text-[var(--zx-color-text-muted)]" />
                            <span class="flex-1 text-left text-sm">请求处理</span>
                            <span
                                v-if="messageCount > 0"
                                class="flex h-5 min-w-5 items-center justify-center rounded-full bg-orange-500 px-1.5 text-[10px] font-bold leading-none text-white"
                            >{{ messageCount }}</span>
                        </button>
                        <button
                            class="flex w-full cursor-pointer items-center gap-2.5 rounded-xl px-3 py-2 text-[var(--zx-color-text)] transition-colors hover:bg-[var(--zx-color-surface-muted)]"
                            type="button"
                            @click="compactThemeOpen = true"
                        >
                            <Palette class="h-4 w-4 shrink-0 text-[var(--zx-color-text-muted)]" />
                            <span class="flex-1 text-left text-sm">主题选择</span>
                        </button>
                        <button
                            class="flex w-full cursor-pointer items-center gap-2.5 rounded-xl px-3 py-2 text-[var(--zx-color-text)] transition-colors hover:bg-[var(--zx-color-surface-muted)]"
                            type="button"
                        >
                            <Settings class="h-4 w-4 shrink-0 text-[var(--zx-color-text-muted)]" />
                            <span class="flex-1 text-left text-sm">设置</span>
                        </button>
                    </template>
                </div>
            </Transition>
            <RequestCenter variant="compact" />
        </div>
    </div>
</template>

<style scoped>
@keyframes bell-ring {
    0% { transform: rotate(0); }
    15% { transform: rotate(14deg); }
    30% { transform: rotate(-12deg); }
    45% { transform: rotate(10deg); }
    60% { transform: rotate(-8deg); }
    75% { transform: rotate(4deg); }
    90% { transform: rotate(-2deg); }
    100% { transform: rotate(0); }
}

.bell-btn:hover :deep(svg),
.bell-notify {
    animation: bell-ring 0.6s ease-in-out infinite;
    transform-origin: top center;
}
</style>
