<script setup lang="ts">
import { ref, watch } from 'vue'
import { Coins, Heart, Pencil, Check, X } from 'lucide-vue-next'
import { ZXNotification } from '@/components'
import { manageApi } from '@/utils/api-next'
import type { FriendDetail } from '@/types/manage.types'

const props = defineProps<{
    friend: FriendDetail | null
}>()

const emit = defineEmits<{
    updated: []
}>()

// 编辑状态
const editingField = ref<'gold' | 'favorability' | null>(null)
const editValue = ref<number>(0)
const saving = ref(false)

// 开始编辑
const startEdit = (field: 'gold' | 'favorability') => {
    if (!props.friend) return
    editingField.value = field
    editValue.value = props.friend[field]
}

// 取消编辑
const cancelEdit = () => {
    editingField.value = null
    editValue.value = 0
}

// 确认保存
const confirmSave = async () => {
    if (!props.friend || !editingField.value) return

    saving.value = true
    try {
        const request: Record<string, number | string> = {
            user_id: props.friend.user_id,
            [editingField.value]: editValue.value
        }

        const res = await manageApi.updateFriend(request as any)
        if (res.success) {
            ZXNotification({
                title: '成功啦~',
                message: '好友数据更新成功',
                type: 'success',
                position: 'top-right'
            })
            // 更新本地数据
            if (props.friend) {
                props.friend[editingField.value] = editValue.value
            }
            emit('updated')
        } else {
            ZXNotification({
                title: '呜呼~',
                message: res.message || '更新失败',
                type: 'error',
                position: 'top-right'
            })
        }
    } catch (error) {
        console.error('更新好友数据失败:', error)
        ZXNotification({
            title: '对不起',
            message: '好友数据更新失败了',
            type: 'error',
            position: 'top-right'
        })
    } finally {
        saving.value = false
        editingField.value = null
    }
}

// 监听 friend 变化，重置编辑状态
watch(() => props.friend, () => {
    editingField.value = null
})
</script>

<template>
    <div class="friend-detail-info">
        <div v-if="friend" class="space-y-4">
            <!-- 头部信息 -->
            <div class="friend-header bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-4">
                <div class="flex items-center gap-4">
                    <img
                        :src="friend.ava_url"
                        :alt="friend.nickname"
                        class="w-16 h-16 rounded-full object-cover shadow-lg ring-2 ring-white"
                    />
                    <div class="flex-1 min-w-0">
                        <h3 class="text-lg font-semibold text-gray-800 truncate">
                            {{ friend.nickname }}
                        </h3>
                        <p class="text-sm text-gray-500 font-mono">
                            ID: {{ friend.user_id }}
                        </p>
                    </div>
                </div>
            </div>

            <!-- 数据信息 -->
            <div class="grid grid-cols-2 gap-3">
                <!-- 金币 -->
                <div class="bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl p-4 outline-1 outline-amber-200">
                    <div class="flex items-center justify-between mb-2">
                        <div class="flex items-center gap-2">
                            <Coins class="w-4 h-4 text-amber-600" />
                            <span class="text-sm font-medium text-gray-600">金币</span>
                        </div>
                        <button
                            v-if="editingField !== 'gold'"
                            @click="startEdit('gold')"
                            class="p-1 rounded-lg hover:bg-amber-100 transition-colors"
                        >
                            <Pencil class="w-3.5 h-3.5 text-amber-600" />
                        </button>
                    </div>

                    <!-- 显示模式 -->
                    <div v-if="editingField !== 'gold'" class="flex items-center">
                        <span class="text-2xl font-bold text-amber-600">
                            {{ friend.gold.toLocaleString() }}
                        </span>
                    </div>

                    <!-- 编辑模式 -->
                    <div v-else class="flex items-center gap-2">
                        <input
                            v-model.number="editValue"
                            type="number"
                            :min="0"
                            class="w-20 px-2 py-1 text-lg font-bold text-center border border-amber-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                            @keyup.enter="confirmSave"
                            @keyup.escape="cancelEdit"
                        />
                        <div class="flex gap-1">
                            <button
                                @click="confirmSave"
                                :disabled="saving"
                                class="p-1.5 rounded-lg bg-green-500 hover:bg-green-600 text-white transition-colors disabled:opacity-50"
                            >
                                <Check class="w-3.5 h-3.5" />
                            </button>
                            <button
                                @click="cancelEdit"
                                :disabled="saving"
                                class="p-1.5 rounded-lg bg-gray-400 hover:bg-gray-500 text-white transition-colors disabled:opacity-50"
                            >
                                <X class="w-3.5 h-3.5" />
                            </button>
                        </div>
                    </div>
                </div>

                <!-- 好感度 -->
                <div class="bg-gradient-to-br from-pink-50 to-rose-50 rounded-2xl p-4 outline-1 outline-pink-200">
                    <div class="flex items-center justify-between mb-2">
                        <div class="flex items-center gap-2">
                            <Heart class="w-4 h-4 text-pink-600" />
                            <span class="text-sm font-medium text-gray-600">好感度</span>
                        </div>
                        <button
                            v-if="editingField !== 'favorability'"
                            @click="startEdit('favorability')"
                            class="p-1 rounded-lg hover:bg-pink-100 transition-colors"
                        >
                            <Pencil class="w-3.5 h-3.5 text-pink-600" />
                        </button>
                    </div>

                    <!-- 显示模式 -->
                    <div v-if="editingField !== 'favorability'" class="flex items-center">
                        <span class="text-2xl font-bold text-pink-600">
                            {{ friend.favorability }}
                        </span>
                    </div>

                    <!-- 编辑模式 -->
                    <div v-else class="flex items-center gap-2">
                        <input
                            v-model.number="editValue"
                            type="number"
                            :min="0"
                            class="w-20 px-2 py-1 text-lg font-bold text-center border border-pink-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
                            @keyup.enter="confirmSave"
                            @keyup.escape="cancelEdit"
                        />
                        <div class="flex gap-1">
                            <button
                                @click="confirmSave"
                                :disabled="saving"
                                class="p-1.5 rounded-lg bg-green-500 hover:bg-green-600 text-white transition-colors disabled:opacity-50"
                            >
                                <Check class="w-3.5 h-3.5" />
                            </button>
                            <button
                                @click="cancelEdit"
                                :disabled="saving"
                                class="p-1.5 rounded-lg bg-gray-400 hover:bg-gray-500 text-white transition-colors disabled:opacity-50"
                            >
                                <X class="w-3.5 h-3.5" />
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- 无数据状态 -->
        <div v-else class="flex flex-col items-center justify-center py-8 text-gray-400">
            <Coins class="w-12 h-12 mb-2 opacity-30" />
            <p class="text-sm">暂无好友数据</p>
        </div>
    </div>
</template>

<style scoped>
.friend-detail-info {
    min-height: 120px;
}

input[type="number"]::-webkit-inner-spin-button,
input[type="number"]::-webkit-outer-spin-button {
    -webkit-appearance: none;
    margin: 0;
}

input[type="number"] {
    -moz-appearance: textfield;
}
</style>