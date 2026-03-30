<script setup lang="ts">
import { ref } from 'vue'
import { Users, MoreVertical, Eye, ToggleLeft, ToggleRight, LogOut } from 'lucide-vue-next'
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

// 查看详情
const handleViewDetail = () => {
    emit('view-detail', props.group)
}

// 切换状态
const handleToggleStatus = async () => {
    if (processing.value) return
    processing.value = true
    emit('toggle-status', props.group)
    processing.value = false
}

// 退群
const handleLeaveGroup = () => {
    if (processing.value) return
    emit('leave-group', props.group)
}
</script>

<template>
    <div
        class="group bg-white rounded-2xl shadow-sm outline-1 outline-slate-200 overflow-hidden transition-all duration-300 hover:shadow-xl hover:-translate-y-1"
        :class="{ 'opacity-75': !group.status }"
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
