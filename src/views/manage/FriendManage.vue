<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { Search, UserCircle, Users } from "lucide-vue-next";
import { ZXMessageBox, ZXNotification } from "@/components";
import { manageApi } from "@/utils/api-next";
import { useBotStore } from "@/store/bot";
import type { Friend, FriendDetail } from "@/types/manage.types";
import FriendCard from "@/components/zxcomponent/FriendCard/FriendCard.vue";
import FriendDetailInfo from "@/components/manage/FriendDetailInfo.vue";
import FriendTrendChart from "@/components/manage/FriendTrendChart.vue";

const botStore = useBotStore()
const loading = ref(false)
const friends = ref<Friend[]>([])
const searchQuery = ref('')
const sendMessageDialogOpen = ref(false)
const currentFriend = ref<Friend | null>(null)
const messageContent = ref('')

// 好友详情面板状态
const selectedFriend = ref<Friend | null>(null)
const friendDetail = ref<FriendDetail | null>(null)
const loadingDetail = ref(false)

const filteredFriends = computed(() => {
    if (!searchQuery.value) return friends.value
    const query = searchQuery.value.toLowerCase()
    return friends.value.filter(
        f =>
            f.nickname.toLowerCase().includes(query) ||
            f.user_id.toLowerCase().includes(query)
    )
})

const stats = computed(() => ({
    total: friends.value.length
}))

const loadFriends = async () => {
    loading.value = true
    try {
        const botId = botStore.getSelectedBotId() || undefined
        const res = await manageApi.getFriendList(botId)
        if (res.success && res.data) {
            friends.value = res.data
        }
    } catch (error) {
        console.error('加载好友列表失败:', error)
        ZXNotification({
            title: '呜呼~',
            message: '好友列表加载失败了 (っ °Д °;) っ',
            type: '😭',
            position: 'top-right'
        })
    } finally {
        loading.value = false
    }
}

// 选择好友并加载详情
const selectFriend = async (friend: Friend) => {
    selectedFriend.value = friend
    loadingDetail.value = true
    try {
        const res = await manageApi.getFriendDetail(friend.user_id,<string>botStore.selectedBotId)
        if (res.success && res.data) {
            friendDetail.value = res.data
        } else {
            friendDetail.value = null
        }
    } catch (error) {
        console.error('加载好友详情失败:', error)
        friendDetail.value = null
    } finally {
        loadingDetail.value = false
    }
}

// 刷新好友详情（编辑后调用）
const refreshFriendDetail = async () => {
    if (!selectedFriend.value) return
    try {
        const res = await manageApi.getFriendDetail(selectedFriend.value.user_id,<string>botStore.selectedBotId)
        if (res.success && res.data) {
            friendDetail.value = res.data
        }
    } catch (error) {
        console.error('刷新好友详情失败:', error)
    }
}

const sendMessage = (friend: Friend) => {
    currentFriend.value = friend
    messageContent.value = ''
    sendMessageDialogOpen.value = true
}

const confirmSendMessage = async () => {
    if (!currentFriend.value || !messageContent.value.trim()) return

    try {
        const botId = botStore.getSelectedBotId() || ''
        const res = await manageApi.sendMessage(
            botId,
            messageContent.value.trim(),
            currentFriend.value.user_id,
            undefined
        )
        if (res.success) {
            ZXNotification({
                title: '成功啦~',
                message: '消息发送成功 ♪(´▽｀)',
                type: '🥳',
                position: 'top-right'
            })
            sendMessageDialogOpen.value = false
            currentFriend.value = null
        }
    } catch (error) {
        console.error('发送消息失败:', error)
        ZXNotification({
            title: '呜呼~',
            message: '消息发送失败了 (´；ω；`)',
            type: '😭',
            position: 'top-right'
        })
    }
}

