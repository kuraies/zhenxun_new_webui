<script setup lang="ts">
import { ref, onMounted, watch } from "vue";
import { gsap } from "gsap";
import { useRoute } from "vue-router";
import { ChevronRight } from "lucide-vue-next";

import { useGlobalStore } from "@/store/global.js";
import { auth } from "@/utils/auth.ts";
import { router } from "@/router/index.js";
import { ZXMessageBox } from "@/components/index.js";
import type { MenuItem } from "@/config/menu";
import { mainMenus, bottomMenus } from "@/config/menu";

import logo from "@/assets/img/title.png";

const route = useRoute();
const globalStore = useGlobalStore();

// 选中的菜单 key
const activeMenuKey = ref<string>("dashboard");

// 动画相关引用
const breathElement = ref<HTMLElement | null>(null);
const arrow_right = ref<HTMLElement | null>(null);
let breathAnimation: gsap.core.Animation | null = null;
let rightAnimation: gsap.core.Animation | null = null;

// 退出登录
const handleLogout = () => {
    ZXMessageBox({
        title: "退出登录",
        message: "你是否要退出登录",
        cancelButtonText: "取消",
        onConfirm: () => {
            auth.logout();
            router.push({ name: "Login" });
        },
    });
};

// 开始呼吸动画
const startBreathAnimation = (el: HTMLElement, menuKey: string) => {
    // 如果已经有选中的菜单，先停止它的动画
    if (activeMenuKey.value) {
        stopBreathAnimation();
    }

    // 设置新的选中菜单
    activeMenuKey.value = menuKey;

    breathElement.value = el.querySelector(".icon");
    arrow_right.value = el.querySelector(".arrow-right");

    if (!breathElement.value || !arrow_right.value) return;

    // 创建呼吸效果：缩放 + 透明度变化
    breathAnimation = gsap.fromTo(
        breathElement.value,
        { scale: 0.85 },
        {
            scale: 1.15,
            duration: 1.5,
            yoyo: true,
            repeat: -1,
            ease: "sine.inOut",
        },
    );

    rightAnimation = gsap.fromTo(
        arrow_right.value,
        { x: -5 },
        {
            x: 5,
            duration: 1,
            yoyo: true,
            repeat: -1,
            ease: "sine.inOut",
        },
    );
};

// 停止呼吸动画
const stopBreathAnimation = () => {
    if (breathAnimation) {
        breathAnimation.kill();
        if (breathElement.value) {
            gsap.to(breathElement.value, {
                scale: 1,
                duration: 0.2,
                ease: "back.out(1.7)",
            });
        }
    }
    if (rightAnimation) {
        rightAnimation.kill();
        if (arrow_right.value) {
            gsap.to(arrow_right.value, {
                x: 0,
                duration: 0.2,
            });
        }
    }
};

// 导航到指定菜单
const navigateTo = (item: MenuItem) => {
    if (item.key === "logout") {
        handleLogout();
        return;
    }
    startBreathAnimation(
        document.querySelector(`[data-key="${item.key}"]`) as HTMLElement,
        item.key,
    );
    if (item.path) {
        router.push(item.path);
    }
};

// 监听路由变化，自动选中对应菜单
watch(
    () => route.meta.menuKey,
    (newKey) => {
        if (newKey) {
            activeMenuKey.value = newKey as string;
            const menuItem = document.querySelector(
                `.menus-item[data-key="${newKey}"]`,
            );
            if (menuItem) {
                // 更新动画元素引用
                breathElement.value = menuItem.querySelector(
                    ".icon",
                ) as HTMLElement | null;
                arrow_right.value = menuItem.querySelector(
                    ".arrow-right",
                ) as HTMLElement | null;
            }
        }
    },
    { immediate: true },
);

onMounted(() => {
    // 初始化时根据当前路由选中对应菜单
    const currentMenuKey = (route.meta.menuKey as string) || "dashboard";
    const currentMenu = document.querySelector(
        `.menus-item[data-key="${currentMenuKey}"]`,
    );
    if (currentMenu) {
        startBreathAnimation(currentMenu as HTMLElement, currentMenuKey);
    }
});
</script>

