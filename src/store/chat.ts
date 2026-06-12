import { defineStore } from "pinia";
import { ref } from "vue";
import type {
    ChatMessage,
    Friend,
    Group as GroupType,
    MessageType,
} from "@/types";
import type { ChatMessage as WsChatMessage } from "@/types/api-next.types";
import { useBotStore } from "@/store/bot.ts";
import { addMessageCallback } from "@/utils/api-next/websocket-chat";
import {
    cacheMessage,
    getCachedMessages,
    removeCachedMessage,
    trimCachedMessages,
} from "@/utils/chat-message-db";

const MESSAGE_CACHE_LIMIT = 300;

const getConversationKey = (
    type: "friend" | "group" | null,
    id: string | null | undefined,
) => {
    if (!type || !id) return "";
    return `${type}:${id}`;
};

const createMessageId = () =>
    Math.floor(Date.now() * 1000 + Math.random() * 1000);

const isRecentSameMessage = (a: ChatMessage, b: ChatMessage) => {
    const timeDiff = Math.abs(
        new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
    );

    return (
        a.is_self &&
        b.is_self &&
        a.user_id === b.user_id &&
        a.message_type === b.message_type &&
        a.message === b.message &&
        timeDiff < 10_000
    );
};

export const useChatStore = defineStore("chat", () => {
    const selectedName = ref<string>("");
    const activeTab = ref<"friend" | "group">("friend");
    const selectedContact = ref<"friend" | "group" | null>(null);
    const friends = ref<Friend[]>([]);
    const groups = ref<GroupType[]>([]);
    const loadingContacts = ref(false);
    const selectedId = ref<string>("");
    const messages = ref<ChatMessage[]>([]);
    const messagesByConversation = ref<Record<string, ChatMessage[]>>({});
    const messageReceiverRegistered = ref(false);

    const currentConversationKey = () =>
        getConversationKey(selectedContact.value, selectedId.value);

    const setConversationMessages = (
        conversationKey: string,
        nextMessages: ChatMessage[],
    ) => {
        const sortedMessages = [...nextMessages]
            .sort(
                (a, b) =>
                    new Date(a.timestamp).getTime() -
                    new Date(b.timestamp).getTime(),
            )
            .slice(-MESSAGE_CACHE_LIMIT);

        messagesByConversation.value[conversationKey] = sortedMessages;

        if (conversationKey === currentConversationKey()) {
            messages.value = sortedMessages;
        }
    };

    const loadCachedMessages = async (type: "friend" | "group", id: string) => {
        const conversationKey = getConversationKey(type, id);
        const cachedMessages = await getCachedMessages(
            conversationKey,
            MESSAGE_CACHE_LIMIT,
        );

        setConversationMessages(conversationKey, cachedMessages);
    };

    const appendMessage = async (
        type: "friend" | "group",
        id: string,
        message: ChatMessage,
    ) => {
        const conversationKey = getConversationKey(type, id);
        const currentMessages =
            messagesByConversation.value[conversationKey] ?? [];

        setConversationMessages(conversationKey, [...currentMessages, message]);
        await cacheMessage(conversationKey, message);
        await trimCachedMessages(conversationKey, MESSAGE_CACHE_LIMIT);
    };

    const removeMessage = async (
        type: "friend" | "group",
        id: string,
        messageId: number,
    ) => {
        const conversationKey = getConversationKey(type, id);
        const currentMessages =
            messagesByConversation.value[conversationKey] ?? [];

        setConversationMessages(
            conversationKey,
            currentMessages.filter((message) => message.id !== messageId),
        );
        await removeCachedMessage(messageId);
    };

    const appendCurrentMessage = async (message: ChatMessage) => {
        if (!selectedContact.value || !selectedId.value) return;
        await appendMessage(selectedContact.value, selectedId.value, message);
    };

    const removeCurrentMessage = async (messageId: number) => {
        if (!selectedContact.value || !selectedId.value) return;
        await removeMessage(selectedContact.value, selectedId.value, messageId);
    };

    const parseIncomingMessage = (data: any) => {
        let messageText = "";
        let messageType: MessageType = "text";
        let imageUrl = "";

        if (Array.isArray(data.message)) {
            const imageItem = data.message.find(
                (item: any) => item.type === "img" || item.type === "image",
            );

            if (imageItem) {
                messageType = "image";
                imageUrl =
                    imageItem.url || imageItem.data || imageItem.msg || "";
            }

            messageText = data.message
                .filter((item: any) => item.type === "text")
                .map((item: any) => item.msg)
                .join("");
        } else if (typeof data.message === "string") {
            messageText = data.message;
        } else {
            messageText = data.msg || "";
        }

        return {
            message: messageType === "image" ? imageUrl : messageText,
            messageType,
        };
    };

    const appendIncomingMessage = async (data: WsChatMessage | any) => {
        const botStore = useBotStore();
        const currentBotId = botStore.selectedBot?.self_id || "";
        const groupId = data.group_id ? String(data.group_id) : "";
        const objectId = data.object_id ? String(data.object_id) : "";
        const userId = data.user_id ? String(data.user_id) : "";
        const conversationType: "friend" | "group" = groupId
            ? "group"
            : "friend";
        const conversationId =
            conversationType === "group"
                ? groupId
                : objectId && objectId !== currentBotId
                  ? objectId
                  : userId;

        if (!conversationId) return;

        const { message, messageType } = parseIncomingMessage(data);
        if (!message) return;

        const incomingMessage: ChatMessage = {
            id: createMessageId(),
            user_id: userId,
            user_name: data.name || "未知用户",
            avatar: data.ava_url,
            message,
            message_type: messageType,
            timestamp: data.time || new Date().toISOString(),
            is_self: currentBotId ? userId === currentBotId : false,
            group_id: groupId || undefined,
        };

        const conversationKey = getConversationKey(
            conversationType,
            conversationId,
        );
        const currentMessages =
            messagesByConversation.value[conversationKey] ?? [];

        if (
            incomingMessage.is_self &&
            currentMessages.some((message) =>
                isRecentSameMessage(message, incomingMessage),
            )
        ) {
            return;
        }

        await appendMessage(conversationType, conversationId, incomingMessage);
    };

    const setupMessageReceiver = () => {
        if (messageReceiverRegistered.value) return;

        addMessageCallback((data) => {
            void appendIncomingMessage(data);
        });
        messageReceiverRegistered.value = true;
    };

    // 选择联系人
    const selectContact = async (
        type: "friend" | "group",
        id: string,
        name: string,
    ) => {
        selectedContact.value = type;
        selectedId.value = id;
        selectedName.value = name;

        const conversationKey = getConversationKey(type, id);
        messages.value = messagesByConversation.value[conversationKey] ?? [];
        await loadCachedMessages(type, id);
    };

    return {
        selectedName,
        activeTab,
        selectedContact,
        friends,
        groups,
        loadingContacts,
        selectedId,
        messages,

        selectContact,
        appendCurrentMessage,
        appendIncomingMessage,
        removeCurrentMessage,
        loadCachedMessages,
        setupMessageReceiver,
        createMessageId,
    };
});
