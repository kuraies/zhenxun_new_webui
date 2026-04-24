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
import { whiteScreen } from "@/components";

// 引入拆分出的组件
import HomeHeader from "@/components/home/HomeHeader.vue";
import HomeSidebar from "@/components/home/HomeSidebar.vue";
import { useGlobalStore } from "@/store/global.ts";
import { ChevronLeft, ChevronRight } from "lucide-vue-next";

const socketStore = useWebSocketStore();
const contentRef = ref<HTMLElement | null>(null);
const globalStore = useGlobalStore();

// WebSocket 消息处理
const handleStatusMessage = (data: any) => {
    socketStore.addMessage("status", data, true, 10);
    localStorage.setItem("system_status", JSON.stringify(data));
};

const handleStatusStateChange = (isOpen: boolean) => {
    if (!isOpen) console.log("系统状态 WebSocket 连接断开");
};

const handleLogMessage = (log: any) => {
    // console.log("收到日志消息:", log);
};

onMounted(() => {
    whiteScreen.out();
    document.documentElement.classList.add("bg-gray-100");

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
});

const toggleNav = () => {
    // 普通 -> mini
    if (!globalStore.navMini && !globalStore.navHidden) {
        globalStore.navMini = true;
        return;
    }

    // mini -> hidden
    if (globalStore.navMini && !globalStore.navHidden) {
        globalStore.navMini = false;
        globalStore.navHidden = true;
        return;
    }

    // hidden -> 全还原
    globalStore.navMini = false;
    globalStore.navHidden = false;
};
</script>

<template>
    <div
        class="flex h-screen w-full flex-col space-y-2 bg-gray-100 pl-4 sm:space-y-4 sm:pt-4"
    >
        <HomeHeader />

        <div
            ref="contentRef"
            class="bottom relative flex min-h-0 flex-1 flex-col sm:flex-row"
        >
            <HomeSidebar ref="menuRef" />

            <div
                class="right flex h-full flex-1 flex-col space-y-4 overflow-y-auto pr-4 pb-4"
                :class="[
                    globalStore.navHidden
                        ? globalStore.isMobileMode
                            ? 'pl-4'
                            : 'ml-0'
                        : globalStore.navMini
                          ? 'pl-4'
                          : 'pl-4',
                ]"
            >
                <router-view v-slot="{ Component }">
                    <KeepAlive>
                        <component :is="Component" :key="$route.path" />
                    </KeepAlive>
                </router-view>
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

<style scoped></style>
