<script setup lang="ts">
import { ArrowLeft, ImageIcon, MessageSquare, Send } from "lucide-vue-next";
import { storeToRefs } from "pinia";
import { useChatStore } from "@/store/chat.ts";
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { ZXNotification } from "@/components";
import { sendMessage as sendWsMessage } from "@/utils/api-next/websocket-chat";

import {
    addMessageCallback,
    removeMessageCallback,
} from "@/utils/api-next/websocket-chat.ts";
import { useBotStore } from "@/store/bot.ts";
import { ChatMessage, MessageType } from "@/types";

const chatStore = useChatStore();
const botStore = useBotStore();

const { selectedContact, friends, groups, selectedId, messages } =
    storeToRefs(chatStore);

// 当前 bot 信息
const currentBot = ref<{ self_id: string; name?: string } | null>(null);

const inputMessage = ref("");

// 消息容器 ref
const messagesContainer = ref<HTMLElement | null>(null);

// 文件输入 ref
const imageInput = ref<HTMLInputElement | null>(null);

// 获取当前选中联系人的详细信息
const currentContactInfo = computed(() => {
    if (!selectedContact.value || !selectedId.value) {
        return null;
    }
    if (selectedContact.value === "friend") {
        const friend = friends.value.find(
            (f) => f.user_id === selectedId.value,
        );
        if (friend) {
            return {
                name: friend.nickname || friend.remark || "未知好友",
                id: friend.user_id,
                avatar: friend.ava_url,
            };
        }
    } else if (selectedContact.value === "group") {
        const group = groups.value.find((g) => g.group_id === selectedId.value);
        if (group) {
            return {
                name: group.group_name,
                id: group.group_id,
                avatar: group.ava_url,
            };
        }
    }
    return null;
});

// 将文件转换为 base64
const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
};

// 处理图片选择
const handleImageSelect = async (event: Event) => {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    // 验证文件类型
    if (!file.type.startsWith("image/")) {
        ZXNotification({
            title: "提示",
            message: "请选择图片文件哦～",
            type: "info",
            position: "top-right",
        });
        return;
    }

    // 验证文件大小 (限制 10MB)
    if (file.size > 10 * 1024 * 1024) {
        ZXNotification({
            title: "提示",
            message: "图片大小不能超过 10MB 哦～",
            type: "info",
            position: "top-right",
        });
        return;
    }

    if (!selectedContact.value || !selectedId.value) {
        ZXNotification({
            title: "呜呼～",
            message: "请先选择一个聊天对象哦 (っ °Д °;) っ",
            type: "😭",
            position: "top-right",
        });
        return;
    }

    const bot = getCurrentBot();
    if (!bot || !bot.self_id) {
        ZXNotification({
            title: "呜呼～",
            message: "没有找到可用的 Bot (っ °Д °;) っ",
            type: "😭",
            position: "top-right",
        });
        return;
    }

    try {
        // 转换为 base64
        const base64Data = await fileToBase64(file);
        const botAvatar =
            bot.ava_url || `http://q1.qlogo.cn/g?b=qq&nk=${bot.self_id}&s=160`;

        // 添加到消息列表（立即显示）
        const newMessage: ChatMessage = {
            id: Date.now(),
            user_id: bot.self_id,
            user_name: "小真寻",
            avatar: botAvatar,
            message: base64Data,
            message_type: "image",
            timestamp: new Date().toISOString(),
            is_self: true,
            group_id:
                selectedContact.value === "group"
                    ? selectedId.value
                    : undefined,
        };
        messages.value.push(newMessage);

        // 发送图片消息 (使用 base64:// 前缀)
        const imageMessage = `base64://${base64Data.split(",")[1]}`;
        await sendWsMessage(
            { self_id: bot.self_id, name: bot.nickname as string },
            selectedContact.value === "group" ? selectedId.value : null,
            selectedContact.value === "friend" ? selectedId.value : null,
            imageMessage,
        );

        scrollToBottom();

        ZXNotification({
            title: "发送成功～",
            message: "图片已经发送成功啦！",
            type: "🥳",
            position: "top-right",
        });
    } catch (error: any) {
        console.error("发送图片失败:", error);
        // 发送失败，移除刚添加的消息
        messages.value.pop();
        ZXNotification({
            title: "发送失败",
            message: "图片发送失败了 (´；ω；`)",
            type: "😭",
            position: "top-right",
        });
    } finally {
        // 清空文件输入
        input.value = "";
    }
};

