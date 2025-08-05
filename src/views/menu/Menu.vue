<script setup>
import {
    LayoutPanelLeft,
    Monitor,
    Blocks,
    Package,
    MessageSquareMore,
    ChartBar,
    Folder,
    Database,
    Info,
    ChevronRight,
    SlidersHorizontal,
    LogOut
} from "lucide-vue-next";

import { gsap } from "gsap";

import { useRoute } from "vue-router";
import {useGlobalStore} from "@/store/global.js";

// 在 setup 中添加
const route = useRoute();
import { auth } from "@/utils/auth.js";
import { router } from "@/router/index.js";
import { ZXMessageBox } from "components";

/*
图片导入区
 */
import logo from "@/assets/img/title.png";
/*
图片导入区结束
 */

const globalStore = useGlobalStore();

const menus = ref([
    {
        name: "首页",
        key: "dashboard", // 新增英文标识符
        icon: LayoutPanelLeft
    },
    {
        name: "控制台",
        key: "command",
        icon: Monitor
    },
    {
        name: "插件列表",
        key: "plugin",
        icon: Blocks
    },
    {
        name: "插件市场",
        key: "store",
        icon: Package
    },
    {
        name: "聊天",
        key: "chat",
        icon: MessageSquareMore
    },
    {
        name: "数据统计",
        key: "analytics",
        icon: ChartBar
    },
    {
        name: "文件",
        key: "files",
        icon: Folder
    },
    {
        name: "数据库",
        key: "database",
        icon: Database
    },
    {
        name: "关于",
        key: "about",
        icon: Info
    }
]);

function logout() {
    ZXMessageBox({
        title: "退出登录",
        message: "你是否要退出登录",
        cancelButtonText: "取消",
        onConfirm: () => {
            auth.logout();
            router.push({ name: "Login" });
        }
    });
}

// 修改为使用 key 作为选中标识
const activeMenuKey = ref("dashboard");

const breathElement = ref(null);
const arrow_right = ref(null);
let breathAnimation = null;
let rightAnimation = null;

const startBreathAnimation = (el, menuKey) => {
    // 如果已经有选中的菜单，先停止它的动画
    if (activeMenuKey.value) {
        stopBreathAnimation();
    }

    // 设置新的选中菜单
    activeMenuKey.value = menuKey;

    breathElement.value = el.querySelector(".icon");
    arrow_right.value = el.querySelector(".arrow-right");

    // 创建呼吸效果：缩放 + 透明度变化
    breathAnimation = gsap.fromTo(
        breathElement.value,
        { scale: 0.8 }, // 起始状态
        {
            scale: 1.2, // 结束状态
            duration: 1.5,
            yoyo: true, // 往返动画
            repeat: -1, // 无限循环
            ease: "sine.inOut"
        }
    );

    rightAnimation = gsap.fromTo(
        arrow_right.value,
        { x: -5 }, // 起始状态
        {
            x: 5, // 结束状态
            duration: 1,
            yoyo: true, // 往返动画
            repeat: -1, // 无限循环
            ease: "sine.inOut"
        }
    );
};

const stopBreathAnimation = () => {
    if (breathAnimation) {
        breathAnimation.kill();
        // 恢复初始状态
        gsap.to(breathElement.value, {
            scale: 1,
            duration: 0
        });
    }
    if (rightAnimation) {
        rightAnimation.kill();
        gsap.to(arrow_right.value, {
            x: 0,
            duration: 0
        });
    }
};

watch(
    () => route.meta.menuKey,
    (newKey) => {
        if (newKey) {
            // 找到对应的菜单元素
            const menuItem = document.querySelector(
                `.menus-item[data-key="${newKey}"]`
            );
            if (menuItem) {
                startBreathAnimation(menuItem, newKey);
            }
        }
    },
    { immediate: true }
);

// // 初始化时选中首页
// onMounted(() => {
//     // 模拟点击首页菜单
//     const homeMenu = document.querySelector('.menus-item:first-child')
//     if (homeMenu) {
//         startBreathAnimation(homeMenu, 'dashboard')
//     }
// })
</script>

<template>
    <div class="flex w-full flex-col items-center space-y-4">
        <div
            class="top mx-4 flex w-full flex-1 flex-col items-center space-y-4 overflow-y-auto rounded-4xl bg-white py-8 shadow-sm outline-1 outline-slate-200 "
        >
            <div class="logo duration-200 ease-in-out"
            :class="{
                'hidden':globalStore.navMini
            }"
            >
                <img :src="logo" alt="" class="h-25" />
            </div>
            <div
                class="menus relative w-full space-y-4 overflow-y-auto overflow-x-hidden p-4 text-sm @max-3xs:px-1"
                :class="{
                'px-1 no-scrollbar':globalStore.navMini
                }"
            >
                <div
                    v-for="(item, index) in menus"
                    :key="index"
                    :class="{
                        'scale-105 shadow-sm outline-1 outline-slate-300':
                            activeMenuKey === item.key,
                        'hover:scale-110 hover:outline-1':
                            activeMenuKey !== item.key,
                            'space-x-0! outline-none! shadow-none! p-0! translate-x-0.5': globalStore.navMini
                    }"
                    class="menus-item group flex h-14 w-full cursor-pointer items-center space-x-4 rounded-full p-1 outline-slate-300 transition-[padding] duration-300 ease-in-out
                     hover:shadow-sm
                    "

                    @click="
                        startBreathAnimation($event.currentTarget, item.key);
                        router.push({ path: item.key })
                    "
                    @mouseenter="
                        !activeMenuKey &&
                        startBreathAnimation($event.currentTarget, item.key)
                    "
                    @mouseleave="!activeMenuKey && stopBreathAnimation()"
                >
                    <div
                        :class="{
                            'bg-black text-white': activeMenuKey === item.key,
                        }"
                        class="icon flex p-3.5 items-center justify-center rounded-full transition duration-200 group-hover:bg-black group-hover:text-white"
                    >
                        <component :is="item.icon" class="h-5 w-5"></component>
                    </div>
                    <div class="right flex items-center text-nowrap flex-1"
                        :class="{
                        'hidden': globalStore.navMini
                        }">
                        <div class="group-hover:text-right">
                            {{ item.name }}
                        </div>
                        <div
                            ref="arrow_right"
                            :class="{
                            flex: activeMenuKey === item.key,
                            hidden: activeMenuKey !== item.key,
                        }"
                            class="arrow-right flex-1 justify-end pr-4"
                        >
                            <ChevronRight
                                class="h-4 w-4 text-gray-500"
                            ></ChevronRight>
                        </div>
                    </div>
                </div>
            </div>
        </div>
        <div
            class="bottom flex h-15 w-full flex-col  group justify-center bg-white hover:bg-red-400 duration-300 space-y-4 px-4 pl-6 rounded-full  shadow-sm  cursor-pointer outline-1 outline-slate-200 @max-3xs:p-4"
        >
            <div class="logout flex items-center outline-slate-300 rounded-full  space-x-4  p-1  text-sm  duration-300"
                 @click="logout">
                <div class="icon rounded-full text-red-400 group-hover:text-white ">
                    <LogOut class="size-5"></LogOut>
                </div>
                <div class="text text-red-400 font-bold group-hover:text-white @max-3xs:hidden">
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