<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount, watch } from 'vue'
import {
    Cpu,
    MemoryStick,
    HardDrive,
    MessageSquare,
    Activity,
    Users,
    Group,
    Plug,
    Database,
    Bot,
    Clock,
    Zap,
    TrendingUp,
    TrendingDown,
    Minus,
    Server,
    Wifi,
    WifiOff,
    RefreshCw,
    Info,
    Gauge,
    Hash,
    GitBranch,
    Power
} from 'lucide-vue-next'
import { useSystemStore } from '@/store/system.js'
import { useBotStore } from '@/store/bot'
import { systemApi, mainApi, analyticsApi } from '@/utils/api-next'
import { ZXNotification, ZXMessageBox } from '@/components'
import { usePolling } from '@/composables/usePolling'
import { useListAnimation } from '@/composables/useListAnimation'

const systemStore = useSystemStore()
const botStore = useBotStore()

// 列表动画
const { playEnterAnimationWithDelay } = useListAnimation()
const containerRef = ref<HTMLElement | null>(null)

// 启动时间
const botStartTime = ref<Date | null>(null)

// 当前时间，用于实时计算运行时长（每秒更新）
const currentTime = ref(new Date())

// 运行时长格式化 - 实时计算当前时间与启动时间的差值
const uptimeFormatted = computed(() => {
    // 如果有启动时间，实时计算差值
    if (botStartTime.value) {
        const diffSeconds = Math.floor((currentTime.value.getTime() - botStartTime.value.getTime()) / 1000)

        if (diffSeconds < 0) return '刚启动'

        const days = Math.floor(diffSeconds / 86400)
        const hours = Math.floor((diffSeconds % 86400) / 3600)
        const minutes = Math.floor((diffSeconds % 3600) / 60)
        const secs = diffSeconds % 60

        const parts = []
        if (days > 0) parts.push(`${days}天`)
        if (hours > 0) parts.push(`${hours}小时`)
        if (minutes > 0) parts.push(`${minutes}分`)
        if (secs > 0 || parts.length === 0) parts.push(`${secs}秒`)

        return parts.join(' ')
    }

    // 如果后端返回了格式化好的运行时长，直接使用
    if (botStore.botUptimeFormatted) {
        return botStore.botUptimeFormatted
    }

    return '未知'
})

// 系统状态
const systemHealth = ref<'healthy' | 'warning' | 'error'>('healthy')

// 监听系统状态变化，更新健康状态指示器
// WebSocket 已通过 systemStore.systemStatus 更新数据
watch(
    () => systemStore.systemStatus,
    (status) => {
        if (status.cpu > 90 || status.memory > 90 || status.disk > 90) {
            systemHealth.value = 'error'
        } else if (status.cpu > 70 || status.memory > 70 || status.disk > 70) {
            systemHealth.value = 'warning'
        } else {
            systemHealth.value = 'healthy'
        }
    },
    { immediate: true, deep: true }
)

// 系统信息
const systemInfo = ref({
    version: 'v1.0.0', // 版本号
    system: '',
    cpuBrand: '',
    cpuCores: 0,
    cpuFreq: 0,
    memoryTotal: 0,
})

// 网络状态：'checking' 表示检测中，true/false 表示可达/不可达
const networkStatus = ref<{
    google: boolean | 'checking'
    baidu: boolean | 'checking'
}>({
    google: 'checking',
    baidu: 'checking',
})

// 统计数据趋势（从后端获取）
const statsTrend = ref<{
    chat_num: 'up' | 'down' | 'stable'
    chat_day: 'up' | 'down' | 'stable'
    call_num: 'up' | 'down' | 'stable'
    call_day: 'up' | 'down' | 'stable'
}>({
    chat_num: 'stable',
    chat_day: 'stable',
    call_num: 'stable',
    call_day: 'stable'
})

// 系统健康状态文案
const healthStatusText = {
    healthy: { text: '系统运行良好', color: 'text-green-600', bg: 'bg-green-100', icon: Zap },
    warning: { text: '系统负载较高', color: 'text-yellow-600', bg: 'bg-yellow-100', icon: Activity },
    error: { text: '系统负载过高', color: 'text-red-600', bg: 'bg-red-100', icon: Zap }
}

// 获取趋势图标
/**
 * @param {string} trend
 */