const deleteFriend = async (friend: Friend) => {
    try {
        await ZXMessageBox({
            title: '移除好友确认',
            message: `确定要移除好友"${friend.nickname}"吗？此操作不可恢复。`,
            cancelButtonText: '取消',
            confirmButtonText: '确定',
            type: 'warning',
            onConfirm: async () => {
                const botId = botStore.getSelectedBotId() || ''
                const res = await manageApi.deleteFriend({
                    bot_id: botId,
                    user_id: friend.user_id
                })
                if (res.success) {
                    friends.value = friends.value.filter(f => f.user_id !== friend.user_id)
                    // 如果删除的是当前选中的好友，清空选中状态
                    if (selectedFriend.value?.user_id === friend.user_id) {
                        selectedFriend.value = null
                        friendDetail.value = null
                    }
                    ZXNotification({
                        title: '成功~',
                        message: '已移除好友',
                        type: '🥳',
                        position: 'top-right'
                    })
                }
            }
        })
    } catch {
        return
    }
}

onMounted(() => {
    loadFriends()
})
</script>

<template>
    <div class="w-full h-full flex flex-col space-y-3 sm:space-y-4">
        <!-- 头部标题和统计 -->
        <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0 bg-white rounded-2xl shadow-sm p-4 outline-1 outline-slate-200">
            <div class="flex items-center space-x-3">
                <Users class="h-6 w-6 text-blue-500 flex-shrink-0" />
                <h2 class="text-lg font-semibold text-gray-800">好友管理</h2>
                <span class="text-sm text-gray-500">(共 {{ filteredFriends.length }} 个)</span>
            </div>

            <!-- 搜索框 -->
            <div class="relative w-full sm:w-72">
                <Search class="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                    v-model="searchQuery"
                    type="text"
                    placeholder="搜索好友昵称或 ID..."
                    class="w-full pl-10 pr-10 py-2 border border-gray-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
            </div>
        </div>

        <!-- 主内容区域：左侧列表 + 右侧详情 -->
        <div class="flex-1 flex gap-4 min-h-0 overflow-hidden">
            <!-- 左侧：好友列表 -->
            <div class="flex-1 flex flex-col min-w-0">
                <!-- 统计卡片 -->
                <div class="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3 mb-3">
                    <div class="bg-white rounded-2xl shadow-sm outline-1 outline-slate-200 p-3 text-center">
                        <div class="text-lg sm:text-xl font-bold text-blue-600">{{ stats.total }}</div>
                        <div class="text-xs text-gray-500 mt-0.5">好友总数</div>
                    </div>
                </div>

                <!-- 好友列表 -->
                <div class="flex-1 overflow-y-auto">
                    <div v-if="loading" class="flex items-center justify-center h-full">
                        <div class="text-center text-gray-400">
                            <Users class="w-12 h-12 mx-auto mb-4 animate-pulse" />
                            <p>加载中...</p>
                        </div>
                    </div>

                    <div v-else-if="filteredFriends.length === 0" class="flex items-center justify-center h-full">
                        <div class="text-center text-gray-400">
                            <Users class="w-16 h-16 mx-auto mb-4 opacity-50" />
                            <p class="text-lg">没有找到好友</p>
                            <p class="text-sm mt-2">尝试调整搜索条件</p>
                        </div>
                    </div>

                    <!-- 网格视图 -->
                    <div
                        v-else
                        class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-3"
                    >
                        <div
                            v-for="friend in filteredFriends"
                            :key="friend.user_id"
                            class="cursor-pointer transition-all duration-200 rounded-2xl"
                            :class="{
                                'ring-2 ring-blue-500 shadow-lg': selectedFriend?.user_id === friend.user_id,
                                'hover:ring-2 hover:ring-blue-300': selectedFriend?.user_id !== friend.user_id
                            }"
                            @click="selectFriend(friend)"
                        >
                            <FriendCard
                                :friend="friend"
                                @send-message="sendMessage"
                                @delete-friend="deleteFriend"
                            />
                        </div>
                    </div>
                </div>
            </div>

            <!-- 右侧：好友详情面板 -->
            <div class="hidden lg:flex lg:flex-col w-80 flex-shrink-0 bg-white rounded-2xl shadow-sm outline-1 outline-slate-200 overflow-hidden">
                <!-- 未选中状态 -->
                <div v-if="!selectedFriend" class="flex-1 flex flex-col items-center justify-center text-gray-400 p-6">
                    <UserCircle class="w-16 h-16 mb-4 opacity-30" />
                    <p class="text-sm text-center">点击左侧好友卡片<br/>查看详细信息</p>
                </div>

                <!-- 加载状态 -->
                <div v-else-if="loadingDetail" class="flex-1 flex items-center justify-center">
                    <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                </div>

                <!-- 详情内容 -->
                <div v-else class="flex-1 flex flex-col overflow-hidden">
                    <div class="flex-1 overflow-y-auto p-4 space-y-4">
                        <!-- 好友基本信息和编辑 -->
                        <FriendDetailInfo
                            :friend="friendDetail"
                            @updated="refreshFriendDetail"
                        />

                        <!-- 互动趋势图表 -->
                        <div class="bg-white rounded-2xl outline-1 outline-slate-200 p-4">
                            <FriendTrendChart :user-id="selectedFriend?.user_id || null" />
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- 发送消息对话框 -->
        <Teleport to="body">
            <Transition name="modal-jelly" :duration="{ enter: 500, leave: 250 }">
                <div v-if="sendMessageDialogOpen" class="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <!-- 背景遮罩 -->
                    <div class="fixed inset-0 glass-overlay" @click="sendMessageDialogOpen = false"></div>

                    <!-- 对话框 -->
                    <div class="modal-content relative bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[85vh] flex flex-col overflow-hidden">
                    <!-- 头部 -->
                    <div class="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-blue-100">
                        <h3 class="text-lg font-semibold text-gray-800">发送消息</h3>
                        <button @click="sendMessageDialogOpen = false" class="p-1 rounded-2xl hover:bg-white/50 transition-colors">
                            <svg class="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                            </svg>
                        </button>
                    </div>

                    <!-- 内容区 -->
                    <div class="flex-1 overflow-y-auto p-6">
                        <div v-if="currentFriend" class="send-message-form">
                            <div class="message-target">
                                <img :src="currentFriend.ava_url" class="message-target-avatar" />
                                <div class="message-target-info">
                                    <span class="message-target-name">{{ currentFriend.nickname }}</span>
                                    <span class="message-target-id">{{ currentFriend.user_id }}</span>
                                </div>
                            </div>
                            <el-input
                                v-model="messageContent"
                                type="textarea"
                                placeholder="输入消息内容..."
                                :rows="6"
                                resize="vertical"
                                class="message-input"
                            />
                            <div class="dialog-actions">
                                <el-button @click="sendMessageDialogOpen = false" round>取消</el-button>
                                <el-button @click="confirmSendMessage" type="primary" round>发送</el-button>
                            </div>
                        </div>
                    </div>
                </div>
                </div>
            </Transition>
        </Teleport>
    </div>
