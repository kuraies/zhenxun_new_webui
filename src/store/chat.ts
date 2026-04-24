import { defineStore } from "pinia";
import { ref } from "vue";
import type { ChatMessage, Friend, Group as GroupType } from "@/types";

export const useChatStore = defineStore("chat", () => {
    const selectedName = ref<string>("");
    const activeTab = ref<"friend" | "group">("friend");
    const selectedContact = ref<"friend" | "group" | null>(null);
    const friends = ref<Friend[]>([]);
    const groups = ref<GroupType[]>([]);
    const loadingContacts = ref(false);
    const selectedId = ref<string>("");
    const messages = ref<ChatMessage[]>([]);

    // 选择联系人
    const selectContact = (
        type: "friend" | "group",
        id: string,
        name: string,
    ) => {
        selectedContact.value = type;
        selectedId.value = id;
        selectedName.value = name;
        // 清空消息列表（历史消息功能已移除）
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

        selectContact,
    };
});
