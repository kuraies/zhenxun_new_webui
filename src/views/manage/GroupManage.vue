<script setup lang="ts">
import { ref, computed, onMounted, nextTick } from 'vue'
import { Search, Group } from 'lucide-vue-next'
import { ZXNotification, ZXMessageBox } from '@/components'
import { manageApi } from '@/utils/api-next'
import { useBotStore } from '@/store/bot'
import { useListAnimation } from '@/composables/useListAnimation'
import type { Group as GroupType } from '@/types/manage.types'
import GroupCard from '@/components/zxcomponent/GroupCard/GroupCard.vue'
import GroupDetailModal from './GroupDetailModal.vue'

const botStore = useBotStore()

// 列表动画
const { playEnterAnimation } = useListAnimation()
const gridRef = ref<HTMLElement | null>(null)

const loading = ref(false)
const groups = ref<GroupType[]>([])
const searchQuery = ref('')
const detailDialogOpen = ref(false)
const currentGroupId = ref('')

const filteredGroups = computed(() => {
    if (!searchQuery.value) return groups.value
    const query = searchQuery.value.toLowerCase()
    return groups.value.filter(
        g =>
            g.group_name.toLowerCase().includes(query) ||
            g.group_id.toLowerCase().includes(query)
    )
})

const stats = computed(() => {
    const total = groups.value.length
    const active = groups.value.filter(g => g.status).length
    const totalMembers = groups.value.reduce((sum, g) => sum + (g.member_count || 0), 0)
    return {
        total,
        active,
        inactive: total - active,
        totalMembers
    }
})

const loadGroups = async () => {
    loading.value = true
    try {
        const botId = botStore.getSelectedBotId() || undefined
        const res = await manageApi.getGroupList(botId)
        if (res.success && res.data) {
            groups.value = res.data

            // 播放列表项进入动画
            await nextTick()
            if (gridRef.value) {
                const cards = gridRef.value.querySelectorAll('.flip-card')
                playEnterAnimation(cards)
            }
        } else {
            ZXNotification({
                title: '呜呼~',
                message: '群组列表加载失败了 (っ °Д °;) っ',
                type: '😭',
                position: 'top-right'
            })
        }
    } catch (error) {
        console.error('加载群组列表失败:', error)
        ZXNotification({
            title: '呜呼~',
            message: '群组列表加载失败了 (っ °Д °;) っ',
            type: '😭',
            position: 'top-right'
        })
    } finally {
        loading.value = false
    }
}

const viewDetail = (group: GroupType) => {
    currentGroupId.value = group.group_id
    detailDialogOpen.value = true
}

const toggleStatus = async (group: GroupType) => {
    try {
        const res = await manageApi.updateGroup({
            group_id: group.group_id,
            status: !group.status
        })
        if (res.success) {
            group.status = !group.status
            ZXNotification({
                title: '成功啦~',
                message: '群组状态更新成功 ♪(´▽｀)',
                type: '🥳',
                position: 'top-right'
            })
        }
    } catch (error) {
        console.error('切换群组状态失败:', error)
        ZXNotification({
            title: '对不起',
            message: '群组状态更新失败了 (´；ω；`)',
            type: '😭',
            position: 'top-right'
        })
    }
}

