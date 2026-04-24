<script setup lang="ts">
import { ZXMessageBox } from "@/components/index.js";
import { auth } from "@/utils/auth.ts";
import { router } from "@/router/index.js";
import { bottomMenus } from "@/config/menu";
import { useGlobalStore } from "@/store/global.ts";

const globalStore = useGlobalStore();

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
</script>

<template>
    <div
        :class="[
            'bottom group flex h-15 w-full cursor-pointer flex-col justify-center border-slate-200 bg-white duration-300 hover:bg-red-400 sm:rounded-full sm:border sm:shadow-sm',

            // 👉 mini 时去掉 padding 横向空间
            globalStore.navMini ? 'px-0' : 'px-4 pl-6',
        ]"
        @click="handleLogout"
    >
        <div
            :class="[
                'logout flex items-center rounded-full border-slate-300 p-1 text-sm duration-300',

                // 👉 关键：布局切换
                globalStore.navMini
                    ? 'justify-center' // 居中
                    : 'space-x-4', // 正常间距
            ]"
        >
            <!-- 图标 -->
            <div class="icon rounded-full text-red-400 group-hover:text-white">
                <component :is="bottomMenus[0].icon" class="sm:size-5" />
            </div>

            <!-- 文本 -->
            <div
                :class="[
                    'font-bold whitespace-nowrap text-red-400 transition-all duration-200 group-hover:text-white',

                    // 👉 mini 时完全隐藏
                    globalStore.navMini
                        ? 'w-0 overflow-hidden opacity-0'
                        : 'opacity-100',
                ]"
            >
                退出登录
            </div>
        </div>
    </div>
</template>
