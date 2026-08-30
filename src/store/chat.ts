import { defineStore } from "pinia";
import { ref } from "vue";
import type {
    ChatMessage,
    ChatMessagePart,
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

    /** 后端段类型 -> 本地消息类型（后端 chat WS 目前推 text/img/at，其余预留） */
    const SEGMENT_TYPE_MAP: Record<string, MessageType> = {
        img: "image",
        image: "image",
        face: "face",
        record: "record",
        voice: "record",
        video: "video",
        json: "json",
        xml: "xml",
        forward: "forward",
        share: "share",
        music: "music",
        location: "location",
        reply: "reply",
    };

    /** 各特殊类型无负载时的占位文案 */
    const TYPE_PLACEHOLDER: Partial<Record<MessageType, string>> = {
        image: "[图片]",
        face: "[表情]",
        record: "[语音]",
        video: "[视频]",
        json: "[JSON卡片]",
        xml: "[XML卡片]",
        forward: "[合并转发消息]",
        share: "[链接分享]",
        music: "[音乐分享]",
        location: "[位置]",
        reply: "[回复]",
    };

    const parseIncomingMessage = (data: any) => {
        const parts: ChatMessagePart[] = [];
        const pushText = (text: string) => {
            if (!text) return;
            const last = parts[parts.length - 1];
            if (last && last.type === "text") {
                last.content += text;
            } else {
                parts.push({ type: "text", content: text });
            }
        };

        if (Array.isArray(data.message)) {
            for (const item of data.message) {
                const segData =
                    item.data && typeof item.data === "object"
                        ? item.data
                        : {};
                const mapped = SEGMENT_TYPE_MAP[item.type];
                if (mapped) {
                    // 每个特殊段独立保留，混合消息按原始顺序渲染
                    const payload =
                        item.url ||
                        item.msg ||
                        (typeof item.data === "string" ? item.data : "") ||
                        segData.url ||
                        segData.file ||
                        "";
                    parts.push({
                        type: mapped,
                        content: payload || TYPE_PLACEHOLDER[mapped] || "",
                    });
                    continue;
                }
                if (item.type === "text") {
                    pushText(item.msg || item.data?.text || "");
                } else if (item.type === "at") {
                    // 后端 at 段的 msg 已是 "@昵称" 文本
                    pushText(item.msg || `@${segData.qq ?? ""}`);
                }
                // 其余未知类型跳过
            }
        } else if (typeof data.message === "string") {
            pushText(data.message);
        } else {
            pushText(data.msg || "");
        }

        if (!parts.length) {
            parts.push({ type: "text", content: "" });
        }

        const first = parts[0];
        // 兼容字段：单段消息直接用内容；混合消息给拼接摘要
        const message =
            parts.length === 1
                ? first.content
                : parts
                      .map((part) =>
                          part.type === "text"
                              ? part.content
                              : part.content || "",
                      )
                      .join("");

        return { parts, messageType: first.type, message };
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

        const { message, messageType, parts } = parseIncomingMessage(data);
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
            parts: parts.length > 1 ? parts : undefined,
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