</template>

<style scoped>
.message-target {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px;
    background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%);
    border-radius: 12px;
    margin-bottom: 16px;
}

.message-target-avatar {
    width: 48px;
    height: 48px;
    border-radius: 50%;
    box-shadow: 0 2px 8px rgba(59, 130, 246, 0.2);
}

.message-target-name {
    font-weight: 600;
    color: #1f2937;
    font-size: 14px;
}

.message-target-id {
    font-size: 12px;
    color: #6b7280;
    font-family: monospace;
}

.message-input :deep(.el-textarea__inner) {
    border-radius: 12px;
    border-color: #e5e7eb;
}

.message-input :deep(.el-textarea__inner:focus) {
    border-color: #3b82f6;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.dialog-actions {
    display: flex;
    justify-content: flex-end;
    gap: 8px;
    margin-top: 16px;
}

/* 自定义滚动条样式 */
.overflow-y-auto::-webkit-scrollbar {
    width: 8px;
}

.overflow-y-auto::-webkit-scrollbar-track {
    background: #f1f5f9;
    border-radius: 4px;
}

.overflow-y-auto::-webkit-scrollbar-thumb {
    background: #cbd5e1;
    border-radius: 4px;
}

.overflow-y-auto::-webkit-scrollbar-thumb:hover {
    background: #94a3b8;
}
</style>