// 获取当前可用的 bot（使用全局选中的 Bot）
const getCurrentBot = () => {
    return botStore.selectedBot || null;
};

// 消息回调处理
const handleWebSocketMessage = (data: any) => {
    console.log("收到 WebSocket 消息:", data);

    // 检查是否在选中的聊天中
    const objectId = data.group_id || data.user_id;
    if (selectedId.value !== objectId) {
        // 不在选中的聊天中，忽略
        return;
    }

    // 解析消息内容
    let messageText = "";
    let messageType: MessageType = "text";
    let imageUrl = "";

    if (Array.isArray(data.message)) {
        // 查找是否有图片消息
        const imageItem = data.message.find(
            (item: any) => item.type === "img" || item.type === "image",
        );
        if (imageItem) {
            messageType = "image";
            // 图片消息的 url 可能在 data 字段中
            imageUrl = imageItem.url || imageItem.data || imageItem.msg || "";
        }
        // 拼接文本消息
        messageText = data.message
            .filter((item: any) => item.type === "text")
            .map((item: any) => item.msg)
            .join("");
    } else {
        messageText = (data as any).msg || "";
    }

    // 是否是自己的消息
    const isSelfMessage = currentBot.value
        ? data.user_id === currentBot.value.self_id
        : false;

    const newMessage: ChatMessage = {
        id: Date.now() + Math.random(),
        user_id: data.user_id,
        user_name: data.name || "未知用户",
        avatar: data.ava_url,
        message: messageType === "image" ? imageUrl : messageText,
        message_type: messageType,
        timestamp: new Date().toISOString(),
        is_self: isSelfMessage,
        group_id: data.group_id,
    };

    messages.value.push(newMessage);
    scrollToBottom();
};

// 发送消息（采用旧项目的 `/manage/send_message` 接口）
const handleSendMessage = async () => {
    if (!inputMessage.value.trim()) {
        ZXNotification({
            title: "提示",
            message: "消息不能为空哦～",
            type: "info",
            position: "top-right",
        });
        return;
    }

    if (!selectedContact.value || !selectedId.value) {
        ZXNotification({
            title: "呜呼～",
            message: "请先选择一个聊天对象哦 (っ °Д °;) っ",
            type: "😭",
            position: "top-right",
        });
        return;
    }

    const bot = getCurrentBot();
    if (!bot || !bot.self_id) {
        ZXNotification({
            title: "呜呼～",
            message: "没有找到可用的 Bot (っ °Д °;) っ",
            type: "😭",
            position: "top-right",
        });
        return;
    }

    try {
        // 获取 bot 头像 URL
        const botAvatar =
            bot.ava_url || `http://q1.qlogo.cn/g?b=qq&nk=${bot.self_id}&s=160`;

        // 添加到消息列表（立即显示）
        const newMessage: ChatMessage = {
            id: Date.now(),
            user_id: bot.self_id,
            user_name: "小真寻",
            avatar: botAvatar,
            message: inputMessage.value,
            message_type: "text",
            timestamp: new Date().toISOString(),
            is_self: true,
            group_id:
                selectedContact.value === "group"
                    ? selectedId.value
                    : undefined,
        };
        messages.value.push(newMessage);

        // 使用旧项目的 WebSocket 模块发送消息（调用 /manage/send_message 接口）
        await sendWsMessage(
            { self_id: bot.self_id, name: <string>bot.nickname },
            selectedContact.value === "group" ? selectedId.value : null,
            selectedContact.value === "friend" ? selectedId.value : null,
            inputMessage.value,
        );

        inputMessage.value = "";
        scrollToBottom();

        // ZXNotification({
        //     title: "发送成功～",
        //     message: "消息已经发送成功啦！",
        //     type: "🥳",
        //     position: "top-right",
        // });
    } catch (error: any) {
        console.error("发送消息失败:", error);
        // 发送失败，移除刚添加的消息
        messages.value.pop();
        // ZXNotification({
        //     title: "发送失败",
        //     message: "消息发送失败了 (´；ω；`)",
        //     type: "😭",
        //     position: "top-right",
        // });
    }
};

// 触发图片上传
const triggerImageUpload = () => {
    imageInput.value?.click();
};