const leaveGroup = async (group: GroupType) => {
    try {
        await ZXMessageBox({
            title: '退群确认',
            message: `确定要退出群组"${group.group_name}"吗？此操作不可恢复。`,
            cancelButtonText: '取消',
            confirmButtonText: '确定',
            type: 'warning',
            onConfirm: async () => {
                const botId = botStore.getSelectedBotId() || ''
                const res = await manageApi.leaveGroup({
                    bot_id: botId,
                    group_id: group.group_id
                })
                if (res.success) {
                    groups.value = groups.value.filter(g => g.group_id !== group.group_id)
                    ZXNotification({
                        title: '成功~',
                        message: '已退出群组',
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
    loadGroups()
})
</script>

<template>
    <div class="w-full h-full flex flex-col space-y-3 sm:space-y-4">
        <!-- 头部标题和统计 -->
        <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0 bg-white rounded-2xl shadow-sm p-4 outline-1 outline-slate-200">
            <div class="flex items-center space-x-3">
                <Group class="h-6 w-6 text-blue-500 flex-shrink-0" />
                <h2 class="text-lg font-semibold text-gray-800">群组管理</h2>
                <span class="text-sm text-gray-500">(共 {{ filteredGroups.length }} 个)</span>
            </div>

            <!-- 搜索框 -->
            <div class="relative w-full sm:w-72">
                <Search class="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                    v-model="searchQuery"
                    type="text"
                    placeholder="搜索群组名称或 ID..."
                    class="w-full pl-10 pr-10 py-2 border border-gray-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
            </div>
        </div>

        <!-- 统计卡片 -->
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
            <div class="bg-white rounded-2xl shadow-sm outline-1 outline-slate-200 p-3 text-center">
                <div class="text-lg sm:text-xl font-bold text-blue-600">{{ stats.total }}</div>
                <div class="text-xs text-gray-500 mt-0.5">总群组数</div>
            </div>
            <div class="bg-white rounded-2xl shadow-sm outline-1 outline-slate-200 p-3 text-center">
                <div class="text-lg sm:text-xl font-bold text-green-600">{{ stats.active }}</div>
                <div class="text-xs text-gray-500 mt-0.5">已启用</div>
            </div>
            <div class="bg-white rounded-2xl shadow-sm outline-1 outline-slate-200 p-3 text-center">
                <div class="text-lg sm:text-xl font-bold text-gray-600">{{ stats.inactive }}</div>
                <div class="text-xs text-gray-500 mt-0.5">已禁用</div>
            </div>
            <div class="bg-white rounded-2xl shadow-sm outline-1 outline-slate-200 p-3 text-center">
                <div class="text-lg sm:text-xl font-bold text-purple-600">{{ stats.totalMembers }}</div>
                <div class="text-xs text-gray-500 mt-0.5">成员总数</div>
            </div>
        </div>

        <!-- 群组列表 -->
        <div class="flex-1 overflow-y-auto">
            <div v-if="loading" class="flex items-center justify-center h-full">
                <div class="text-center text-gray-400">
                    <Group class="w-12 h-12 mx-auto mb-4 animate-pulse" />
                    <p>加载中...</p>
                </div>
            </div>

            <div v-else-if="filteredGroups.length === 0" class="flex items-center justify-center h-full">
                <div class="text-center text-gray-400">
                    <Group class="w-16 h-16 mx-auto mb-4 opacity-50" />
                    <p class="text-lg">没有找到群组</p>
                    <p class="text-sm mt-2">尝试调整搜索条件</p>
                </div>
            </div>

            <!-- 网格视图 -->
            <div
                v-else
                ref="gridRef"
                class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3"
            >
                <GroupCard
                    v-for="group in filteredGroups"
                    :key="group.group_id"
                    :group="group"
                    @view-detail="viewDetail"
                    @toggle-status="toggleStatus"
                    @leave-group="leaveGroup"
                />
            </div>
        </div>

        <!-- 群组详情对话框 -->
        <Teleport to="body">
            <Transition name="modal-jelly" :duration="{ enter: 500, leave: 250 }">
                <div v-if="detailDialogOpen" class="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4">
                    <!-- 背景遮罩 -->
                    <div class="fixed inset-0 glass-overlay" @click="detailDialogOpen = false"></div>

                    <!-- 对话框 -->
                    <div class="modal-content relative bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] sm:max-h-[85vh] flex flex-col overflow-hidden">
                    <!-- 头部 -->
                    <div class="flex items-center justify-between px-4 sm:px-6 py-4 bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-blue-100 flex-shrink-0">
                        <h3 class="text-base sm:text-lg font-semibold text-gray-800 truncate">群组详情</h3>
                        <button @click="detailDialogOpen = false" class="p-1 rounded-2xl hover:bg-white/50 transition-colors flex-shrink-0">
                            <svg class="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                            </svg>
                        </button>
                    </div>

                    <!-- 内容区 -->
                    <div class="flex-1 overflow-y-auto p-4 sm:p-6">
                        <GroupDetailModal
                            :group-id="currentGroupId"
                            @close="detailDialogOpen = false"
                            @updated="loadGroups"
                        />
                    </div>
                </div>
            </Transition>
        </Teleport>
    </div>
</template>

<style scoped>
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
