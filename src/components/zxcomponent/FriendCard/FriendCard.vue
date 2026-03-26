<script setup lang="ts">
import { ref } from 'vue'
import { MessageCircle, UserX } from 'lucide-vue-next'
import gsap from 'gsap'
import type { Friend } from '@/types/manage.types'

const props = defineProps<{
    friend: Friend
}>()

const emit = defineEmits<{
    (e: 'send-message', friend: Friend): void
    (e: 'delete-friend', friend: Friend): void
}>()

const cardRef = ref<HTMLElement | null>(null)

// 卡片悬停动画
const handleMouseEnter = () => {
    if (!cardRef.value) return
    gsap.to(cardRef.value, {
        y: -4,
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
        duration: 0.25,
        ease: 'power2.out'
    })
}

const handleMouseLeave = () => {
    if (!cardRef.value) return
    gsap.to(cardRef.value, {
        y: 0,
        boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
        duration: 0.25,
        ease: 'power2.out'
    })
}

// 点击反馈动画
const playClickFeedback = () => {
    if (!cardRef.value) return
    gsap.timeline()
        .to(cardRef.value, {
            scale: 0.98,
            duration: 0.08,
            ease: 'power2.in'
        })
        .to(cardRef.value, {
            scale: 1,
            duration: 0.15,
            ease: 'back.out(1.5)'
        })
}

// 发送消息
const handleSendMessage = () => {
    playClickFeedback()
    emit('send-message', props.friend)
}

// 移除好友
const handleDeleteFriend = () => {
    playClickFeedback()
    emit('delete-friend', props.friend)
}
</script>

<template>
    <div
        ref="cardRef"
        class="flip-card friend bg-white rounded-2xl shadow-sm outline-1 outline-slate-200 overflow-hidden transition-shadow duration-300"
        @mouseenter="handleMouseEnter"
        @mouseleave="handleMouseLeave"
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