<template>
    <div class="flex h-full w-full flex-col items-center sm:space-y-4">
        <!-- 菜单容器 - 改进响应式和触摸反馈 -->
        <div
            class="top mx-4 flex w-full flex-1 flex-col items-center overflow-y-auto bg-white py-3 shadow-sm outline-1 outline-slate-200 transition-all duration-300 sm:mx-3 sm:space-y-4 sm:rounded-4xl sm:py-8"
        >
            <!-- Logo 区域 -->
            <div
                class="logo flex flex-shrink-0 items-center justify-center duration-200 ease-in-out"
                :class="{
                    hidden: globalStore.navMini,
                    'w-full px-2 sm:px-4': !globalStore.navMini,
                }"
            >
                <img
                    :src="logo"
                    alt="Logo"
                    class="max-w-full object-contain sm:h-25"
                />
            </div>

            <!-- 菜单列表 -->
            <div
                class="menus relative w-full space-y-4 overflow-x-hidden overflow-y-auto p-4 text-sm @max-3xs:px-1"
                :class="{
                    'no-scrollbar px-1': globalStore.navMini,
                }"
            >
                <div
                    v-for="item in mainMenus"
                    :key="item.key"
                    :data-key="item.key"
                    class="menus-item group flex h-14 w-full cursor-pointer items-center rounded-full p-1 outline-slate-300 transition-[padding] duration-300 ease-in-out hover:shadow-sm"
                    :class="{
                        'scale-105 shadow-sm outline-1 outline-slate-300':
                            activeMenuKey === item.key,
                        'hover:scale-110 hover:outline-1':
                            activeMenuKey !== item.key,
                        'translate-x-0.5 space-x-0! p-0! shadow-none! outline-none!':
                            globalStore.navMini,
                    }"
                    @click="navigateTo(item)"
                    @mouseenter="
                        !activeMenuKey &&
                        startBreathAnimation(
                            $event.currentTarget as HTMLElement,
                            item.key,
                        )
                    "
                    @mouseleave="!activeMenuKey && stopBreathAnimation()"
                >
                    <div
                        :class="{
                            'bg-black text-white': activeMenuKey === item.key,
                        }"
                        class="icon flex items-center justify-center rounded-full bg-[#f0f1f6] p-3.5 group-hover:bg-black group-hover:text-white"
                    >
                        <component :is="item.icon" class="h-5 w-5" />
                    </div>

                    <!-- 文字和箭头 -->
                    <div
                        class="right flex min-w-0 flex-1 items-center pl-1.5 sm:pl-2"
                        :class="{
                            hidden: globalStore.navMini,
                        }"
                    >
                        <span class="whitespace-nowrap group-hover:text-right">
                            {{ item.name }}
                        </span>
                        <div
                            ref="arrow_right"
                            :class="{
                                flex: activeMenuKey === item.key,
                                hidden: activeMenuKey !== item.key,
                            }"
                            class="arrow-right flex-1 justify-end pr-4"
                        >
                            <ChevronRight
                                class="h-3 w-3 text-slate-400 sm:h-4 sm:w-4"
                            />
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- 退出登录按钮 - 改进动效 -->
        <div
            class="bottom group flex h-15 w-full cursor-pointer flex-col justify-center space-y-4 sm:rounded-full bg-white px-4 pl-6 sm:shadow-sm sm:outline-1 outline-slate-200 duration-300 hover:bg-red-400 @max-3xs:p-4"
        >
            <div
                class="logout flex items-center space-x-4 rounded-full p-1 text-sm outline-slate-300 duration-300"
                @click="handleLogout"
            >
                <div
                    class="icon rounded-full text-red-400 group-hover:text-white"
                >
                    <component :is="bottomMenus[0].icon" class="sm:size-5" />
                </div>
                <div
                    class="text font-bold text-red-400 group-hover:text-white @max-3xs:hidden"
                >
                    退出登录
                </div>
            </div>
        </div>
    </div>
</template>

<style scoped>
.no-scrollbar {
    -ms-overflow-style: none;
    scrollbar-width: none;
}

.no-scrollbar::-webkit-scrollbar {
    display: none;
}
</style>