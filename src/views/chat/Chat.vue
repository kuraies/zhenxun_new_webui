<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount, watch } from 'vue'
import { MessageSquare, Send, Users, Group as GroupIcon, Image as ImageIcon, ArrowLeft } from 'lucide-vue-next'
import { chatApi } from '@/utils/api-next'
import { useBotStore } from '@/store/bot'
import { usePolling } from '@/composables/usePolling'
import type { ChatMessage, Friend, Group as GroupType, MessageType } from '@/types/chat.types'
import { ZXNotification } from '@/components'
import {
    initWebSocket,
    addMessageCallback,
    removeMessageCallback,
    sendMessage as sendWsMessage,
    isConnected
} from '@/utils/api-next/websocket-chat'

const botStore = useBotStore()

// 聊天数据
const messages = ref<ChatMessage[]>([])
const inputMessage = ref('')
const selectedContact = ref<'friend' | 'group' | null>(null)
const selectedId = ref<string>('')
const selectedName = ref<string>('')
const activeTab = ref<'friend' | 'group'>('friend')

// 联系人列表
const friends = ref<Friend[]>([])
const groups = ref<GroupType[]>([])
const loadingContacts = ref(false)

// WebSocket 连接状态
let wsConnected = ref(false)

// 消息容器 ref
const messagesContainer = ref<HTMLElement | null>(null)

// 当前 bot 信息
const currentBot = ref<{ self_id: string; name?: string } | null>(null)

// 文件输入 ref
const imageInput = ref<HTMLInputElement | null>(null)

// 获取当前选中联系人的详细信息
const currentContactInfo = computed(() => {
    if (!selectedContact.value || !selectedId.value) {
        return null
    }
    if (selectedContact.value === 'friend') {
        const friend = friends.value.find(f => f.user_id === selectedId.value)
        if (friend) {
            return {
                name: friend.nickname || friend.remark || '未知好友',
                id: friend.user_id,
                avatar: friend.ava_url
            }
        }
    } else if (selectedContact.value === 'group') {
        const group = groups.value.find(g => g.group_id === selectedId.value)
        if (group) {
            return {
                name: group.group_name,
                id: group.group_id,
                avatar: group.ava_url
            }
        }
    }
    return null
})

// 获取联系人列表
const loadContacts = async () => {
    loadingContacts.value = true
    try {
        // 获取 bot_id（使用全局选中的 Bot）
        if (botStore.botList.length === 0) {
            await botStore.getBotList()
        }
        // 使用选中的 Bot ID，如果没有选中则使用最新的 Bot
        const botId = botStore.getSelectedBotId()

        if (!botId) {
            ZXNotification({
                title: '呜呼～',
                message: '还没有找到可用的 Bot 哦 (っ °Д °;) っ',
                type: '😭',
                position: 'top-right'
            })
            return
        }

        // 获取好友列表
        const friendRes = await chatApi.getFriendList(botId)
        if (friendRes?.success && friendRes?.data) {
            friends.value = friendRes.data
        }

        // 获取群组列表
        const groupRes = await chatApi.getGroupList(botId)
        if (groupRes?.success && groupRes?.data) {
            groups.value = groupRes.data
        }
    } catch (error) {
        console.error('加载联系人列表失败:', error)
    } finally {
        loadingContacts.value = false
    }
}

// 获取当前可用的 bot（使用全局选中的 Bot）
const getCurrentBot = () => {
    return botStore.selectedBot || null
}

// 连接状态检查轮询（页面可见性感知）
const { start: startConnectionPolling, stop: stopConnectionPolling } = usePolling(
    () => { wsConnected.value = isConnected() },
    1000,
    { autoStart: false }
)

// 初始化 WebSocket 连接
const initWebSocketConnection = () => {
    initWebSocket()
    // 立即检查一次
    wsConnected.value = isConnected()
    // 启动可见性感知的连接状态轮询
    startConnectionPolling()
}

