<script setup lang="ts">
import { GroupIcon, Users } from "lucide-vue-next";
import { useChatStore } from "@/store/chat.ts";
import { storeToRefs } from "pinia";
import { onMounted } from "vue";
import { useBotStore } from "@/store/bot.ts";
import { ZXNotification } from "@/components";
import { chatApi } from "@/utils/api-next";

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
            'flex h-full min-w-0 flex-col overflow-hidden rounded-4xl border border-slate-200 bg-white px-2 pt-4 shadow-sm transition-all duration-300',
            selectedContact ? 'hidden sm:flex' : 'flex',
            'w-full flex-shrink-0 sm:w-[calc(var(--spacing)*50)] md:w-64 lg:w-72',
        ]"
    >
        <!-- 标签页切换 -->
        <el-tabs v-model="activeTab" class="contact-tabs">
            <el-tab-pane name="friend">
                <template #label>
                    <span class="tab-label">
                        <Users class="h-4 w-4" />
                        <span class="text-sm">好友</span>
                        <span class="tab-count">{{ friends.length }}</span>
                    </span>
                </template>
            </el-tab-pane>
            <el-tab-pane name="group">
                <template #label>
                    <span class="tab-label">
                        <GroupIcon class="h-4 w-4" />
                        <span class="text-sm">群组</span>
                        <span class="tab-count">{{ groups.length }}</span>
                    </span>
                </template>
            </el-tab-pane>
        </el-tabs>

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
                class="btn-touch flex cursor-pointer items-center gap-3 rounded-3xl p-2 transition-colors"
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
                class="btn-touch flex cursor-pointer items-center gap-3 rounded-3xl p-2 transition-colors"
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
    </div>
</template>

<style scoped>
/* 标签页样式 */
.contact-tabs :deep(.el-tabs__header) {
    margin: 0;
    padding: 0 8px;
    border-bottom: 1px solid #f1f5f9;
}

@media (min-width: 640px) {
    .contact-tabs :deep(.el-tabs__header) {
        padding: 0 12px;
    }
}

.contact-tabs :deep(.el-tabs__nav) {
    display: flex;
    width: 100%;
}

.contact-tabs :deep(.el-tabs__item) {
    flex: 1;
    text-align: center;
    padding: 10px 6px !important;
    font-size: 12px;
    font-weight: 500;
    color: #64748b;
    transition: all 0.2s;
}

@media (min-width: 640px) {
    .contact-tabs :deep(.el-tabs__item) {
        padding: 12px 8px !important;
        font-size: 13px;
    }
}

.contact-tabs :deep(.el-tabs__item:hover) {
    color: #3b82f6;
}

.contact-tabs :deep(.el-tabs__item.is-active) {
    color: #3b82f6;
    font-weight: 600;
}

.contact-tabs :deep(.el-tabs__active-bar) {
    background: linear-gradient(90deg, #3b82f6, #60a5fa);
    height: 3px;
    border-radius: 3px 3px 0 0;
}

.tab-label {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 4px;
}

@media (min-width: 640px) {
    .tab-label {
        gap: 6px;
    }
}

.tab-count {
    font-size: 9px;
    color: #94a3b8;
    background: #f1f5f9;
    padding: 1px 4px;
    border-radius: 8px;
    font-weight: 500;
}

@media (min-width: 640px) {
    .tab-count {
        font-size: 10px;
        padding: 1px 6px;
        border-radius: 10px;
    }
}

.is-active .tab-count {
    background: #dbeafe;
    color: #3b82f6;
}
</style>
