<script lang="ts" setup>
import { computed } from "vue";
import { ZXMessageBox, ZXNotification } from "@/components";
import { systemApi } from "@/utils/api-next";

import avatar from "@/assets/img/avatar.jpg";
import { useBotStore } from "@/store/bot.ts";
import { Power } from "lucide-vue-next";

const botStore = useBotStore();

const avatarUrl = computed(() => {
    return botStore.selectedBot?.ava_url || avatar;
});

const handleRestart = async () => {
    // 使用统一的确认对话框
    const confirmed = await ZXMessageBox({
        title: "重启 Bot",
        message: "确定要重启 Bot 吗？重启后需要等待一段时间才能重新连接。",
        confirmButtonText: "重启",
        confirmButtonHoverText: "确认重启",
        cancelButtonText: "取消",
    });

    if (!confirmed) {
        return;
    }

    try {
        const res = await systemApi.restartBot();
        if (res?.success) {
            ZXNotification({
                title: "重启成功",
                message: "Bot 正在重启中，请稍后刷新页面...",
                type: "✅",
                position: "top-right",
                duration: 3000,
            });
        } else {
            ZXNotification({
                title: "重启失败",
                message: res?.message || "重启失败，请稍后重试",
                type: "❌",
                position: "top-right",
            });
        }
    } catch (error: any) {
        console.error("重启 Bot 失败:", error);
        ZXNotification({
            title: "呜呼～",
            message: "重启失败 (っ °Д °;) っ",
            type: "😭",
            position: "top-right",
        });
    }
};
</script>

<template>
    <div
        class="relative overflow-hidden rounded-4xl border border-slate-200 bg-white px-8 py-6 shadow-sm select-none"
    >
        <img
            :src="avatarUrl"
            class="absolute inset-0 h-full w-full scale-110 transform-gpu object-cover blur-md will-change-transform"
            alt=""
        />
        <div class="absolute -inset-2 bg-black/20"></div>

        <div class="relative z-10 flex h-full w-full flex-col justify-between">
            <div
                class="flex w-full items-center justify-center space-x-2 sm:space-x-4"
            >
                <div class="flex min-w-0 flex-1 flex-col pt-4">
                    <div class="flex items-center space-x-2">
                        <h2
                            class="truncate text-base font-bold text-white sm:text-3xl"
                        >
                            {{ botStore.selectedBot?.nickname }}
                        </h2>
                        <div
                            class="relative flex h-2 w-2 shrink-0 sm:h-2.5 sm:w-2.5"
                        >
                            <span
                                v-if="botStore.isOnline"
                                class="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-500 opacity-60"
                            ></span>

                            <span
                                :class="
                                    botStore.isOnline
                                        ? 'bg-green-500'
                                        : 'bg-gray-400'
                                "
                                class="relative inline-flex h-full w-full rounded-full transition-colors duration-300"
                            ></span>
                        </div>
                    </div>
                    <div
                        class="mt-1 flex flex-wrap items-center gap-1.5 text-white sm:mt-2"
                    >
                        <span class="flex items-center space-x-1">
                            <span class="truncate">{{
                                botStore.selectedBot?.self_id
                            }}</span>
                        </span>
                    </div>
                </div>

                <!--                头像-->
                <div
                    class="flex shrink-0 items-center justify-center overflow-hidden"
                >
                    <!--                        <Bot class="h-5 w-5 text-blue-600 sm:h-10 sm:w-10" />-->
                    <img :src="avatarUrl" alt="" class="size-24 rounded-full" />
                </div>
            </div>
            <div class="-mt-3 flex gap-10 text-white">
                <div class="num flex flex-col gap-0.5">
                    <span class="text-xs">好友</span>
                    <span
                        class="xs text-3xl font-black tracking-widest"
                        v-odometer="botStore.selectedBot?.friend_count"
                    ></span>
                </div>
                <div class="num flex flex-col gap-0.5">
                    <span class="text-xs">群组</span>
                    <span
                        class="xs text-3xl font-black tracking-widest"
                        v-odometer="botStore.selectedBot?.group_count"
                    ></span>
                </div>
            </div>
            <div class="flex justify-between space-x-2 font-bold">
                <div
                    class="flex h-8 items-center justify-center rounded-full bg-white px-4 py-1 pl-3"
                >
                    <svg
                        class="icon h-6 w-6"
                        viewBox="0 0 1024 1024"
                        version="1.1"
                        xmlns="http://www.w3.org/2000/svg"
                    >
                        <path
                            d="M824.8 613.2c-16-51.4-34.4-94.6-62.7-165.3C766.5 262.2 689.3 112 511.5 112 331.7 112 256.2 265.2 261 447.9c-28.4 70.8-46.7 113.7-62.7 165.3-34 109.5-23 154.8-14.6 155.8 18 2.2 70.1-82.4 70.1-82.4 0 49 25.2 112.9 79.8 159-26.4 8.1-85.7 29.9-71.6 53.8 11.4 19.3 196.2 12.3 249.5 6.3 53.3 6 238.1 13 249.5-6.3 14.1-23.8-45.3-45.7-71.6-53.8 54.6-46.2 79.8-110.1 79.8-159 0 0 52.1 84.6 70.1 82.4 8.5-1.1 19.5-46.4-14.5-155.8z"
                        ></path>
                    </svg>
                    <span class=""> QQ </span>
                </div>
                <div>
                    <button
                        class="btn-touch group shrink-0 cursor-pointer rounded-full bg-white p-2 hover:bg-red-600"
                        title="重启 Bot"
                        @click="handleRestart"
                    >
                        <Power
                            class="h-5 w-5 text-red-600 group-hover:text-white"
                        />
                    </button>
                </div>
            </div>
        </div>

        <!--            <div-->
        <!--                class="flex w-full items-center justify-end space-x-2 sm:w-auto sm:space-x-3"-->
        <!--            >-->
        <!--                <button-->
        <!--                    class="btn-touch shrink-0 rounded-2xl bg-red-100 p-2 transition-colors hover:bg-red-200"-->
        <!--                    title="重启 Bot"-->
        <!--                    @click="handleRestart"-->
        <!--                >-->
        <!--                    <Power class="h-5 w-5 text-red-600" />-->
        <!--                </button>-->
        <!--                <button-->
        <!--                    class="btn-touch shrink-0 rounded-2xl bg-gray-100 p-2 transition-colors hover:bg-gray-200"-->
        <!--                    title="刷新数据"-->
        <!--                    @click="systemStore.fetchAllStatistics()"-->
        <!--                >-->
        <!--                    <RefreshCw class="h-5 w-5 text-gray-600" />-->
        <!--                </button>-->
        <!--            </div>-->
    </div>
</template>

<style scoped></style>
