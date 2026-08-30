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
import { ZXNotification } from "@/services/ui";
import { addMessageCallback } from "@/utils/api-next/websocket-chat";
import { chatApi } from "@/utils/api-next";
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

    /** 拉取当前 bot 的好友与群列表（审批通过后也需要调用以刷新联系人） */
    const loadContacts = async () => {
        loadingContacts.value = true;
        try {
            const botStore = useBotStore();
            if (botStore.botList.length === 0) {
                await botStore.getBotList();
            }
            const botId = botStore.getSelectedBotId();
            if (!botId) {
                ZXNotification({
                    title: "呜呼～",
                    message: "还没有找到可用的 Bot 哦 (っ °Д °;) っ",
                    type: "😭",
                    position: "top-right",
                });
                return;
            }
            const friendRes = await chatApi.getFriendList(botId);
            if (friendRes?.success && friendRes?.data) {
                friends.value = friendRes.data;
            }
            const groupRes = await chatApi.getGroupList(botId);
            if (groupRes?.success && groupRes?.data) {
                groups.value = groupRes.data;
            }

            // 列表变化后（bot 下线、好友被删等）校验当前选中是否仍存在，
            // 不存在则清空，右侧聊天区与详情面板回到空状态，
            // 避免继续挂在已失效的联系人上反复报错
            const friendExists = friends.value.some(
                (f) => String(f.user_id) === selectedId.value,
            );
            const groupExists = groups.value.some(
                (g) => String(g.group_id) === selectedId.value,
            );
            if (
                selectedContact.value &&
                ((selectedContact.value === "friend" && !friendExists) ||
                    (selectedContact.value === "group" && !groupExists))
            ) {
                clearSelection();
            }
        } catch (error) {
            console.error("加载联系人列表失败:", error);
        } finally {
            loadingContacts.value = false;
        }
    };

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
                // url 可能在外层，也可能在段 data 里（OneBot 段格式）
                const segData =
                    imageItem.data && typeof imageItem.data === "object"
                        ? imageItem.data
                        : {};
                imageUrl =
                    imageItem.url ||
                    (typeof imageItem.data === "string"
                        ? imageItem.data
                        : "") ||
                    imageItem.msg ||
                    segData.url ||
                    segData.file ||
                    "";
            }

            messageText = data.message
                .filter((item: any) => item.type === "text")
                .map((item: any) => item.msg || item.data?.text || "")
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

    // 清空选中：必须连消息列表一起清，否则桌面端的消息卡片
    // （sm 以上常显）会继续展示上一个会话的残留内容
    const clearSelection = () => {
        selectedContact.value = null;
        selectedId.value = "";
        selectedName.value = "";
        messages.value = [];
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
        loadContacts,

        selectContact,
        clearSelection,
        appendCurrentMessage,
        appendIncomingMessage,
        removeCurrentMessage,
        loadCachedMessages,
        setupMessageReceiver,
        createMessageId,
    };
});