// 消息回调处理
const handleWebSocketMessage = (data: any) => {
    console.log('收到 WebSocket 消息:', data)

    // 检查是否在选中的聊天中
    const objectId = data.group_id || data.user_id
    if (selectedId.value !== objectId) {
        // 不在选中的聊天中，忽略
        return
    }

    // 解析消息内容
    let messageText = ''
    let messageType: MessageType = 'text'
    let imageUrl = ''

    if (Array.isArray(data.message)) {
        // 查找是否有图片消息
        const imageItem = data.message.find((item: any) => item.type === 'img' || item.type === 'image')
        if (imageItem) {
            messageType = 'image'
            // 图片消息的 url 可能在 data 字段中
            imageUrl = imageItem.url || imageItem.data || imageItem.msg || ''
        }
        // 拼接文本消息
        messageText = data.message
            .filter((item: any) => item.type === 'text')
            .map((item: any) => item.msg)
            .join('')
    } else {
        messageText = (data as any).msg || ''
    }

    // 是否是自己的消息
    const isSelfMessage = currentBot.value ? data.user_id === currentBot.value.self_id : false

    const newMessage: ChatMessage = {
        id: Date.now() + Math.random(),
        user_id: data.user_id,
        user_name: data.name || '未知用户',
        avatar: data.ava_url,
        message: messageType === 'image' ? imageUrl : messageText,
        message_type: messageType,
        timestamp: new Date().toISOString(),
        is_self: isSelfMessage,
        group_id: data.group_id,
    }

    messages.value.push(newMessage)
    scrollToBottom()
}

// 发送消息（采用旧项目的 `/manage/send_message` 接口）
const handleSendMessage = async () => {
    if (!inputMessage.value.trim()) {
        ZXNotification({
            title: '提示',
            message: '消息不能为空哦～',
            type: 'info',
            position: 'top-right'
        })
        return
    }

    if (!selectedContact.value || !selectedId.value) {
        ZXNotification({
            title: '呜呼～',
            message: '请先选择一个聊天对象哦 (っ °Д °;) っ',
            type: '😭',
            position: 'top-right'
        })
        return
    }

    const bot = getCurrentBot()
    if (!bot || !bot.self_id) {
        ZXNotification({
            title: '呜呼～',
            message: '没有找到可用的 Bot (っ °Д °;) っ',
            type: '😭',
            position: 'top-right'
        })
        return
    }

    try {
        // 获取 bot 头像 URL
        const botAvatar = bot.ava_url || `http://q1.qlogo.cn/g?b=qq&nk=${bot.self_id}&s=160`

        // 添加到消息列表（立即显示）
        const newMessage: ChatMessage = {
            id: Date.now(),
            user_id: bot.self_id,
            user_name: '小真寻',
            avatar: botAvatar,
            message: inputMessage.value,
            message_type: 'text',
            timestamp: new Date().toISOString(),
            is_self: true,
            group_id: selectedContact.value === 'group' ? selectedId.value : undefined,
        }
        messages.value.push(newMessage)

        // 使用旧项目的 WebSocket 模块发送消息（调用 /manage/send_message 接口）
        await sendWsMessage(
            { self_id: bot.self_id, name: bot.name },
            selectedContact.value === 'group' ? selectedId.value : null,
            selectedContact.value === 'friend' ? selectedId.value : null,
            inputMessage.value
        )

        inputMessage.value = ''
        scrollToBottom()

        ZXNotification({
            title: '发送成功～',
            message: '消息已经发送成功啦！',
            type: '🥳',
            position: 'top-right'
        })
    } catch (error: any) {
        console.error('发送消息失败:', error)
        // 发送失败，移除刚添加的消息
        messages.value.pop()
        ZXNotification({
            title: '发送失败',
            message: '消息发送失败了 (´；ω；`)',
            type: '😭',
            position: 'top-right'
        })
    }
}

// 选择联系人
const selectContact = (type: 'friend' | 'group', id: string, name: string) => {
    selectedContact.value = type
    selectedId.value = id
    selectedName.value = name
    // 清空消息列表（历史消息功能已移除）
    messages.value = []
}

