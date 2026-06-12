<script setup lang="ts">
import { GroupIcon, Users } from "lucide-vue-next";
import { useChatStore } from "@/store/chat.ts";
import { storeToRefs } from "pinia";
import { onMounted } from "vue";
import { useBotStore } from "@/store/bot.ts";
import { ZXNotification } from "@/services/ui";
import { chatApi } from "@/utils/api-next";
import ChatRequestHandler from "./ChatRequestHandler.vue";

const chatStore = useChatStore();

const botStore = useBotStore();

const {
    activeTab,
    selectedContact,
    friends,
    groups,
    selectedId,
    loadingContacts,
} = storeToRefs(chatStore);
const { selectContact } = chatStore;

// 获取联系人列表
const loadContacts = async () => {
    loadingContacts.value = true;
    try {
        // 获取 bot_id（使用全局选中的 Bot）
        if (botStore.botList.length === 0) {
            await botStore.getBotList();
        }
        // 使用选中的 Bot ID，如果没有选中则使用最新的 Bot
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

        // 获取好友列表
        const friendRes = await chatApi.getFriendList(botId);
        if (friendRes?.success && friendRes?.data) {
            friends.value = friendRes.data;
        }

        // 获取群组列表
        const groupRes = await chatApi.getGroupList(botId);
        if (groupRes?.success && groupRes?.data) {
            groups.value = groupRes.data;
        }
    } catch (error) {
        console.error("加载联系人列表失败:", error);
    } finally {
        loadingContacts.value = false;
    }
};

onMounted(async () => {
    // 获取并保存当前 bot 信息

    await loadContacts();

    // 注册消息回调
});
</script>

