<script setup lang="ts">
import { onBeforeUnmount, onMounted } from "vue";
import { usePolling } from "@/composables/usePolling";
import { initWebSocket, isConnected } from "@/utils/api-next/websocket-chat";
import { useGlobalStore } from "@/store/global.ts";
import ChatHeader from "@/views/chat/ChatHeader.vue";
import ChatContactTab from "@/views/chat/ChatContactTab.vue";
import ChatMessages from "@/views/chat/ChatMessages.vue";
import { storeToRefs } from "pinia";

const globalStore = useGlobalStore();

// const { wsConnected: boolean } = storeToRefs(globalStore);

// 连接状态检查轮询（页面可见性感知）
const { start: startConnectionPolling, stop: stopConnectionPolling } =
    usePolling(
        () => {
            globalStore.wsConnected = isConnected();
        },
        1000,
        { autoStart: false },
    );

// 初始化 WebSocket 连接
const initWebSocketConnection = () => {
    initWebSocket();
    // 立即检查一次
    globalStore.wsConnected = isConnected();
    // 启动可见性感知的连接状态轮询
    startConnectionPolling();
};

onMounted(async () => {
    initWebSocketConnection();

    // 注册消息回调
});

onBeforeUnmount(() => {
    // 停止连接状态轮询
    stopConnectionPolling();
    // 注意：不断开 WebSocket 连接，因为其他组件可能还在使用
});
</script>

<template>
    <div class="flex h-full w-full flex-col space-y-4">
        <!-- 头部标题 -->
        <ChatHeader v-if="!globalStore.isDesktopMode" />

        <div
            class="flex min-w-0 flex-1 flex-col space-y-3 sm:flex-row sm:space-y-0 sm:space-x-3 lg:space-x-4"
        >
            <!-- 联系人列表 - 使用标签页切换好友/群组 -->
            <ChatContactTab />

            <!-- 聊天区域 -->
            <ChatMessages />
        </div>
    </div>
</template>

<style scoped></style>
