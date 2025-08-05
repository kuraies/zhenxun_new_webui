<script setup>
import { defineAsyncComponent } from "vue";
import { gsap } from "gsap";

import { useWebSocketStore } from "@/store/websocket.js";
import { useGlobalStore } from "@/store/global.js";

import system_status from "@/utils/websocket/system_status.js";

import logs from "@/utils/websocket/logs.js";

const socketStore = useWebSocketStore();
const globalStore = useGlobalStore();

const Menu = defineAsyncComponent(() => import("@/views/menu/Menu.vue"));
const User = defineAsyncComponent(() => import("@/views/nav/User.vue"));
const Setting = defineAsyncComponent(() => import("@/views/nav/Setting.vue"));
const navRef = ref(null);


// 监听 navHidden 的变化，触发动画
watch(
    () => globalStore.navHidden,
    (newVal) => {
        if (newVal) {
            // 隐藏导航栏：向左移出
            navRef.value.classList.remove("duration-300");
            gsap.fromTo(
                navRef.value,
                {
                    x: "0%", opacity: 1
                }, // 初始位置：屏幕外右侧
                {
                    x: "-100%", opacity: 0, duration: 0.3, ease: "sine.inOut",
                    onStart: () => {
                        navRef.value.style.willChange = "transform, opacity"; // 开始动画前优化
                    },
                    onComplete: () => {
                        // 动画完成后添加 hidden 类
                        if (navRef.value) {
                            navRef.value.classList.add("hidden");
                        }
                    }
                }
            );
        } else {
            if (navRef.value) {
                navRef.value.classList.remove("hidden");

                gsap.fromTo(
                    navRef.value,
                    {
                        x: "-100%", opacity: 0
                    }, // 初始位置：屏幕外右侧
                    {
                        x: "0%", opacity: 1, duration: 0.2, ease: "sine.inOut"
                    }
                );
                navRef.value.classList.add("duration-300");
            }
            // 显示导航栏：向右移入

        }
    },
    { immediate: true } // 立即执行一次（确保初始状态正确）
);

onMounted(() => {
    document.documentElement.classList.add("bg-gray-100");
    system_status.init(socketStore);
    logs.init(socketStore);
    if (globalStore.navHidden) {
        gsap.set(navRef.value, { x: "-100%", opacity: 0 }); // 初始隐藏状态
    } else {
        gsap.set(navRef.value, { x: "0%", opacity: 1 }); // 初始显示状态
        navRef.value.classList.remove("hidden");
    }

});

onUnmounted(() => {
    document.documentElement.classList.remove("bg-gray-100");
    socketStore.socketManger.disconnectAll();

});
</script>

<template>
    <!--还没做呢-->
    <!--    <button type="button" @click="dd">点这个取消登录</button>-->
    <div class="flex flex-col h-screen space-y-4 bg-gray-100 p-4 py-6">
        <div class="top flex space-x-8">
            <User class="min-w-70"></User>
            <Setting></Setting>
        </div>
        <div class="bottom flex  min-h-125  space-x-8 flex-1">
            <div
                ref="navRef"
                :class="{'min-w-70': !globalStore.navMini,
                        'min-w-15': globalStore.navMini,
                        }"
                class="left-nav left flex h-full select-none @container duration-300 ease-in-out @max-sm:fixed"
            >

                <Menu></Menu>
            </div>
            <div class="right flex h-full flex-1 flex-col space-y-4 duration-300 ease-in-out">
                <router-view></router-view>
            </div>
        </div>

    </div>
</template>

<style scoped></style>