// 触发图片上传
const triggerImageUpload = () => {
    imageInput.value?.click()
}

// 将文件转换为 base64
const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(reader.result as string)
        reader.onerror = reject
        reader.readAsDataURL(file)
    })
}

// 处理图片选择
const handleImageSelect = async (event: Event) => {
    const input = event.target as HTMLInputElement
    const file = input.files?.[0]
    if (!file) return

    // 验证文件类型
    if (!file.type.startsWith('image/')) {
        ZXNotification({
            title: '提示',
            message: '请选择图片文件哦～',
            type: 'info',
            position: 'top-right'
        })
        return
    }

    // 验证文件大小 (限制 10MB)
    if (file.size > 10 * 1024 * 1024) {
        ZXNotification({
            title: '提示',
            message: '图片大小不能超过 10MB 哦～',
            type: 'info',
            position: 'top-right'
        })
        return
    }

    if (!selectedContact.value || !selectedId.value) {
        ZXNotification({
            title: '呜呼～',
            message: '请先选择一个聊天对象哦 (っ °Д °;) っ',
            type: '😭',
            position: 'top-right'
        })
        return
    }

    const bot = getCurrentBot()
    if (!bot || !bot.self_id) {
        ZXNotification({
            title: '呜呼～',
            message: '没有找到可用的 Bot (っ °Д °;) っ',
            type: '😭',
            position: 'top-right'
        })
        return
    }

    try {
        // 转换为 base64
        const base64Data = await fileToBase64(file)
        const botAvatar = bot.ava_url || `http://q1.qlogo.cn/g?b=qq&nk=${bot.self_id}&s=160`

        // 添加到消息列表（立即显示）
        const newMessage: ChatMessage = {
            id: Date.now(),
            user_id: bot.self_id,
            user_name: '小真寻',
            avatar: botAvatar,
            message: base64Data,
            message_type: 'image',
            timestamp: new Date().toISOString(),
            is_self: true,
            group_id: selectedContact.value === 'group' ? selectedId.value : undefined,
        }
        messages.value.push(newMessage)

        // 发送图片消息 (使用 base64:// 前缀)
        const imageMessage = `base64://${base64Data.split(',')[1]}`
        await sendWsMessage(
            { self_id: bot.self_id, name: bot.name },
            selectedContact.value === 'group' ? selectedId.value : null,
            selectedContact.value === 'friend' ? selectedId.value : null,
            imageMessage
        )

        scrollToBottom()

        ZXNotification({
            title: '发送成功～',
            message: '图片已经发送成功啦！',
            type: '🥳',
            position: 'top-right'
        })
    } catch (error: any) {
        console.error('发送图片失败:', error)
        // 发送失败，移除刚添加的消息
        messages.value.pop()
        ZXNotification({
            title: '发送失败',
            message: '图片发送失败了 (´；ω；`)',
            type: '😭',
            position: 'top-right'
        })
    } finally {
        // 清空文件输入
        input.value = ''
    }
}

// 滚动到底部
const scrollToBottom = () => {
    if (messagesContainer.value) {
        setTimeout(() => {
            messagesContainer.value?.scrollTo({
                top: messagesContainer.value.scrollHeight,
                behavior: 'smooth'
            })
        }, 100)
    }
}

// 监听消息变化，自动滚动
watch(
    () => messages.value.length,
    () => {
        scrollToBottom()
    }
)

onMounted(async () => {
    // 获取并保存当前 bot 信息
    const bot = getCurrentBot()
    currentBot.value = bot ? { self_id: bot.self_id || '', name: bot.name } : null

    await loadContacts()
    initWebSocketConnection()

    // 注册消息回调
    addMessageCallback(handleWebSocketMessage)

    scrollToBottom()
})

onBeforeUnmount(() => {
    // 移除消息回调
    removeMessageCallback(handleWebSocketMessage)
    // 停止连接状态轮询
    stopConnectionPolling()
    // 注意：不断开 WebSocket 连接，因为其他组件可能还在使用
})
</script>

