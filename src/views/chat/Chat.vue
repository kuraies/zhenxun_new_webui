<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted } from "vue";
import { usePolling } from "@/composables/usePolling";
import { initWebSocket, isConnected } from "@/utils/api-next/websocket-chat";
import { useGlobalStore } from "@/store/global.ts";
import { useChatStore } from "@/store/chat.ts";
import ChatHeader from "@/views/chat/ChatHeader.vue";
import ChatContactTab from "@/views/chat/ChatContactTab.vue";
import ChatMessages from "@/views/chat/ChatMessages.vue";
import { storeToRefs } from "pinia";
import ManageOverview from "@/views/manage/ManageOverview.vue";

const globalStore = useGlobalStore();
const chatStore = useChatStore();
const { selectedContact, selectedId } = storeToRefs(chatStore);
const { setupMessageReceiver } = chatStore;

const manageTargetType = computed(() => {
    if (selectedContact.value === "group") return "group";
    if (selectedContact.value === "friend") return "friend";

    return null;
});

const manageTargetId = computed(() => selectedId.value || null);

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
    setupMessageReceiver();
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

            <!-- 管理区域 - 类似 QQ 聊天右侧资料/管理栏 -->
            <aside
                class="hidden h-full min-w-0 flex-shrink-0 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm xl:flex xl:w-80 2xl:w-96"
            >
                <ManageOverview
                    embedded
                    :target-id="manageTargetId"
                    :target-type="manageTargetType"
                />
            </aside>
        </div>
    </div>
</template>

<style scoped></style>