<template>
    <div
        :class="[
            'flex h-full min-w-0 flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white px-2 pt-4 shadow-sm transition-all duration-300',
            selectedContact ? 'hidden sm:flex' : 'flex',
            'w-full flex-shrink-0 sm:w-[calc(var(--spacing)*50)] md:w-64 lg:w-72',
        ]"
    >
        <!-- 标签页切换 -->
        <div class="px-2 pb-3">
            <div
                class="grid h-11 grid-cols-2 rounded-2xl bg-slate-100 p-1 shadow-inner shadow-slate-200/60"
            >
                <button
                    type="button"
                    :class="[
                        'group flex min-w-0 cursor-pointer items-center justify-center gap-1.5 rounded-2xl px-2 text-sm font-medium transition-all',
                        activeTab === 'friend'
                            ? 'bg-white text-blue-600 shadow-sm'
                            : 'text-slate-500 hover:text-slate-700',
                    ]"
                    @click="activeTab = 'friend'"
                >
                    <Users
                        :class="[
                            'h-4 w-4 transition-colors',
                            activeTab === 'friend'
                                ? 'text-blue-500'
                                : 'text-slate-400 group-hover:text-slate-500',
                        ]"
                    />
                    <span class="truncate">好友</span>
                    <span
                        :class="[
                            'min-w-5 rounded-full px-1.5 py-0.5 text-center text-[10px] leading-none transition-colors',
                            activeTab === 'friend'
                                ? 'bg-blue-50 text-blue-500'
                                : 'bg-white/70 text-slate-400',
                        ]"
                    >
                        {{ friends.length }}
                    </span>
                </button>
                <button
                    type="button"
                    :class="[
                        'group flex min-w-0 cursor-pointer items-center justify-center gap-1.5 rounded-2xl px-2 text-sm font-medium transition-all',
                        activeTab === 'group'
                            ? 'bg-white text-blue-600 shadow-sm'
                            : 'text-slate-500 hover:text-slate-700',
                    ]"
                    @click="activeTab = 'group'"
                >
                    <GroupIcon
                        :class="[
                            'h-4 w-4 transition-colors',
                            activeTab === 'group'
                                ? 'text-blue-500'
                                : 'text-slate-400 group-hover:text-slate-500',
                        ]"
                    />
                    <span class="truncate">群聊</span>
                    <span
                        :class="[
                            'min-w-5 rounded-full px-1.5 py-0.5 text-center text-[10px] leading-none transition-colors',
                            activeTab === 'group'
                                ? 'bg-blue-50 text-blue-500'
                                : 'bg-white/70 text-slate-400',
                        ]"
                    >
                        {{ groups.length }}
                    </span>
                </button>
            </div>
        </div>

        <!-- 好友列表 -->
        <div
            v-show="activeTab === 'friend'"
            class="min-h-0 flex-1 space-y-1 overflow-y-auto p-1.5 p-2"
        >
            <div
                v-for="friend in friends"
                :key="friend.user_id"
                @click="
                    selectContact(
                        'friend',
                        friend.user_id,
                        friend.nickname || friend.remark || '未知好友',
                    )
                "
                :class="
                    selectedId === friend.user_id &&
                    selectedContact === 'friend'
                        ? 'bg-blue-50'
                        : 'hover:bg-gray-100'
                "
                class="btn-touch flex cursor-pointer items-center gap-3 rounded-2xl p-2 transition-colors"
            >
                <img
                    v-if="friend.ava_url"
                    :src="friend.ava_url"
                    referrerpolicy="no-referrer"
                    class="h-8 w-8 flex-shrink-0 rounded-full object-cover"
                    @error="friend.ava_url = ''"
                />
                <div
                    v-else
                    class="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-blue-100 text-sm font-bold text-blue-600"
                >
                    {{ (friend.nickname || friend.remark || "友").charAt(0) }}
                </div>
                <span class="min-w-0 flex-1 truncate text-sm text-gray-700"
                    >{{ friend.nickname || friend.remark || "未知好友" }}
                    <span class="text-xs text-gray-500"
                        >({{ friend.user_id }})</span
                    >
                </span>
            </div>
            <div
                v-if="loadingContacts"
                class="py-2 text-center text-xs text-gray-400"
            >
                加载中...
            </div>
            <div
                v-if="!loadingContacts && friends.length === 0"
                class="py-2 text-center text-xs text-gray-400"
            >
                暂无好友
            </div>
        </div>

        <!-- 群组列表 -->
        <div
            v-show="activeTab === 'group'"
            class="min-h-0 flex-1 space-y-0.5 overflow-y-auto p-1.5 sm:space-y-1 sm:p-2"
        >
            <div
                v-for="group in groups"
                :key="group.group_id"
                @click="
                    selectContact('group', group.group_id, group.group_name)
                "
                :class="
                    selectedId === group.group_id && selectedContact === 'group'
                        ? 'bg-blue-50'
                        : 'hover:bg-gray-100'
                "
                class="btn-touch flex cursor-pointer items-center gap-3 rounded-2xl p-2 transition-colors"
            >
                <img
                    v-if="group.ava_url"
                    :src="group.ava_url"
                    referrerpolicy="no-referrer"
                    class="h-8 w-8 flex-shrink-0 rounded-full object-cover"
                    @error="group.ava_url = ''"
                />
                <div
                    v-else
                    class="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-pink-100 text-sm font-bold text-pink-600"
                >
                    {{ group.group_name.charAt(0) }}
                </div>
                <span class="min-w-0 flex-1 truncate text-sm text-gray-700"
                    >{{ group.group_name }}
                    <span class="text-xs text-gray-500"
                        >({{ group.group_id }})</span
                    >
                </span>
            </div>
            <div
                v-if="loadingContacts"
                class="py-2 text-center text-xs text-gray-400"
            >
                加载中...
            </div>
            <div
                v-if="!loadingContacts && groups.length === 0"
                class="py-2 text-center text-xs text-gray-400"
            >
                暂无群组
            </div>
        </div>

        <ChatRequestHandler />
    </div>
</template>

<style scoped></style>