const getTrendIcon = (trend: 'up' | 'down' | 'stable' | undefined) => {
    switch (trend) {
        case 'up':
            return { icon: TrendingUp, color: 'text-green-500' }
        case 'down':
            return { icon: TrendingDown, color: 'text-red-500' }
        default:
            return { icon: Minus, color: 'text-gray-400' }
    }
}

// 加载 Dashboard 数据（使用新后端 API）
const loadDashboardData = async () => {
    try {
        // 获取完整统计数据（聊天数、调用数、好友数、群组数等）
        await systemStore.fetchAllStatistics()

        // 获取系统健康状态
        const healthRes = await systemApi.getHealth()
        if (healthRes?.success && healthRes?.data) {
            systemHealth.value = healthRes.data.status
        }

        // 获取 Bot 状态（包含运行时长）
        const botStatusRes = await mainApi.getBotStatus()
        if (botStatusRes?.success && botStatusRes?.data) {
            // 设置启动时间，用于实时计算运行时长
            if (botStatusRes.data.start_time) {
                botStartTime.value = new Date(botStatusRes.data.start_time)
            }
            // 后端返回 uptime_formatted 字符串，作为备用
            if (botStatusRes.data.uptime_formatted) {
                botStore.updateUptimeFormatted(botStatusRes.data.uptime_formatted)
            }
        }

        // 获取系统状态用于 CPU/内存/磁盘显示
        const statusRes = await systemApi.getStatus()
        if (statusRes?.success && statusRes?.data) {
            // 只在数据有效时更新，避免更新为 0 或 NaN
            const cpu = Number(statusRes.data.cpu);
            const memory = Number(statusRes.data.memory);
            const disk = Number(statusRes.data.disk);

            if (!isNaN(cpu) && isFinite(cpu)) {
                systemStore.systemStatus.cpu = cpu;
            }
            if (!isNaN(memory) && isFinite(memory)) {
                systemStore.systemStatus.memory = memory;
            }
            if (!isNaN(disk) && isFinite(disk)) {
                systemStore.systemStatus.disk = disk;
            }
        }

        // 获取系统信息
        const infoRes = await systemApi.getSystemInfo()
        if (infoRes?.success && infoRes?.data) {
            systemInfo.value = {
                version: infoRes.data.version,
                system: infoRes.data.system,
                cpuBrand: infoRes.data.cpu_brand,
                cpuCores: infoRes.data.cpu_cores,
                cpuFreq: infoRes.data.cpu_freq_mhz,
                memoryTotal: infoRes.data.memory_total,
            }
        }

        // 网络检测（不阻塞主流程）
        systemApi.checkNetwork().then(networkRes => {
            if (networkRes?.success && networkRes?.data) {
                networkStatus.value = networkRes.data
            } else {
                // 检测失败时设置为不可达
                networkStatus.value = { google: false, baidu: false }
            }
        }).catch(() => {
            networkStatus.value = { google: false, baidu: false }
        })

        // 获取趋势数据（用于计算统计指标的变化趋势）
        const now = new Date()
        const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000)
        const trendRes = await analyticsApi.getTrendData({
            start_time: yesterday.toISOString(),
            end_time: now.toISOString(),
            granularity: 'hour'
        })
        if (trendRes?.success && trendRes?.data?.data_points && trendRes.data.data_points.length >= 2) {
            const dataPoints = trendRes.data.data_points
            const latest = dataPoints[dataPoints.length - 1]
            const previous = dataPoints[dataPoints.length - 2]

            // 计算消息数趋势
            if (latest.message_count > previous.message_count) {
                statsTrend.value.chat_num = 'up'
            } else if (latest.message_count < previous.message_count) {
                statsTrend.value.chat_num = 'down'
            } else {
                statsTrend.value.chat_num = 'stable'
            }

            // 计算调用数趋势
            if (latest.plugin_call_count > previous.plugin_call_count) {
                statsTrend.value.call_num = 'up'
            } else if (latest.plugin_call_count < previous.plugin_call_count) {
                statsTrend.value.call_num = 'down'
            } else {
                statsTrend.value.call_num = 'stable'
            }

            // 计算日趋势（与前一天同一时段比较，简化处理：假设 API 返回的是日粒度数据）
            if (dataPoints.length >= 3) {
                const prevDay = dataPoints[dataPoints.length - 3]
                statsTrend.value.chat_day = latest.message_count > prevDay.message_count ? 'up' : latest.message_count < prevDay.message_count ? 'down' : 'stable'
                statsTrend.value.call_day = latest.plugin_call_count > prevDay.plugin_call_count ? 'up' : latest.plugin_call_count < prevDay.plugin_call_count ? 'down' : 'stable'
            }
        }
    } catch (error: any) {
        console.error('加载 Dashboard 数据失败:', error)
        // 趋势数据获取失败不影响主流程，只记录日志
        if (error?.response?.status) {
            console.warn('趋势数据获取失败，使用默认值')
        }
    }
}