// 滚动到底部
const scrollToBottom = () => {
    if (messagesContainer.value) {
        setTimeout(() => {
            messagesContainer.value?.scrollTo({
                top: messagesContainer.value.scrollHeight,
                behavior: "smooth",
            });
        }, 100);
    }
};

const autoResize = (e: Event) => {
    const el = e.target as HTMLTextAreaElement;

    el.style.height = "auto"; // 先收回
    el.style.height = el.scrollHeight + "px"; // 再撑开
};

// 监听消息变化，自动滚动
watch(
    () => messages.value.length,
    () => {
        scrollToBottom();
    },
);

onMounted(async () => {
    const bot = getCurrentBot();
    currentBot.value = bot
        ? { self_id: bot.self_id || "", name: <string>bot.nickname }
        : null;

    addMessageCallback(handleWebSocketMessage);
    scrollToBottom();
});
onBeforeUnmount(() => {
    // 移除消息回调
    removeMessageCallback(handleWebSocketMessage);
    // 停止连接状态轮询
    // 注意：不断开 WebSocket 连接，因为其他组件可能还在使用
});
</script>

<template>
    <div
        :class="[
            'flex min-w-0 flex-1 flex-col overflow-hidden rounded-4xl border border-slate-200 bg-white shadow-sm',
            selectedContact ? 'flex' : 'hidden sm:flex',
        ]"
    >
        <!-- 当前聊天信息 -->
        <div
            v-if="currentContactInfo"
            class="flex items-center space-x-3 border-b border-gray-200 p-6 px-6 pb-4"
        >
            <!-- 移动端返回按钮 -->
            <button
                @click="
                    selectedContact = null;
                    selectedId = '';
                "
                class="flex-shrink-0 rounded-3xl p-1.5 text-gray-500 transition-colors hover:bg-gray-100 sm:hidden"
            >
                <ArrowLeft class="h-5 w-5" />
            </button>
            <div
                class="flex h-10 w-10 flex-shrink-0 items-center justify-center overflow-hidden rounded-full bg-blue-100 text-sm font-bold text-blue-600"
            >
                <img
                    v-if="currentContactInfo.avatar"
                    :src="currentContactInfo.avatar"
                    referrerpolicy="no-referrer"
                    class="h-full w-full object-cover"
                    @error="
                        (e) =>
                            ((e.target as HTMLImageElement).style.display =
                                'none')
                    "
                />
                <span v-if="!currentContactInfo.avatar">{{
                    currentContactInfo.name.charAt(0)
                }}</span>
            </div>
            <div class="min-w-0 flex-1">
                <p class="truncate font-bold text-gray-700">
                    {{ currentContactInfo.name }}
                </p>
                <p class="truncate text-xs text-gray-500">
                    {{ currentContactInfo.id }}
                </p>
            </div>
        </div>

        <!-- 消息列表 -->
        <div
            ref="messagesContainer"
            class="flex-1 space-y-3 overflow-y-auto p-3 sm:space-y-4 sm:p-4"
        >
            <div
                v-if="messages.length === 0"
                class="flex h-full items-center justify-center text-gray-400"
            >
                <div class="px-4 text-center">
                    <MessageSquare
                        class="mx-auto mb-4 h-12 w-12 opacity-50 sm:h-16 sm:w-16"
                    />
                    <p class="text-sm sm:text-base">暂无消息</p>
                    <p class="mt-2 text-xs sm:text-sm">
                        选择一个联系人开始聊天吧～
                    </p>
                </div>
            </div>

            <div
                v-for="message in messages"
                :key="message.id"
                :class="message.is_self ? 'justify-end' : 'justify-start'"
                class="flex items-start space-x-2 sm:space-x-3"
            >
                <!-- 头像 -->
                <div
                    v-if="!message.is_self"
                    class="flex h-8 w-8 flex-shrink-0 items-center justify-center overflow-hidden rounded-full bg-blue-100 text-xs font-bold text-blue-600 sm:h-10 sm:w-10 sm:text-sm"
                >
                    <img
                        v-if="message.avatar"
                        :src="message.avatar"
                        referrerpolicy="no-referrer"
                        class="h-full w-full object-cover"
                        @error="message.avatar = ''"
                    />
                    <span v-else>{{
                        (message.user_name || message.user_id).charAt(0)
                    }}</span>
                </div>

                <!-- 消息气泡 -->
                <div>
                    <p
                        class="mb-1 text-xs text-gray-600"
                        v-if="!message.is_self"
                    >
                        {{ message.user_name || "未知用户" }}
                    </p>
                    <div
                        :class="[
                            message.is_self
                                ? 'bg-blue-500 text-white'
                                : 'bg-gray-200 text-gray-800',

                            message.message_type !== 'image' &&
                                (message.is_self
                                    ? 'rounded-br-none'
                                    : 'rounded-bl-none'),
                        ]"
                        class="max-w-[70%] overflow-hidden rounded-2xl sm:max-w-md"
                    >
                        <!-- 图片消息 -->
                        <div
                            v-if="message.message_type === 'image'"
                            class="h-full w-full max-w-48"
                        >
                            <el-image
                                :src="message.message"
                                class="block h-auto max-w-full align-top"
                                fit="cover"
                                :preview-src-list="[message.message]"
                                referrerpolicy="no-referrer"
                                hide-on-click-modal
                            >
                                <template #placeholder>
                                    <div
                                        class="image-placeholder flex h-32 items-center justify-center rounded-3xl bg-gray-100"
                                    >
                                        <div class="text-xs text-gray-400">
                                            加载中...
                                        </div>
                                    </div>
                                </template>
                                <template #error>
                                    <div
                                        class="image-error flex h-32 items-center justify-center rounded-3xl bg-gray-100"
                                    >
                                        <div class="text-center text-gray-400">
                                            <div class="mb-1 text-2xl">⚠️</div>
                                            <span class="text-xs"
                                                >图片加载失败</span
                                            >
                                        </div>
                                    </div>
                                </template>
                            </el-image>
                        </div>

                        <!-- 文本消息 -->
                        <p
                            v-else
                            :class="[
                                'px-3 py-2 text-xs break-words sm:text-sm',
                                message.is_self
                                    ? 'rounded-2xl rounded-br-md'
                                    : 'rounded-2xl rounded-bl-md',
                            ]"
                        >
                            {{ message.message }}
                        </p>
                    </div>
                    <p class="mt-1 text-right text-xs text-gray-500">
                        {{ new Date(message.timestamp).toLocaleTimeString() }}
                    </p>
                </div>

                <!-- 自己的头像 -->
                <div
                    v-if="message.is_self"
                    class="flex h-8 w-8 flex-shrink-0 items-center justify-center overflow-hidden rounded-full bg-pink-100 text-xs font-bold text-pink-600 sm:h-10 sm:w-10 sm:text-sm"
                >
                    <img
                        v-if="message.avatar"
                        :src="message.avatar"
                        referrerpolicy="no-referrer"
                        class="h-full w-full object-cover"
                        @error="message.avatar = ''"
                    />
                    <span v-else>{{ "自" }}</span>
                </div>
            </div>
        </div>

        <!-- 输入框区域 -->
        <div class="border-t border-gray-100 p-4 pt-1" v-if="selectedContact">
            <!-- 工具栏 -->
            <div class="mb-1 flex items-center space-x-1 sm:space-x-2">
                <button
                    @click="triggerImageUpload"
                    class="btn-touch rounded-3xl p-2 text-gray-500 transition-colors hover:bg-gray-100"
                    title="发送图片"
                >
                    <ImageIcon class="h-4 w-4 sm:h-5 sm:w-5" />
                </button>
                <!-- 隐藏的图片输入 -->
                <input
                    ref="imageInput"
                    type="file"
                    accept="image/*"
                    class="hidden"
                    @change="handleImageSelect"
                />
            </div>

            <!-- 输入框和发送按钮 -->
            <div class="flex items-end space-x-2 sm:space-x-3">
                <textarea
                    v-model="inputMessage"
                    rows="1"
                    @input="autoResize"
                    @keydown.enter.exact.prevent="handleSendMessage"
                    placeholder="输入消息，按 Enter 发送..."
                    class="max-h-30 min-h-8 flex-1 resize-none overflow-y-auto rounded-3xl border border-gray-200 px-6 py-2 pr-0 text-sm text-gray-600 focus:ring-0 focus:outline-none sm:px-4"
                />

                <button
                    @click="handleSendMessage"
                    class="btn-touch flex flex-shrink-0 cursor-pointer items-center space-x-1 rounded-3xl bg-blue-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-600 sm:space-x-2 sm:px-6"
                >
                    <Send class="h-4 w-4" />
                    <span class="hidden sm:inline">发送</span>
                </button>
            </div>
        </div>
    </div>
</template>

<style scoped></style>
