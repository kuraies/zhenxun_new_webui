<script setup lang="ts">
import { ref } from 'vue'
import { Users, MoreVertical, Eye, ToggleLeft, ToggleRight, LogOut } from 'lucide-vue-next'
import gsap from 'gsap'
import type { Group } from '@/types/manage.types'
import { ZXNotification } from '@/components'

const props = defineProps<{
    group: Group
}>()

const emit = defineEmits<{
    (e: 'view-detail', group: Group): void
    (e: 'toggle-status', group: Group): void
    (e: 'leave-group', group: Group): void
}>()

const processing = ref(false)
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

// 查看详情
const handleViewDetail = () => {
    playClickFeedback()
    emit('view-detail', props.group)
}

// 切换状态
const handleToggleStatus = async () => {
    if (processing.value) return
    playClickFeedback()
    processing.value = true
    emit('toggle-status', props.group)
    processing.value = false
}

// 退群
const handleLeaveGroup = () => {
    if (processing.value) return
    playClickFeedback()
    emit('leave-group', props.group)
}
</script>

<template>
    <div
        ref="cardRef"
        class="flip-card group bg-white rounded-2xl shadow-sm outline-1 outline-slate-200 overflow-hidden transition-shadow duration-300"
        :class="{ 'opacity-75': !group.status }"
        @mouseenter="handleMouseEnter"
        @mouseleave="handleMouseLeave"
    >
        <div class="p-4 flex flex-col gap-3">
            <!-- 头部：群组信息 + 状态 -->
            <div class="flex items-center justify-between gap-2">
                <div class="flex items-center gap-3 min-w-0">
                    <img
                        :src="group.ava_url"
                        :alt="group.group_name"
                        class="w-12 h-12 rounded-2xl object-cover flex-shrink-0 outline-1 outline-slate-200"
                    />
                    <div class="min-w-0 flex-1">
                        <h3 class="text-base font-bold text-gray-800 truncate" :title="group.group_name">
                            {{ group.group_name }}
                        </h3>
                        <p class="text-xs text-gray-500 mt-0.5">
                            ID: {{ group.group_id }}
                        </p>
                    </div>
                </div>

                <!-- 状态标签 -->
                <span
                    :class="group.status ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'"
                    class="px-2 py-0.5 rounded-full text-[11px] font-medium flex-shrink-0"
                >
                    {{ group.status ? '已启用' : '已禁用' }}
                </span>
            </div>

            <!-- 成员数量 -->
            <div class="flex items-center gap-1.5 text-sm text-gray-600">
                <Users class="w-4 h-4 text-gray-400 flex-shrink-0" />
                <span class="font-medium">{{ group.member_count || 0 }}</span>
                <span class="text-gray-400">人</span>
                <span v-if="group.max_member_count" class="text-gray-400">/ {{ group.max_member_count }}</span>
            </div>
        </div>

        <!-- 底部操作栏 -->
        <div class="px-4 pb-4 pt-0 flex items-center gap-2">
            <!-- 详情按钮 -->
            <button
                @click="handleViewDetail"
                :disabled="processing"
                class="flex-1 px-3 py-2 bg-blue-50 text-blue-600 rounded-2xl text-sm font-medium hover:bg-blue-100 transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5 btn-touch"
            >
                <Eye class="w-4 h-4" />
                <span>详情</span>
            </button>

            <!-- 开关切换 -->
            <button
                @click="handleToggleStatus"
                :disabled="processing"
                class="px-3 py-2 rounded-2xl transition-colors disabled:opacity-50 btn-touch flex-shrink-0"
                :class="group.status
                    ? 'bg-amber-50 text-amber-600 hover:bg-amber-100'
                    : 'bg-green-50 text-green-600 hover:bg-green-100'"
                :title="group.status ? '禁用群组' : '启用群组'"
            >
                <ToggleRight v-if="group.status" class="w-5 h-5" />
                <ToggleLeft v-else class="w-5 h-5" />
            </button>

            <!-- 退群按钮 -->
            <button
                @click="handleLeaveGroup"
                :disabled="processing"
                class="px-3 py-2 bg-red-50 text-red-600 rounded-2xl hover:bg-red-100 transition-colors disabled:opacity-50 btn-touch flex-shrink-0"
                title="退出群组"
            >
                <LogOut class="w-5 h-5" />
            </button>
        </div>
    </div>
</template>
