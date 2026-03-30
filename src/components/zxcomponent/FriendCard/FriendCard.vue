<script setup lang="ts">
import { MessageCircle, UserX } from 'lucide-vue-next'
import type { Friend } from '@/types/manage.types'

const props = defineProps<{
    friend: Friend
}>()

const emit = defineEmits<{
    (e: 'send-message', friend: Friend): void
    (e: 'delete-friend', friend: Friend): void
}>()

// 发送消息
const handleSendMessage = () => {
    emit('send-message', props.friend)
}

// 移除好友
const handleDeleteFriend = () => {
    emit('delete-friend', props.friend)
}
</script>

<template>
    <div
        class="friend bg-white rounded-2xl shadow-sm outline-1 outline-slate-200 overflow-hidden transition-all duration-300 hover:shadow-xl hover:-translate-y-1"
    >
        <div class="p-4 flex flex-col gap-3">
            <!-- 头部：好友信息 -->
            <div class="flex items-center gap-3">
                <img
                    :src="friend.ava_url"
                    :alt="friend.nickname"
                    class="w-12 h-12 rounded-full object-cover flex-shrink-0 outline-1 outline-slate-200"
                />
                <div class="min-w-0 flex-1">
                    <h3 class="text-base font-bold text-gray-800 truncate" :title="friend.nickname">
                        {{ friend.nickname }}
                    </h3>
                    <p class="text-xs text-gray-500 mt-0.5">
                        ID: {{ friend.user_id }}
                    </p>
                </div>
            </div>
        </div>

        <!-- 底部操作栏 -->
        <div class="px-4 pb-4 pt-0 flex items-center gap-2">
            <!-- 发送消息按钮 -->
            <button
                @click="handleSendMessage"
                class="flex-1 px-3 py-2 bg-blue-50 text-blue-600 rounded-2xl text-sm font-medium hover:bg-blue-100 transition-colors flex items-center justify-center gap-1.5 btn-touch"
            >
                <MessageCircle class="w-4 h-4" />
                <span>消息</span>
            </button>

            <!-- 移除好友按钮 -->
            <button
                @click="handleDeleteFriend"
                class="px-3 py-2 bg-red-50 text-red-600 rounded-2xl hover:bg-red-100 transition-colors btn-touch flex-shrink-0"
                title="移除好友"
            >
                <UserX class="w-5 h-5" />
            </button>
        </div>
    </div>
</template>
