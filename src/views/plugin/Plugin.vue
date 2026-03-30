<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { Blocks, Search, X } from 'lucide-vue-next'
import { pluginApi } from '@/utils/api-next'
import type { PluginInfo } from '@/types/api-next.types'
import PluginCard from '@/components/zxcomponent/PluginCard/PluginCard.vue'
import PluginConfigModal from '@/components/zxcomponent/PluginConfigModal/PluginConfigModal.vue'
import { ZXNotification } from '@/components'

// 插件列表
const plugins = ref<PluginInfo[]>([])
const loading = ref(false)

// 搜索关键词
const searchKeyword = ref('')

// 状态过滤
const statusFilter = ref<'all' | 'active' | 'inactive'>('all')

// 类型过滤
const typeFilter = ref<'all' | 'builtin' | 'third'>('all')

// 防抖定时器
let searchTimeout: ReturnType<typeof setTimeout> | null = null

// 加载插件列表
const loadPlugins = async () => {
    loading.value = true
    try {
        const res = await pluginApi.getPluginList({
            search: searchKeyword.value || undefined,
            status: statusFilter.value === 'all' ? undefined : (statusFilter.value === 'active'),
            plugin_type: typeFilter.value === 'all' ? undefined : (typeFilter.value === 'builtin' ? 'builtin' : 'third'),
            page: 1,
            page_size: 100
        })
        if (res?.success && res?.data) {
            plugins.value = res.data.items || []
        }
    } catch (error) {
        ZXNotification({
            title: '呜呼~',
            message: '插件列表加载失败了 (っ °Д °;) っ',
            type: '😭',
            position: 'top-right'
        })
    } finally {
        loading.value = false
    }
}

// 监听搜索和过滤条件变化，防抖加载
watch([searchKeyword, statusFilter, typeFilter], () => {
    if (searchTimeout) clearTimeout(searchTimeout)
    searchTimeout = setTimeout(loadPlugins, 300)
})

// 过滤后的插件列表（API 已处理过滤，直接返回）
const filteredPlugins = computed(() => plugins.value)

// 统计信息
const stats = computed(() => {
    const total = plugins.value.length
    const active = plugins.value.filter(p => p.is_enabled).length
    const builtin = plugins.value.filter(p => p.plugin_type === 'builtin').length
    return { total, active, inactive: total - active, builtin, third: total - builtin }
})

// 处理插件状态变化
const handleStatusChange = (module: string, newStatus: boolean) => {
    const plugin = plugins.value.find(p => p.module === module)
    if (plugin) {
        plugin.is_enabled = newStatus
    }
}

// 配置弹窗
const configModalVisible = ref(false)
const currentPluginModule = ref('')
const currentPluginName = ref('')

// 打开配置弹窗
const handleOpenConfig = (plugin: PluginInfo) => {
    if (!plugin.allow_setting) {
        ZXNotification({
            title: '提示',
            message: `插件 "${plugin.name}" 没有配置项 (｡•́︿•̀｡)`,
            type: 'info',
            position: 'top-right'
        })
        return
    }
    currentPluginModule.value = plugin.module
    currentPluginName.value = plugin.name
    configModalVisible.value = true
}

// 配置更新后
const handleConfigUpdated = () => {
    // 重新加载插件列表
    loadPlugins()
}

onMounted(() => {
    loadPlugins()
})
</script>