// 定时器 - 使用页面可见性感知的轮询
// uptimePolling: 每秒更新当前时间用于实时显示运行时长
const { start: startUptimePolling, stop: stopUptimePolling } = usePolling(
    () => { currentTime.value = new Date() },
    1000,
    { autoStart: false }
)

// 重启 Bot
const handleRestart = async () => {
    // 使用统一的确认对话框
    const confirmed = await ZXMessageBox({
        title: '重启 Bot',
        message: '确定要重启 Bot 吗？重启后需要等待一段时间才能重新连接。',
        confirmButtonText: '重启',
        confirmButtonHoverText: '确认重启',
        cancelButtonText: '取消',
    })

    if (!confirmed) {
        return
    }

    try {
        const res = await systemApi.restartBot()
        if (res?.success) {
            ZXNotification({
                title: '重启成功',
                message: 'Bot 正在重启中，请稍后刷新页面...',
                type: '✅',
                position: 'top-right',
                duration: 3000
            })
        } else {
            ZXNotification({
                title: '重启失败',
                message: res?.message || '重启失败，请稍后重试',
                type: '❌',
                position: 'top-right'
            })
        }
    } catch (error: any) {
        console.error('重启 Bot 失败:', error)
        ZXNotification({
            title: '呜呼～',
            message: '重启失败 (っ °Д °;) っ',
            type: '😭',
            position: 'top-right'
        })
    }
}

onMounted(async () => {
    systemStore.startPolling()
    await botStore.getBotList()
    await loadDashboardData()

    // 启动运行时长计时器（页面可见性感知）
    startUptimePolling()

    // 播放列表项进入动画
    playEnterAnimationWithDelay(containerRef, '.list-item', 100)
})

onBeforeUnmount(() => {
    systemStore.stopPolling()
    stopUptimePolling()
})
</script>