<template>
    <div class="w-full h-full flex flex-col space-y-3 sm:space-y-4">
        <!-- 头部标题 -->
        <div class="flex items-center justify-between bg-white rounded-2xl shadow-sm p-4 outline-1 outline-slate-200">
            <div class="flex items-center space-x-2 sm:space-x-3 min-w-0">
                <MessageSquare class="h-5 w-5 sm:h-6 sm:w-6 text-blue-500 flex-shrink-0" />
                <h2 class="text-base sm:text-lg font-semibold text-gray-800 truncate">聊天</h2>
                <span class="text-xs sm:text-sm text-gray-500 truncate" v-if="selectedName">
                    - {{ selectedName }}
                </span>
                <span class="text-xs text-gray-400 hidden sm:inline" v-if="wsConnected">
                    (已连接)
                </span>
                <span class="text-xs text-orange-400 hidden sm:inline" v-else>
                    (未连接)
                </span>
            </div>
        </div>

        <div class="flex-1 flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-3 lg:space-x-4 overflow-hidden min-w-0">
            <!-- 联系人列表 - 使用标签页切换好友/群组 -->
            <div :class="[
                'bg-white rounded-2xl shadow-sm outline-1 outline-slate-200 flex flex-col overflow-hidden transition-all duration-300 min-w-0',
                selectedContact ? 'hidden sm:flex' : 'flex',
                'w-full sm:w-[calc(var(--spacing)*50)] md:w-64 lg:w-72 flex-shrink-0'
            ]">
                <!-- 标签页切换 -->
                <el-tabs v-model="activeTab" class="contact-tabs">
                    <el-tab-pane name="friend">
                        <template #label>
                            <span class="tab-label">
                                <Users class="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                                <span class="text-xs sm:text-sm">好友</span>
                                <span class="tab-count">{{ friends.length }}</span>
                            </span>
                        </template>
                    </el-tab-pane>
                    <el-tab-pane name="group">
                        <template #label>
                            <span class="tab-label">
                                <GroupIcon class="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                                <span class="text-xs sm:text-sm">群组</span>
                                <span class="tab-count">{{ groups.length }}</span>
                            </span>
                        </template>
                    </el-tab-pane>
                </el-tabs>

                <!-- 好友列表 -->
                <div v-show="activeTab === 'friend'" class="flex-1 overflow-y-auto p-1.5 sm:p-2 space-y-0.5 sm:space-y-1 min-h-0">
                    <div
                        v-for="friend in friends"
                        :key="friend.user_id"
                        @click="selectContact('friend', friend.user_id, friend.nickname || friend.remark || '未知好友')"
                        :class="selectedId === friend.user_id && selectedContact === 'friend' ? 'bg-blue-50' : 'hover:bg-gray-50'"
                        class="p-1.5 sm:p-2 rounded-2xl cursor-pointer transition-colors flex items-center gap-2 sm:gap-3 btn-touch"
                    >
                        <img
                            v-if="friend.ava_url"
                            :src="friend.ava_url"
                            referrerpolicy="no-referrer"
                            class="w-7 h-7 sm:w-8 sm:h-8 rounded-full object-cover flex-shrink-0"
                            @error="friend.ava_url = ''"
                        />
                        <div
                            v-else
                            class="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 text-xs sm:text-sm font-bold flex-shrink-0"
                        >
                            {{ (friend.nickname || friend.remark || '友').charAt(0) }}
                        </div>
                        <span class="text-xs sm:text-sm text-gray-700 truncate flex-1 min-w-0">{{ friend.nickname || friend.remark || '未知好友' }}</span>
                    </div>
                    <div v-if="loadingContacts" class="text-center text-xs text-gray-400 py-2">加载中...</div>
                    <div v-if="!loadingContacts && friends.length === 0" class="text-center text-xs text-gray-400 py-2">暂无好友</div>
                </div>

                <!-- 群组列表 -->
                <div v-show="activeTab === 'group'" class="flex-1 overflow-y-auto p-1.5 sm:p-2 space-y-0.5 sm:space-y-1 min-h-0">
                    <div
                        v-for="group in groups"
                        :key="group.group_id"
                        @click="selectContact('group', group.group_id, group.group_name)"
                        :class="selectedId === group.group_id && selectedContact === 'group' ? 'bg-blue-50' : 'hover:bg-gray-50'"
                        class="p-1.5 sm:p-2 rounded-2xl cursor-pointer transition-colors flex items-center gap-2 sm:gap-3 btn-touch"
                    >
                        <img
                            v-if="group.ava_url"
                            :src="group.ava_url"
                            referrerpolicy="no-referrer"
                            class="w-7 h-7 sm:w-8 sm:h-8 rounded-full object-cover flex-shrink-0"
                            @error="group.ava_url = ''"
                        />
                        <div
                            v-else
                            class="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-pink-100 flex items-center justify-center text-pink-600 text-xs sm:text-sm font-bold flex-shrink-0"
                        >
                            {{ group.group_name.charAt(0) }}
                        </div>
                        <span class="text-xs sm:text-sm text-gray-700 truncate flex-1 min-w-0">{{ group.group_name }}</span>
                    </div>
                    <div v-if="loadingContacts" class="text-center text-xs text-gray-400 py-2">加载中...</div>
                    <div v-if="!loadingContacts && groups.length === 0" class="text-center text-xs text-gray-400 py-2">暂无群组</div>
                </div>
            </div>

            <!-- 聊天区域 -->
            <div :class="[
                'flex-1 bg-white rounded-2xl shadow-sm outline-1 outline-slate-200 flex flex-col overflow-hidden min-w-0',
                selectedContact ? 'flex' : 'hidden sm:flex'
            ]">
                <!-- 当前聊天信息 -->
                <div v-if="currentContactInfo" class="flex items-center space-x-3 px-4 py-3 border-b border-gray-100 bg-gray-50">
                    <!-- 移动端返回按钮 -->
                    <button
                        @click="selectedContact = null; selectedId = ''"
                        class="sm:hidden p-1.5 hover:bg-gray-100 rounded-2xl transition-colors text-gray-500 flex-shrink-0"
                    >
                        <ArrowLeft class="w-5 h-5" />
                    </button>
                    <div class="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 text-sm font-bold flex-shrink-0 overflow-hidden">
                        <img
                            v-if="currentContactInfo.avatar"
                            :src="currentContactInfo.avatar"
                            referrerpolicy="no-referrer"
                            class="w-full h-full object-cover"
                            @error="(e) => (e.target as HTMLImageElement).style.display = 'none'"
                        />
                        <span v-if="!currentContactInfo.avatar">{{ currentContactInfo.name.charAt(0) }}</span>
                    </div>
                    <div class="flex-1 min-w-0">
                        <p class="text-sm font-semibold text-gray-800 truncate">{{ currentContactInfo.name }}</p>
                        <p class="text-xs text-gray-500 truncate">{{ currentContactInfo.id }}</p>
                    </div>
                </div>
                <div v-else class="flex items-center justify-center px-4 py-3 border-b border-gray-100 bg-gray-50">
                    <p class="text-sm text-gray-500">请选择一个聊天对象</p>
                </div>

                <!-- 消息列表 -->
                <div
                    ref="messagesContainer"
                    class="flex-1 overflow-y-auto p-3 sm:p-4 space-y-3 sm:space-y-4"
                >
                    <div v-if="messages.length === 0" class="flex items-center justify-center h-full text-gray-400">
                        <div class="text-center px-4">
                            <MessageSquare class="w-12 h-12 sm:w-16 sm:h-16 mx-auto mb-4 opacity-50" />
                            <p class="text-sm sm:text-base">暂无消息</p>
                            <p class="text-xs sm:text-sm mt-2">选择一个联系人开始聊天吧～</p>
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
                            class="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 text-xs sm:text-sm font-bold flex-shrink-0 overflow-hidden"
                        >
                            <img
                                v-if="message.avatar"
                                :src="message.avatar"
                                referrerpolicy="no-referrer"
                                class="w-full h-full object-cover"
                                @error="message.avatar = ''"
                            />
                            <span v-else>{{ (message.user_name || message.user_id).charAt(0) }}</span>
                        </div>

                        <!-- 消息气泡 -->
                        <div
                            :class="message.is_self ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-800'"
                            class="max-w-[70%] sm:max-w-md px-3 sm:px-4 py-2 rounded-2xl sm:rounded-2xl"
                        >
                            <p class="text-xs sm:text-sm" v-if="!message.is_self">{{ message.user_name || '未知用户' }}</p>

                            <!-- 图片消息 -->
                            <div v-if="message.message_type === 'image'" class="mt-1">
                                <el-image
                                    :src="message.message"
                                    class="rounded-2xl max-w-full h-auto"
                                    style="max-width: 200px;"
                                    fit="cover"
                                    :preview-src-list="[message.message]"
                                    referrerpolicy="no-referrer"
                                    hide-on-click-modal
                                >
                                    <template #placeholder>
                                        <div class="image-placeholder flex items-center justify-center h-32 bg-gray-100 rounded-2xl">
                                            <div class="text-gray-400 text-xs">加载中...</div>
                                        </div>
                                    </template>
                                    <template #error>
                                        <div class="image-error flex items-center justify-center h-32 bg-gray-100 rounded-2xl">
                                            <div class="text-center text-gray-400">
                                                <div class="text-2xl mb-1">⚠️</div>
                                                <span class="text-xs">图片加载失败</span>
                                            </div>
                                        </div>
                                    </template>
                                </el-image>
                            </div>

                            <!-- 文本消息 -->
                            <p v-else class="text-xs sm:text-sm break-words">{{ message.message }}</p>

                            <p
                                :class="message.is_self ? 'text-blue-100' : 'text-gray-500'"
                                class="text-xs mt-1 text-right"
                            >
                                {{ new Date(message.timestamp).toLocaleTimeString() }}
                            </p>
                        </div>

                        <!-- 自己的头像 -->
                        <div
                            v-if="message.is_self"
                            class="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-pink-100 flex items-center justify-center text-pink-600 text-xs sm:text-sm font-bold flex-shrink-0 overflow-hidden"
                        >
                            <img
                                v-if="message.avatar"
                                :src="message.avatar"
                                referrerpolicy="no-referrer"
                                class="w-full h-full object-cover"
                                @error="message.avatar = ''"
                            />
                            <span v-else>{{ '自' }}</span>
                        </div>
                    </div>
                </div>

                <!-- 输入框区域 -->
                <div class="p-3 sm:p-4 border-t border-gray-100">
                    <!-- 工具栏 -->
                    <div class="flex items-center space-x-1 sm:space-x-2 mb-2">
                        <button
                            @click="triggerImageUpload"
                            class="p-2 hover:bg-gray-100 rounded-2xl transition-colors text-gray-500 btn-touch"
                            title="发送图片"
                        >
                            <ImageIcon class="w-4 h-4 sm:w-5 sm:h-5" />
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
                    <div class="flex items-center space-x-2 sm:space-x-3">
                        <input
                            v-model="inputMessage"
                            @keyup.enter="handleSendMessage"
                            type="text"
                            placeholder="输入消息，按 Enter 发送..."
                            class="flex-1 px-3 sm:px-4 py-2 border border-gray-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                        <button
                            @click="handleSendMessage"
                            class="px-4 sm:px-6 py-2 bg-blue-500 text-white rounded-2xl text-sm font-medium hover:bg-blue-600 transition-colors flex items-center space-x-1 sm:space-x-2 btn-touch flex-shrink-0"
                        >
                            <Send class="w-4 h-4" />
                            <span class="hidden sm:inline">发送</span>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<style scoped>
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