<template>
    <div class="w-full h-full flex flex-col space-y-3 sm:space-y-4">
        <!-- 头部标题和统计 -->
        <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0 bg-white rounded-2xl shadow-sm p-4 outline-1 outline-slate-200">
            <div class="flex items-center space-x-3">
                <Blocks class="h-6 w-6 text-blue-500 flex-shrink-0" />
                <h2 class="text-lg font-semibold text-gray-800">插件管理</h2>
                <span class="text-sm text-gray-500">(共 {{ filteredPlugins.length }} 个)</span>
            </div>

            <!-- 刷新按钮 -->
            <button
                @click="loadPlugins"
                :disabled="loading"
                class="p-2 rounded-full bg-gray-100 hover:bg-gray-200 transition-colors disabled:opacity-50 btn-touch"
                title="刷新列表"
            >
                <svg class="w-5 h-5" :class="{ 'animate-spin': loading }" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
            </button>
        </div>

        <!-- 统计卡片 - 简洁布局 -->
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
            <div class="bg-white rounded-2xl shadow-sm outline-1 outline-slate-200 p-3 text-center">
                <div class="text-lg sm:text-xl font-bold text-gray-800">{{ stats.total }}</div>
                <div class="text-xs text-gray-500 mt-0.5">总插件数</div>
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
                <div class="text-lg sm:text-xl font-bold text-purple-600">{{ stats.builtin }}</div>
                <div class="text-xs text-gray-500 mt-0.5">内置插件</div>
            </div>
        </div>

        <!-- 搜索和过滤 - 响应式布局 -->
        <div class="flex flex-col sm:flex-row items-stretch sm:items-center space-y-3 sm:space-y-0 sm:space-x-4 bg-white rounded-2xl shadow-sm p-4 outline-1 outline-slate-200">
            <!-- 搜索框 -->
            <div class="relative flex-1">
                <Search class="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                    v-model="searchKeyword"
                    type="text"
                    placeholder="搜索插件名称..."
                    class="w-full pl-10 pr-10 py-2 border border-gray-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <button
                    v-if="searchKeyword"
                    @click="searchKeyword = ''"
                    class="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 btn-touch"
                >
                    <X class="h-4 w-4" />
                </button>
            </div>

            <!-- 状态过滤 -->
            <div class="flex flex-wrap items-center gap-1 flex-shrink-0">
                <span class="text-sm text-gray-600 flex-shrink-0">状态:</span>
                <button
                    @click="statusFilter = 'all'"
                    :class="statusFilter === 'all' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'"
                    class="px-2 py-1.5 rounded-2xl text-xs font-medium transition-colors btn-touch"
                >
                    全部
                </button>
                <button
                    @click="statusFilter = 'active'"
                    :class="statusFilter === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'"
                    class="px-2 py-1.5 rounded-2xl text-xs font-medium transition-colors btn-touch"
                >
                    启用
                </button>
                <button
                    @click="statusFilter = 'inactive'"
                    :class="statusFilter === 'inactive' ? 'bg-gray-300 text-gray-700' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'"
                    class="px-2 py-1.5 rounded-2xl text-xs font-medium transition-colors btn-touch"
                >
                    禁用
                </button>
            </div>

            <!-- 类型过滤 -->
            <div class="flex flex-wrap items-center gap-1 flex-shrink-0">
                <span class="text-sm text-gray-600 flex-shrink-0">类型:</span>
                <button
                    @click="typeFilter = 'all'"
                    :class="typeFilter === 'all' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'"
                    class="px-2 py-1.5 rounded-2xl text-xs font-medium transition-colors btn-touch"
                >
                    全部
                </button>
                <button
                    @click="typeFilter = 'builtin'"
                    :class="typeFilter === 'builtin' ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'"
                    class="px-2 py-1.5 rounded-2xl text-xs font-medium transition-colors btn-touch"
                >
                    内置
                </button>
                <button
                    @click="typeFilter = 'third'"
                    :class="typeFilter === 'third' ? 'bg-orange-100 text-orange-700' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'"
                    class="px-2 py-1.5 rounded-2xl text-xs font-medium transition-colors btn-touch"
                >
                    三方
                </button>
            </div>
        </div>

        <!-- 插件网格 -->
        <div class="flex-1 overflow-y-auto">
            <div v-if="loading" class="flex items-center justify-center h-full">
                <div class="text-center text-gray-400">
                    <Blocks class="w-12 h-12 mx-auto mb-4 animate-pulse" />
                    <p>加载中...</p>
                </div>
            </div>

            <div v-else-if="filteredPlugins.length === 0" class="flex items-center justify-center h-full">
                <div class="text-center text-gray-400">
                    <Blocks class="w-16 h-16 mx-auto mb-4 opacity-50" />
                    <p class="text-lg">没有找到插件</p>
                    <p class="text-sm mt-2">尝试调整搜索或过滤条件</p>
                </div>
            </div>

            <!-- 网格视图 -->
            <div
                v-else
                class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3"
            >
                <PluginCard
                    v-for="plugin in filteredPlugins"
                    :key="plugin.module"
                    :plugin="plugin"
                    @status-change="handleStatusChange"
                    @open-config="handleOpenConfig"
                />
            </div>
        </div>

        <!-- 配置弹窗 -->
        <PluginConfigModal
            v-model:visible="configModalVisible"
            :module="currentPluginModule"
            :plugin-name="currentPluginName"
            @updated="handleConfigUpdated"
        />
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