<template>
    <div ref="containerRef" class="w-full h-full space-y-3 sm:space-y-4 overflow-y-auto">
        <!-- 顶部状态栏 -->
        <div class="list-item bg-white rounded-2xl shadow-sm outline-1 outline-slate-200 p-3 sm:p-6">
            <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0">
                <div class="flex items-center space-x-2 sm:space-x-4 w-full sm:w-auto">
                    <div class="w-10 h-10 sm:w-16 sm:h-16 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                        <Bot class="w-5 h-5 sm:w-10 sm:h-10 text-blue-600" />
                    </div>
                    <div class="flex-1 min-w-0">
                        <div class="flex items-center space-x-2 sm:space-x-3">
                            <h2 class="text-base sm:text-2xl font-bold text-gray-800 truncate">真寻 Bot</h2>
                            <span :class="botStore.isOnline ? 'bg-green-500' : 'bg-gray-500'" class="w-2 h-2 sm:w-3 sm:h-3 rounded-full animate-pulse flex-shrink-0"></span>
                        </div>
                        <div class="flex items-center flex-wrap gap-1.5 sm:gap-4 mt-1.5 sm:mt-2 text-gray-600 text-xs sm:text-sm">
                            <span class="flex items-center space-x-1">
                                <Clock class="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" />
                                <span class="truncate">运行：{{ uptimeFormatted }}</span>
                            </span>
                            <span class="flex items-center space-x-1">
                                <Server class="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" />
                                <span v-if="botStore.isOnline">在线</span>
                                <span v-else class="flex items-center space-x-1">
                                    <WifiOff class="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" />
                                    离线
                                </span>
                            </span>
                        </div>
                    </div>
                </div>
                <div class="flex items-center space-x-2 sm:space-x-3 w-full sm:w-auto justify-end">
                    <div :class="healthStatusText[systemHealth].bg" class="px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-2xl flex items-center space-x-1.5 sm:space-x-2 backdrop-blur-sm whitespace-nowrap">
                        <component :is="healthStatusText[systemHealth].icon" :class="healthStatusText[systemHealth].color" class="w-3.5 h-3.5 sm:w-5 sm:h-5 flex-shrink-0" />
                        <span :class="healthStatusText[systemHealth].color" class="font-medium text-gray-800 text-xs sm:text-sm hidden sm:inline">
                            {{ healthStatusText[systemHealth].text }}
                        </span>
                        <span :class="healthStatusText[systemHealth].color" class="font-medium text-gray-800 text-xs sm:hidden">
                            {{ systemHealth === 'healthy' ? '良好' : systemHealth === 'warning' ? '较高' : '过高' }}
                        </span>
                    </div>
                    <button
                        @click="handleRestart"
                        class="p-2 bg-red-100 hover:bg-red-200 rounded-2xl transition-colors btn-touch flex-shrink-0"
                        title="重启 Bot"
                    >
                        <Power class="w-5 h-5 text-red-600" />
                    </button>
                    <button
                        @click="systemStore.fetchAllStatistics()"
                        class="p-2 bg-gray-100 hover:bg-gray-200 rounded-2xl transition-colors btn-touch flex-shrink-0"
                        title="刷新数据"
                    >
                        <RefreshCw class="w-5 h-5 text-gray-600" />
                    </button>
                </div>
            </div>
        </div>

        <!-- 核心统计 - 改进响应式网格 -->
        <div class="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-1.5 sm:gap-3">
            <div class="list-item flip-card bg-white rounded-2xl shadow-sm outline-1 outline-slate-200 p-2 sm:p-3 hover:shadow-md transition-shadow min-w-0">
                <div class="flex items-center justify-between mb-1.5 sm:mb-2">
                    <div class="w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                        <MessageSquare class="w-3 h-3 sm:w-4 sm:h-4 text-blue-600" />
                    </div>
                    <component :is="getTrendIcon(statsTrend.chat_num as 'up' | 'down' | 'stable').icon" :class="getTrendIcon(statsTrend.chat_num as 'up' | 'down' | 'stable').color" class="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
                </div>
                <div class="text-base sm:text-xl font-bold text-gray-800 truncate">{{ systemStore.count.chat_num }}</div>
                <div class="text-xs text-gray-500 truncate">消息总数</div>
            </div>

            <div class="list-item flip-card bg-white rounded-2xl shadow-sm outline-1 outline-slate-200 p-2 sm:p-3 hover:shadow-md transition-shadow min-w-0">
                <div class="flex items-center justify-between mb-1.5 sm:mb-2">
                    <div class="w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                        <Activity class="w-3 h-3 sm:w-4 sm:h-4 text-green-600" />
                    </div>
                    <component :is="getTrendIcon(statsTrend.chat_day as 'up' | 'down' | 'stable').icon" :class="getTrendIcon(statsTrend.chat_day as 'up' | 'down' | 'stable').color" class="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
                </div>
                <div class="text-base sm:text-xl font-bold text-gray-800 truncate">{{ systemStore.count.chat_day }}</div>
                <div class="text-xs text-gray-500 truncate">今日消息</div>
            </div>

            <div class="list-item flip-card bg-white rounded-2xl shadow-sm outline-1 outline-slate-200 p-2 sm:p-3 hover:shadow-md transition-shadow min-w-0">
                <div class="flex items-center justify-between mb-1.5 sm:mb-2">
                    <div class="w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0">
                        <Plug class="w-3 h-3 sm:w-4 sm:h-4 text-purple-600" />
                    </div>
                    <component :is="getTrendIcon(statsTrend.call_num).icon" :class="getTrendIcon(statsTrend.call_num).color" class="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
                </div>
                <div class="text-base sm:text-xl font-bold text-gray-800 truncate">{{ systemStore.count.call_num }}</div>
                <div class="text-xs text-gray-500 truncate">调用总数</div>
            </div>

            <div class="list-item flip-card bg-white rounded-2xl shadow-sm outline-1 outline-slate-200 p-2 sm:p-3 hover:shadow-md transition-shadow min-w-0">
                <div class="flex items-center justify-between mb-1.5 sm:mb-2">
                    <div class="w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-pink-100 flex items-center justify-center flex-shrink-0">
                        <Activity class="w-3 h-3 sm:w-4 sm:h-4 text-pink-600" />
                    </div>
                    <component :is="getTrendIcon(statsTrend.call_day).icon" :class="getTrendIcon(statsTrend.call_day).color" class="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
                </div>
                <div class="text-base sm:text-xl font-bold text-gray-800 truncate">{{ systemStore.count.call_day }}</div>
                <div class="text-xs text-gray-500 truncate">今日调用</div>
            </div>

            <div class="list-item flip-card bg-white rounded-2xl shadow-sm outline-1 outline-slate-200 p-2 sm:p-3 hover:shadow-md transition-shadow min-w-0">
                <div class="flex items-center justify-between mb-1.5 sm:mb-2">
                    <div class="w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-yellow-100 flex items-center justify-center flex-shrink-0">
                        <Users class="w-3 h-3 sm:w-4 sm:h-4 text-yellow-600" />
                    </div>
                </div>
                <div class="text-base sm:text-xl font-bold text-gray-800 truncate">{{ systemStore.count.friend_count }}</div>
                <div class="text-xs text-gray-500 truncate">好友数</div>
            </div>

            <div class="list-item flip-card bg-white rounded-2xl shadow-sm outline-1 outline-slate-200 p-2 sm:p-3 hover:shadow-md transition-shadow min-w-0">
                <div class="flex items-center justify-between mb-1.5 sm:mb-2">
                    <div class="w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0">
                        <Group class="w-3 h-3 sm:w-4 sm:h-4 text-indigo-600" />
                    </div>
                </div>
                <div class="text-base sm:text-xl font-bold text-gray-800 truncate">{{ systemStore.count.group_count }}</div>
                <div class="text-xs text-gray-500 truncate">群组数</div>
            </div>

            <div class="list-item flip-card bg-white rounded-2xl shadow-sm outline-1 outline-slate-200 p-2 sm:p-3 hover:shadow-md transition-shadow min-w-0">
                <div class="flex items-center justify-between mb-1.5 sm:mb-2">
                    <div class="w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-cyan-100 flex items-center justify-center flex-shrink-0">
                        <Plug class="w-3 h-3 sm:w-4 sm:h-4 text-cyan-600" />
                    </div>
                </div>
                <div class="text-base sm:text-xl font-bold text-gray-800 truncate">{{ systemStore.count.plugin_count }}</div>
                <div class="text-xs text-gray-500 truncate">插件数</div>
            </div>

            <div class="list-item flip-card bg-white rounded-2xl shadow-sm outline-1 outline-slate-200 p-2 sm:p-3 hover:shadow-md transition-shadow min-w-0">
                <div class="flex items-center justify-between mb-1.5 sm:mb-2">
                    <div class="w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-orange-100 flex items-center justify-center flex-shrink-0">
                        <Database class="w-3 h-3 sm:w-4 sm:h-4 text-orange-600" />
                    </div>
                </div>
                <div class="text-base sm:text-xl font-bold text-gray-800 truncate">{{ systemStore.count.database_size }}</div>
                <div class="text-xs text-gray-500 truncate">数据库 (MB)</div>
            </div>
        </div>

        <!-- 系统资源状态 - 改进响应式 -->
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-4">
            <div class="list-item flip-card bg-white rounded-2xl shadow-sm outline-1 outline-slate-200 p-3 sm:p-5">
                <div class="flex items-center justify-between mb-2 sm:mb-3">
                    <div class="flex items-center space-x-1.5 sm:space-x-2 min-w-0">
                        <Cpu class="w-3.5 h-3.5 sm:w-5 sm:h-5 text-blue-500 flex-shrink-0" />
                        <span class="font-semibold text-gray-700 text-xs sm:text-base truncate">CPU</span>
                    </div>
                    <span :class="systemStore.systemStatus.cpu > 70 ? 'text-red-500' : 'text-green-500'" class="text-sm sm:text-lg font-bold flex-shrink-0">
                        {{ systemStore.systemStatus.cpu }}%
                    </span>
                </div>
                <div class="w-full h-2 sm:h-3 bg-gray-100 rounded-full overflow-hidden">
                    <div
                        :class="systemStore.systemStatus.cpu > 70 ? 'bg-gradient-to-r from-red-400 to-red-500' : 'bg-gradient-to-r from-green-400 to-green-500'"
                        class="h-full rounded-full transition-all duration-500"
                        :style="{ width: `${systemStore.systemStatus.cpu}%` }"
                    ></div>
                </div>
            </div>

            <div class="list-item flip-card bg-white rounded-2xl shadow-sm outline-1 outline-slate-200 p-3 sm:p-5">
                <div class="flex items-center justify-between mb-2 sm:mb-3">
                    <div class="flex items-center space-x-1.5 sm:space-x-2 min-w-0">
                        <MemoryStick class="w-3.5 h-3.5 sm:w-5 sm:h-5 text-purple-500 flex-shrink-0" />
                        <span class="font-semibold text-gray-700 text-xs sm:text-base truncate">内存</span>
                    </div>
                    <span :class="systemStore.systemStatus.memory > 70 ? 'text-red-500' : 'text-green-500'" class="text-sm sm:text-lg font-bold flex-shrink-0">
                        {{ systemStore.systemStatus.memory }}%
                    </span>
                </div>
                <div class="w-full h-2 sm:h-3 bg-gray-100 rounded-full overflow-hidden">
                    <div
                        :class="systemStore.systemStatus.memory > 70 ? 'bg-gradient-to-r from-red-400 to-red-500' : 'bg-gradient-to-r from-purple-400 to-purple-500'"
                        class="h-full rounded-full transition-all duration-500"
                        :style="{ width: `${systemStore.systemStatus.memory}%` }"
                    ></div>
                </div>
            </div>

            <div class="list-item flip-card bg-white rounded-2xl shadow-sm outline-1 outline-slate-200 p-3 sm:p-5 sm:col-span-2 lg:col-span-1">
                <div class="flex items-center justify-between mb-2 sm:mb-3">
                    <div class="flex items-center space-x-1.5 sm:space-x-2 min-w-0">
                        <HardDrive class="w-3.5 h-3.5 sm:w-5 sm:h-5 text-orange-500 flex-shrink-0" />
                        <span class="font-semibold text-gray-700 text-xs sm:text-base truncate">磁盘</span>
                    </div>
                    <span :class="systemStore.systemStatus.disk > 70 ? 'text-red-500' : 'text-green-500'" class="text-sm sm:text-lg font-bold flex-shrink-0">
                        {{ systemStore.systemStatus.disk }}%
                    </span>
                </div>
                <div class="w-full h-2 sm:h-3 bg-gray-100 rounded-full overflow-hidden">
                    <div
                        :class="systemStore.systemStatus.disk > 70 ? 'bg-gradient-to-r from-red-400 to-red-500' : 'bg-gradient-to-r from-orange-400 to-orange-500'"
                        class="h-full rounded-full transition-all duration-500"
                        :style="{ width: `${systemStore.systemStatus.disk}%` }"
                    ></div>
                </div>
            </div>
        </div>

        <!-- 系统信息 -->
        <div class="list-item bg-white rounded-2xl shadow-sm outline-1 outline-slate-200 p-3 sm:p-5">
            <div class="flex items-center space-x-2 mb-4">
                <Info class="w-5 h-5 text-cyan-500" />
                <h3 class="font-semibold text-gray-700 text-sm sm:text-base">系统信息</h3>
            </div>
            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                <!-- 版本信息 -->
                <div class="flex items-start space-x-2">
                    <div class="w-8 h-8 rounded-2xl bg-blue-100 flex items-center justify-center flex-shrink-0">
                        <GitBranch class="w-4 h-4 text-blue-600" />
                    </div>
                    <div class="min-w-0 flex-1">
                        <div class="text-xs text-gray-500">版本信息</div>
                        <div class="text-sm font-medium text-gray-800 truncate">{{ systemInfo.version }}</div>
                    </div>
                </div>

                <!-- 系统版本 -->
                <div class="flex items-start space-x-2">
                    <div class="w-8 h-8 rounded-2xl bg-purple-100 flex items-center justify-center flex-shrink-0">
                        <Server class="w-4 h-4 text-purple-600" />
                    </div>
                    <div class="min-w-0 flex-1">
                        <div class="text-xs text-gray-500">系统版本</div>
                        <div class="text-sm font-medium text-gray-800 truncate" :title="systemInfo.system">{{ systemInfo.system || '-' }}</div>
                    </div>
                </div>

                <!-- CPU 型号 -->
                <div class="flex items-start space-x-2">
                    <div class="w-8 h-8 rounded-2xl bg-green-100 flex items-center justify-center flex-shrink-0">
                        <Cpu class="w-4 h-4 text-green-600" />
                    </div>
                    <div class="min-w-0 flex-1">
                        <div class="text-xs text-gray-500">CPU 型号</div>
                        <div class="text-sm font-medium text-gray-800 truncate" :title="systemInfo.cpuBrand">{{ systemInfo.cpuBrand || '-' }}</div>
                    </div>
                </div>

                <!-- 内核数 -->
                <div class="flex items-start space-x-2">
                    <div class="w-8 h-8 rounded-2xl bg-orange-100 flex items-center justify-center flex-shrink-0">
                        <Hash class="w-4 h-4 text-orange-600" />
                    </div>
                    <div class="min-w-0 flex-1">
                        <div class="text-xs text-gray-500">内核数</div>
                        <div class="text-sm font-medium text-gray-800">{{ systemInfo.cpuCores || '-' }} 核心</div>
                    </div>
                </div>

                <!-- CPU 主频 -->
                <div class="flex items-start space-x-2">
                    <div class="w-8 h-8 rounded-2xl bg-red-100 flex items-center justify-center flex-shrink-0">
                        <Gauge class="w-4 h-4 text-red-600" />
                    </div>
                    <div class="min-w-0 flex-1">
                        <div class="text-xs text-gray-500">CPU 主频</div>
                        <div class="text-sm font-medium text-gray-800">
                            {{ systemInfo.cpuFreq ? (systemInfo.cpuFreq / 1000).toFixed(2) : '-' }} GHz
                        </div>
                    </div>
                </div>

                <!-- 内存总量 -->
                <div class="flex items-start space-x-2">
                    <div class="w-8 h-8 rounded-2xl bg-indigo-100 flex items-center justify-center flex-shrink-0">
                        <MemoryStick class="w-4 h-4 text-indigo-600" />
                    </div>
                    <div class="min-w-0 flex-1">
                        <div class="text-xs text-gray-500">内存总量</div>
                        <div class="text-sm font-medium text-gray-800">{{ systemInfo.memoryTotal ? systemInfo.memoryTotal.toFixed(2) : '-' }} GB</div>
                    </div>
                </div>
            </div>

            <!-- 网络状态 -->
            <div class="mt-4 pt-4 border-t border-gray-100">
                <div class="flex items-center space-x-2 mb-3">
                    <Wifi class="w-4 h-4 text-cyan-500" />
                    <h4 class="font-medium text-gray-600 text-xs sm:text-sm">网络连接状态</h4>
                </div>
                <div class="flex items-center space-x-4">
                    <div class="flex items-center space-x-2">
                        <div class="w-2 h-2 rounded-full" :class="networkStatus.baidu === 'checking' ? 'bg-yellow-500 animate-pulse' : networkStatus.baidu ? 'bg-green-500 animate-pulse' : 'bg-red-500'"></div>
                        <span class="text-xs sm:text-sm text-gray-600">百度</span>
                        <span :class="networkStatus.baidu === 'checking' ? 'text-yellow-600' : networkStatus.baidu ? 'text-green-600' : 'text-red-600'" class="text-xs font-medium">
                            {{ networkStatus.baidu === 'checking' ? '检测中' : networkStatus.baidu ? '可达' : '不可达' }}
                        </span>
                    </div>
                    <div class="flex items-center space-x-2">
                        <div class="w-2 h-2 rounded-full" :class="networkStatus.google === 'checking' ? 'bg-yellow-500 animate-pulse' : networkStatus.google ? 'bg-green-500 animate-pulse' : 'bg-red-500'"></div>
                        <span class="text-xs sm:text-sm text-gray-600">谷歌</span>
                        <span :class="networkStatus.google === 'checking' ? 'text-yellow-600' : networkStatus.google ? 'text-green-600' : 'text-red-600'" class="text-xs font-medium">
                            {{ networkStatus.google === 'checking' ? '检测中' : networkStatus.google ? '可达' : '不可达' }}
                        </span>
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
</style>
