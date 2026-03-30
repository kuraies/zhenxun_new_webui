<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { Line, Pie, Bar } from 'vue-chartjs'
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend,
    Filler,
    ArcElement,
    BarElement,
    type ChartOptions
} from 'chart.js'
import { TrendingUp, Users, MessageSquare, Activity, Hash, User, Plug, RefreshCw, Clock, Calendar, DollarSign, Heart } from 'lucide-vue-next'
import { botApi, mainApi, analyticsApi } from '@/utils/api-next'
import { ZXNotification } from '@/components'
import type { ActiveGroup, HotPlugin } from '@/types/main.types'
import type { GroupStatistics, FriendStatistics, Granularity, TrendData, TrendPoint, GroupStatisticsTimeRange, FriendStatisticsTimeRange, FavorabilityRank, GoldRank } from '@/types/api-next.types'

// 注册 ChartJS 组件
ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend,
    Filler,
    ArcElement,
    BarElement
)

// ==================== 统计数据 ====================
const stats = ref({
    chat_num: 0,
    chat_week: 0,
    chat_month: 0,
    chat_year: 0,
    call_num: 0,
    call_week: 0,
    call_month: 0,
    call_year: 0
})

// ==================== 时间范围选择 ====================
// 时间范围选择
const startTime = ref<string>('')
const endTime = ref<string>('')
const granularity = ref<Granularity>('day')

// 快捷时间范围选项
const quickTimeRanges = [
    { label: '最近 1 天', value: '1d', hours: 24 },
    { label: '最近 7 天', value: '7d', hours: 7 * 24 },
    { label: '最近 30 天', value: '30d', hours: 30 * 24 },
    { label: '最近 90 天', value: '90d', hours: 90 * 24 },
    { label: '自定义', value: 'custom', hours: null },
] as const

// 当前选中的快捷范围
const selectedQuickRange = ref<string>('30d')

// 时间粒度选项
const granularityOptions = [
    { label: '小时', value: 'hour' as Granularity },
    { label: '天', value: 'day' as Granularity },
    { label: '周', value: 'week' as Granularity },
    { label: '月', value: 'month' as Granularity },
] as const

// ==================== 趋势图数据（真实 API） ====================
const trendDataApi = ref<TrendData | null>(null)
const isTrendLoading = ref(false)

// ==================== 饼图数据 ====================
const pieDataLoading = ref(false)

// 活跃群组饼图数据
const activeGroupData = ref({
    labels: [] as string[],
    datasets: [{
        data: [] as number[],
        backgroundColor: [
            'rgba(59, 130, 246, 0.8)',
            'rgba(16, 185, 129, 0.8)',
            'rgba(245, 158, 11, 0.8)',
            'rgba(239, 68, 68, 0.8)',
            'rgba(139, 92, 246, 0.8)',
            'rgba(236, 72, 153, 0.8)',
            'rgba(239, 103, 56, 0.8)',
            'rgba(34, 197, 94, 0.8)',
            'rgba(99, 102, 241, 0.8)',
            'rgba(244, 114, 182, 0.8)'
        ],
        borderColor: [
            'rgba(59, 130, 246, 1)',
            'rgba(16, 185, 129, 1)',
            'rgba(245, 158, 11, 1)',
            'rgba(239, 68, 68, 1)',
            'rgba(139, 92, 246, 1)',
            'rgba(236, 72, 153, 1)',
            'rgba(239, 103, 56, 1)',
            'rgba(34, 197, 94, 1)',
            'rgba(99, 102, 241, 1)',
            'rgba(244, 114, 182, 1)'
        ],
        borderWidth: 1
    }]
})

// 热门插件饼图数据
const hotPluginData = ref({
    labels: [] as string[],
    datasets: [{
        data: [] as number[],
        backgroundColor: [
            'rgba(96, 170, 250, 0.8)',
            'rgba(244, 114, 182, 0.8)',
            'rgba(52, 211, 153, 0.8)',
            'rgba(251, 146, 60, 0.8)',
            'rgba(167, 139, 250, 0.8)',
            'rgba(251, 113, 133, 0.8)',
            'rgba(59, 130, 246, 0.8)',
            'rgba(34, 197, 94, 0.8)',
            'rgba(234, 179, 8, 0.8)',
            'rgba(239, 68, 68, 0.8)'
        ],
        borderColor: [
            'rgba(96, 170, 250, 1)',
            'rgba(244, 114, 182, 1)',
            'rgba(52, 211, 153, 1)',
            'rgba(251, 146, 60, 1)',
            'rgba(167, 139, 250, 1)',
            'rgba(251, 113, 133, 1)',
            'rgba(59, 130, 246, 1)',
            'rgba(34, 197, 94, 1)',
            'rgba(234, 179, 8, 1)',
            'rgba(239, 68, 68, 1)'
        ],
        borderWidth: 1
    }]
})

// ==================== 柱状图数据 ====================
// 好感度 top10 数据
const favorabilityData = ref<{
    labels: string[]
    datasets: [{
        data: number[]
        backgroundColor: string
        borderColor: string
        borderWidth: number
    }]
}>({
    labels: [],
    datasets: [{
        data: [],
        backgroundColor: 'rgba(236, 72, 153, 0.8)',
        borderColor: 'rgba(236, 72, 153, 1)',
        borderWidth: 1
    }]
})

// 金币 top10 数据
const goldData = ref<{
    labels: string[]
    datasets: [{
        data: number[]
        backgroundColor: string
        borderColor: string
        borderWidth: number
    }]
}>({
    labels: [],
    datasets: [{
        data: [],
        backgroundColor: 'rgba(234, 179, 8, 0.8)',
        borderColor: 'rgba(234, 179, 8, 1)',
        borderWidth: 1
    }]
})

// 柱状图配置
const barOptions: ChartOptions<'bar'> = {
    responsive: true,
    maintainAspectRatio: false,
    animation: {
        duration: 1000
    },
    plugins: {
        legend: {
            display: false
        },
        tooltip: {
            callbacks: {
                label: (context: any) => {
                    const value = Number(context.parsed?.y ?? context.parsed ?? 0)
                    return `数值：${value}`
                }
            }
        }
    },
    scales: {
        x: {
            grid: {
                display: false
            },
            ticks: {
                maxRotation: 45,
                minRotation: 45,
                font: {
                    size: 10
                }
            }
        },
        y: {
            beginAtZero: true,
            grid: {
                color: 'rgba(0, 0, 0, 0.05)'
            },
            ticks: {
                precision: 0,
                callback: (value: any) => {
                    return Number(value)
                }
            }
        }
    }
}

// 饼图配置
const pieOptions: ChartOptions<'pie'> = {
    responsive: true,
    maintainAspectRatio: false,
    animation: {
        duration: 1000,
        animateScale: true,
        animateRotate: true
    },
    plugins: {
        legend: {
            position: 'right' as const,
            labels: {
                boxWidth: 12,
                padding: 10,
                font: {
                    size: 11
                }
            }
        },
        tooltip: {
            callbacks: {
                label: (context: any) => {
                    const label = context.label || ''
                    const value = context.parsed || 0
                    const total = context.dataset.data.reduce((a: number, b: number) => a + b, 0)
                    const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : 0
                    return `${label}: ${value} (${percentage}%)`
                }
            }
        }
    }
}

// ==================== 详细统计数据 ====================
const groupStats = ref<GroupStatistics[]>([])
const friendStats = ref<FriendStatistics[]>([])
const isLoadingStats = ref(false)
const activeTab = ref<'groups' | 'friends'>('groups')

// 分页相关
const currentPage = ref(1)
const pageSize = ref(10) // 每页显示 10 条

// 计算总消息数用于百分比计算
const totalGroupMessages = computed(() => {
    return groupStats.value.reduce((sum, g) => sum + g.message_count, 0)
})

const totalFriendMessages = computed(() => {
    return friendStats.value.reduce((sum, f) => sum + f.message_count, 0)
})

// 排序后的统计数据（按消息数量降序）
const sortedGroupStats = computed(() => {
    return [...groupStats.value].sort((a, b) => b.message_count - a.message_count)
})

const sortedFriendStats = computed(() => {
    return [...friendStats.value].sort((a, b) => b.message_count - a.message_count)
})

// 分页后的群组数据
const paginatedGroupStats = computed(() => {
    const start = (currentPage.value - 1) * pageSize.value
    const end = start + pageSize.value
    return sortedGroupStats.value.slice(start, end)
})

// 分页后的好友数据
const paginatedFriendStats = computed(() => {
    const start = (currentPage.value - 1) * pageSize.value
    const end = start + pageSize.value
    return sortedFriendStats.value.slice(start, end)
})

// 群组总页数
const groupTotalPages = computed(() => {
    return Math.ceil(sortedGroupStats.value.length / pageSize.value)
})

// 好友总页数
const friendTotalPages = computed(() => {
    return Math.ceil(sortedFriendStats.value.length / pageSize.value)
})

// 当前显示的数据范围文本
const currentPageRangeText = computed(() => {
    const total = activeTab.value === 'groups' ? sortedGroupStats.value.length : sortedFriendStats.value.length
    if (total === 0) return '暂无数据'
    const start = (currentPage.value - 1) * pageSize.value + 1
    const end = Math.min(currentPage.value * pageSize.value, total)
    return `显示 ${start}-${end} / 共 ${total} 条`
})

// 切换 Tab 时重置页码
const changeTab = (tab: 'groups' | 'friends') => {
    activeTab.value = tab
    currentPage.value = 1
}

// 获取排名样式
const getRankClass = (rank: number) => {
    if (rank === 1) return 'bg-yellow-400 text-yellow-900'
    if (rank === 2) return 'bg-gray-300 text-gray-700'
    if (rank === 3) return 'bg-amber-600 text-amber-100'
    return 'bg-gray-100 text-gray-600'
}

// 计算消息百分比
const getMessagePercentage = (count: number) => {
    const total = activeTab.value === 'groups' ? totalGroupMessages.value : totalFriendMessages.value
    if (total === 0) return 0
    return (count / total) * 100
}

// ==================== 辅助函数 ====================
/**
 * 格式化日期为 ISO 字符串（移除毫秒部分）
 */
const formatToISOString = (date: Date): string => {
    const pad = (n: number) => n.toString().padStart(2, '0')
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
}

/**
 * 设置默认时间范围（最近 N 小时）- 不改变粒度
 */
const setDefaultTimeRange = (hours: number = 30 * 24) => {
    const end = new Date()
    const start = new Date()
    start.setHours(start.getHours() - hours)

    startTime.value = formatToISOString(start)
    endTime.value = formatToISOString(end)
}

/**
 * 根据时间范围自动计算合适的时间粒度
 */
const calculateGranularity = (start: string, end: string): Granularity => {
    const startDate = new Date(start)
    const endDate = new Date(end)
    const diffHours = (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60)

    if (diffHours <= 24) return 'hour'
    if (diffHours <= 7 * 24) return 'hour'
    if (diffHours <= 31 * 24) return 'day'
    if (diffHours <= 90 * 24) return 'day'
    if (diffHours <= 365 * 24) return 'week'
    return 'month'
}

// 图表配置
const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
        legend: {
            position: 'top' as const
        }
    },
    scales: {
        y: {
            type: 'linear' as const,
            display: true,
            position: 'left' as const,
            title: {
                display: true,
                text: '消息数量'
            }
        },
        y1: {
            type: 'linear' as const,
            display: true,
            position: 'right' as const,
            title: {
                display: true,
                text: '调用次数'
            },
            grid: {
                drawOnChartArea: false
            }
        }
    }
}

// ==================== API 调用函数 ====================

/**
 * 加载趋势数据（真实 API）
 */
const loadTrendData = async () => {
    try {
        isTrendLoading.value = true

        const res = await analyticsApi.getTrendData({
            start_time: startTime.value,
            end_time: endTime.value,
            granularity: granularity.value,
        })

        if (res?.success && res?.data) {
            trendDataApi.value = res.data
        }
    } catch (error) {
        console.error('加载趋势数据失败:', error)
        ZXNotification({
            title: '呜呼～',
            message: '趋势数据加载失败了 (っ °Д °;) っ',
            type: '😭',
            position: 'top-right'
        })
    } finally {
        isTrendLoading.value = false
    }
}

/**
 * 加载详细统计数据（带时间范围）
 */
const loadDetailedStatistics = async () => {
    try {
        isLoadingStats.value = true
        // 重置页码到第一页
        currentPage.value = 1
        const res = await analyticsApi.getStatistics({
            start_time: startTime.value,
            end_time: endTime.value,
        })
        if (res?.success && res?.data) {
            // 将新类型转换为现有类型
            groupStats.value = res.data.groups.map((g: GroupStatisticsTimeRange) => ({
                group_id: g.group_id,
                group_name: g.group_name,
                message_count: g.message_count,
                plugin_call_count: g.plugin_call_count,
            }))
            friendStats.value = res.data.friends.map((f: FriendStatisticsTimeRange) => ({
                user_id: f.user_id,
                user_name: f.user_name,
                message_count: f.message_count,
                plugin_call_count: f.plugin_call_count,
            }))
        }
    } catch (error) {
        console.error('加载详细统计数据失败:', error)
    } finally {
        isLoadingStats.value = false
    }
}

/**
 * 加载饼图数据（活跃群组 Top10 和热门插件 Top10）
 */
const loadPieChartData = async () => {
    pieDataLoading.value = true
    try {
        // 获取活跃群组数据（Top 10）- 使用自定义时间范围
        const activeGroupRes = await mainApi.getActiveGroups(
            undefined,  // dateType 不使用
            undefined,  // botId
            startTime.value,
            endTime.value
        )
        if (activeGroupRes?.success && activeGroupRes?.data) {
            // 强制触发响应式更新
            activeGroupData.value = {
                labels: activeGroupRes.data.map((g: ActiveGroup) => g.name || g.group_id),
                datasets: [{
                    data: activeGroupRes.data.map((g: ActiveGroup) => g.chat_num),
                    backgroundColor: activeGroupData.value.datasets[0].backgroundColor,
                    borderColor: activeGroupData.value.datasets[0].borderColor,
                    borderWidth: 1
                }]
            }
        }

        // 获取热门插件数据（Top 10）- 使用自定义时间范围
        const hotPluginRes = await mainApi.getHotPlugins(
            undefined,  // dateType 不使用
            undefined,  // botId
            startTime.value,
            endTime.value
        )
        if (hotPluginRes?.success && hotPluginRes?.data) {
            // 强制触发响应式更新
            hotPluginData.value = {
                labels: hotPluginRes.data.map((p: HotPlugin) => p.plugin_name || p.module || '').filter(Boolean),
                datasets: [{
                    data: hotPluginRes.data.map((p: HotPlugin) => p.call_count),
                    backgroundColor: hotPluginData.value.datasets[0].backgroundColor,
                    borderColor: hotPluginData.value.datasets[0].borderColor,
                    borderWidth: 1
                }]
            }
        }
    } catch (error) {
        ZXNotification({
            title: '呜呼～',
            message: '统计数据加载失败了 (っ °Д °;) っ',
            type: '😭',
            position: 'top-right'
        })
    } finally {
        // 延迟一下让动画生效
        setTimeout(() => {
            pieDataLoading.value = false
        }, 100)
    }
}

/**
 * 加载柱状图数据（好感度 top10 和金币 top10）
 */
const loadBarChartData = async () => {
    try {
        // 获取好感度 top10
        const favorabilityRes = await analyticsApi.getFavorabilityTop10()
        if (favorabilityRes?.success && favorabilityRes?.data) {
            favorabilityData.value = {
                labels: favorabilityRes.data.map((item: FavorabilityRank) => item.user_name),
                datasets: [{
                    data: favorabilityRes.data.map((item: FavorabilityRank) => Number(item.favorability)),
                    backgroundColor: 'rgba(236, 72, 153, 0.8)',
                    borderColor: 'rgba(236, 72, 153, 1)',
                    borderWidth: 1
                }]
            }
        }

        // 获取金币 top10
        const goldRes = await analyticsApi.getGoldTop10()
        if (goldRes?.success && goldRes?.data) {
            goldData.value = {
                labels: goldRes.data.map((item: GoldRank) => item.user_name),
                datasets: [{
                    data: goldRes.data.map((item: GoldRank) => Number(item.gold)),
                    backgroundColor: 'rgba(234, 179, 8, 0.8)',
                    borderColor: 'rgba(234, 179, 8, 1)',
                    borderWidth: 1
                }]
            }
        }
    } catch (error) {
        console.error('加载柱状图数据失败:', error)
    }
}

/**
 * 加载统计数据和趋势
 */
const loadStats = async () => {
    try {
        // 设置默认时间范围（最近 30 天）
        setDefaultTimeRange(30 * 24)

        // 获取聊天统计数据（用于顶部卡片）
        const chatRes = await botApi.get_chat_and_call_count()
        if (chatRes?.success && chatRes?.data) {
            stats.value = {
                chat_num: chatRes.data.all ?? 0,
                chat_week: chatRes.data.week ?? 0,
                chat_month: chatRes.data.month ?? 0,
                chat_year: chatRes.data.year ?? 0,
                call_num: 0,
                call_week: 0,
                call_month: 0,
                call_year: 0
            }
        }

        // 获取插件调用统计数据
        const pluginRes = await botApi.get_all_chat_and_call_count()
        if (pluginRes?.success && pluginRes?.data) {
            stats.value.call_week = pluginRes.data.week ?? 0
            stats.value.call_month = pluginRes.data.month ?? 0
            stats.value.call_year = pluginRes.data.year ?? 0
            stats.value.call_num = pluginRes.data.all ?? pluginRes.data.week ?? 0
        }

        // 加载真实趋势数据
        await loadTrendData()

        // 加载饼图数据
        await loadPieChartData()
    } catch (error) {
        console.error('加载统计数据失败:', error)
        ZXNotification({
            title: '呜呼～',
            message: '统计数据加载失败了 (っ °Д °;) っ',
            type: '😭',
            position: 'top-right'
        })
    }
}

// 时间范围类型（用于饼图）
const currentDateType = ref<'all' | 'day' | 'week' | 'month' | 'year'>('all')

/**
 * 切换时间范围（只刷新饼图数据）
 */
const handleDateTypeChange = (type: typeof currentDateType.value) => {
    currentDateType.value = type
    loadPieChartData()
}

/**
 * 获取趋势图数据（转换为 Chart.js 格式）
 */
const chartData = computed(() => {
    if (!trendDataApi.value) return null

    const labels = trendDataApi.value.data_points.map((point) => {
        const date = new Date(point.timestamp)
        if (granularity.value === 'hour') {
            return `${date.getMonth() + 1}/${date.getDate()} ${date.getHours()}:00`
        } else if (granularity.value === 'week') {
            return `第${Math.ceil(date.getDate() / 7)}周`
        } else if (granularity.value === 'month') {
            return `${date.getFullYear()}年${date.getMonth() + 1}月`
        }
        return `${date.getMonth() + 1}/${date.getDate()}`
    })

    return {
        labels,
        datasets: [
            {
                label: '消息数量',
                backgroundColor: 'rgba(96, 170, 250, 0.2)',
                borderColor: 'rgba(96, 170, 250, 1)',
                fill: true,
                data: trendDataApi.value.data_points.map(p => p.message_count),
                yAxisID: 'y'
            },
            {
                label: '调用次数',
                backgroundColor: 'rgba(244, 114, 182, 0.2)',
                borderColor: 'rgba(244, 114, 182, 1)',
                fill: true,
                data: trendDataApi.value.data_points.map(p => p.plugin_call_count),
                yAxisID: 'y1'
            }
        ]
    }
})

onMounted(() => {
    loadStats()
    loadDetailedStatistics()
    loadBarChartData()
})
</script>

<template>
    <div class="w-full h-full flex flex-col space-y-3 sm:space-y-4 overflow-y-auto">
        <!-- 头部标题 -->
        <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between bg-white rounded-2xl shadow-sm p-4 outline-1 outline-slate-200 space-y-3 sm:space-y-0">
            <div class="flex items-center space-x-3">
                <Activity class="h-6 w-6 text-blue-500 flex-shrink-0" />
                <h2 class="text-lg font-semibold text-gray-800">数据统计</h2>
            </div>

            <div class="flex flex-col sm:flex-row items-start sm:items-center space-y-2 sm:space-y-0 sm:space-x-3">
                <!-- 快捷时间范围选择 -->
                <div class="flex items-center space-x-1">
                    <div class="flex items-center space-x-1 bg-gray-100 rounded-2xl p-1">
                        <button
                            v-for="range in quickTimeRanges"
                            :key="range.value"
                            @click="selectedQuickRange = range.value; setDefaultTimeRange(range.hours || (30 * 24)); loadTrendData(); loadDetailedStatistics(); loadPieChartData()"
                            class="px-3 py-1.5 text-xs font-medium rounded-2xl transition-all duration-200 btn-touch"
                            :class="[
                                selectedQuickRange === range.value
                                    ? 'bg-white text-gray-800 shadow-sm'
                                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-200/50'
                            ]"
                        >
                            {{ range.label }}
                        </button>
                    </div>
                </div>

                <!-- 时间粒度选择 -->
                <div class="flex items-center space-x-1">
                    <div class="flex items-center space-x-1 bg-gray-100 rounded-2xl p-1">
                        <button
                            v-for="opt in granularityOptions"
                            :key="opt.value"
                            @click="granularity = opt.value; loadTrendData()"
                            class="px-3 py-1.5 text-xs font-medium rounded-2xl transition-all duration-200 btn-touch"
                            :class="[
                                granularity === opt.value
                                    ? 'bg-white text-gray-800 shadow-sm'
                                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-200/50'
                            ]"
                        >
                            {{ opt.label }}
                        </button>
                    </div>
                </div>
            </div>
        </div>

        <!-- 自定义时间范围选择器 -->
        <div v-if="selectedQuickRange === 'custom'" class="bg-white rounded-2xl shadow-sm outline-1 outline-slate-200 p-4">
            <div class="flex flex-col sm:flex-row items-start sm:items-center space-y-2 sm:space-y-0 sm:space-x-4">
                <div class="flex items-center space-x-2">
                    <Clock class="w-4 h-4 text-gray-500" />
                    <label class="text-sm text-gray-600">起始时间:</label>
                    <el-date-picker
                        v-model="startTime"
                        type="datetime"
                        placeholder="选择起始时间"
                        format="YYYY-MM-DD HH:mm:ss"
                        value-format="YYYY-MM-DDTHH:mm:ss"
                        class="w-[200px]"
                    />
                </div>
                <div class="flex items-center space-x-2">
                    <Calendar class="w-4 h-4 text-gray-500" />
                    <label class="text-sm text-gray-600">结束时间:</label>
                    <el-date-picker
                        v-model="endTime"
                        type="datetime"
                        placeholder="选择结束时间"
                        format="YYYY-MM-DD HH:mm:ss"
                        value-format="YYYY-MM-DDTHH:mm:ss"
                        class="w-[200px]"
                    />
                </div>
                <button
                    @click="loadTrendData(); loadDetailedStatistics(); loadPieChartData()"
                    class="px-4 py-1.5 bg-blue-500 text-white text-sm rounded-2xl hover:bg-blue-600 transition-colors"
                >
                    应用
                </button>
            </div>
        </div>

        <!-- 统计卡片 -->
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-4">
            <!-- 全部消息 -->
            <div class="bg-white rounded-2xl shadow-sm outline-1 outline-slate-200 p-3 sm:p-4">
                <div class="flex items-center space-x-2 sm:space-x-3">
                    <div class="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-slate-100 flex items-center justify-center flex-shrink-0">
                        <MessageSquare class="w-4 h-4 sm:w-5 sm:h-5 text-slate-600" />
                    </div>
                    <div class="min-w-0">
                        <div class="text-xl sm:text-2xl font-bold text-gray-800 truncate">{{ stats.chat_num }}</div>
                        <div class="text-xs text-gray-500 truncate">全部消息</div>
                    </div>
                </div>
            </div>

            <!-- 一周消息 -->
            <div class="bg-white rounded-2xl shadow-sm outline-1 outline-slate-200 p-3 sm:p-4">
                <div class="flex items-center space-x-2 sm:space-x-3">
                    <div class="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                        <MessageSquare class="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" />
                    </div>
                    <div class="min-w-0">
                        <div class="text-xl sm:text-2xl font-bold text-gray-800 truncate">{{ stats.chat_week }}</div>
                        <div class="text-xs text-gray-500 truncate">一周消息</div>
                    </div>
                </div>
            </div>

            <!-- 一月消息 -->
            <div class="bg-white rounded-2xl shadow-sm outline-1 outline-slate-200 p-3 sm:p-4">
                <div class="flex items-center space-x-2 sm:space-x-3">
                    <div class="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                        <MessageSquare class="w-4 h-4 sm:w-5 sm:h-5 text-green-600" />
                    </div>
                    <div class="min-w-0">
                        <div class="text-xl sm:text-2xl font-bold text-gray-800 truncate">{{ stats.chat_month }}</div>
                        <div class="text-xs text-gray-500 truncate">一月消息</div>
                    </div>
                </div>
            </div>

            <!-- 一年消息 -->
            <div class="bg-white rounded-2xl shadow-sm outline-1 outline-slate-200 p-3 sm:p-4">
                <div class="flex items-center space-x-2 sm:space-x-3">
                    <div class="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-yellow-100 flex items-center justify-center flex-shrink-0">
                        <MessageSquare class="w-4 h-4 sm:w-5 sm:h-5 text-yellow-600" />
                    </div>
                    <div class="min-w-0">
                        <div class="text-xl sm:text-2xl font-bold text-gray-800 truncate">{{ stats.chat_year }}</div>
                        <div class="text-xs text-gray-500 truncate">一年消息</div>
                    </div>
                </div>
            </div>

            <!-- 全部调用 -->
            <div class="bg-white rounded-2xl shadow-sm outline-1 outline-slate-200 p-3 sm:p-4">
                <div class="flex items-center space-x-2 sm:space-x-3">
                    <div class="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-slate-100 flex items-center justify-center flex-shrink-0">
                        <Activity class="w-4 h-4 sm:w-5 sm:h-5 text-slate-600" />
                    </div>
                    <div class="min-w-0">
                        <div class="text-xl sm:text-2xl font-bold text-gray-800 truncate">{{ stats.call_num }}</div>
                        <div class="text-xs text-gray-500 truncate">全部调用</div>
                    </div>
                </div>
            </div>

            <!-- 一周调用 -->
            <div class="bg-white rounded-2xl shadow-sm outline-1 outline-slate-200 p-3 sm:p-4">
                <div class="flex items-center space-x-2 sm:space-x-3">
                    <div class="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                        <Activity class="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" />
                    </div>
                    <div class="min-w-0">
                        <div class="text-xl sm:text-2xl font-bold text-gray-800 truncate">{{ stats.call_week }}</div>
                        <div class="text-xs text-gray-500 truncate">一周调用</div>
                    </div>
                </div>
            </div>

            <!-- 一月调用 -->
            <div class="bg-white rounded-2xl shadow-sm outline-1 outline-slate-200 p-3 sm:p-4">
                <div class="flex items-center space-x-2 sm:space-x-3">
                    <div class="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                        <Activity class="w-4 h-4 sm:w-5 sm:h-5 text-green-600" />
                    </div>
                    <div class="min-w-0">
                        <div class="text-xl sm:text-2xl font-bold text-gray-800 truncate">{{ stats.call_month }}</div>
                        <div class="text-xs text-gray-500 truncate">一月调用</div>
                    </div>
                </div>
            </div>

            <!-- 一年调用 -->
            <div class="bg-white rounded-2xl shadow-sm outline-1 outline-slate-200 p-3 sm:p-4">
                <div class="flex items-center space-x-2 sm:space-x-3">
                    <div class="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-yellow-100 flex items-center justify-center flex-shrink-0">
                        <Activity class="w-4 h-4 sm:w-5 sm:h-5 text-yellow-600" />
                    </div>
                    <div class="min-w-0">
                        <div class="text-xl sm:text-2xl font-bold text-gray-800 truncate">{{ stats.call_year }}</div>
                        <div class="text-xs text-gray-500 truncate">一年调用</div>
                    </div>
                </div>
            </div>
        </div>

        <!-- 图表区域 -->
        <div class="flex flex-col space-y-3 sm:space-y-4">
            <!-- 合并趋势图（全宽） -->
            <div class="bg-white rounded-2xl shadow-sm outline-1 outline-slate-200 p-3 sm:p-4">
                <div class="flex items-center justify-between mb-3 sm:mb-4">
                    <h3 class="text-sm sm:text-base font-semibold text-gray-800">
                        消息与调用趋势
                        <span v-if="trendDataApi" class="text-xs font-normal text-gray-500 ml-2">
                            ({{ trendDataApi.data_points.length }} 个数据点 · {{ granularityOptions.find(o => o.value === granularity)?.label }})
                        </span>
                    </h3>
                    <div class="text-xs text-gray-500">
                        总消息：{{ trendDataApi?.total_message_count ?? 0 }} |
                        总调用：{{ trendDataApi?.total_plugin_call_count ?? 0 }}
                    </div>
                </div>
                <div class="h-48 sm:h-64 relative">
                    <div v-if="isTrendLoading" class="absolute inset-0 flex items-center justify-center">
                        <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                    </div>
                    <Line
                        v-else-if="chartData && chartData.datasets[0].data.length > 0"
                        :data="chartData"
                        :options="chartOptions"
                    />
                    <div v-else class="flex items-center justify-center h-full text-gray-400">
                        <Activity class="h-12 w-12 mr-2 opacity-50" />
                        <span>暂无趋势数据</span>
                    </div>
                </div>
            </div>

            <!-- 饼图区域 -->
            <div class="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4">
                <!-- 活跃群组饼图 -->
                <div class="bg-white rounded-2xl shadow-sm outline-1 outline-slate-200 p-3 sm:p-4">
                    <h3 class="text-sm sm:text-base font-semibold text-gray-800 mb-3 sm:mb-4">活跃群组 Top10</h3>
                    <div class="h-48 sm:h-64 flex items-center justify-center relative">
                        <Pie
                            v-if="!pieDataLoading && activeGroupData.labels.length > 0"
                            :data="activeGroupData"
                            :options="pieOptions"
                        />
                        <div v-if="pieDataLoading" class="absolute inset-0 flex items-center justify-center">
                            <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                        </div>
                        <div v-if="!pieDataLoading && activeGroupData.labels.length === 0" class="text-center text-gray-400">
                            <Users class="h-12 w-12 mx-auto mb-2 opacity-50" />
                            <p class="text-sm">暂无数据</p>
                        </div>
                    </div>
                </div>

                <!-- 热门插件饼图 -->
                <div class="bg-white rounded-2xl shadow-sm outline-1 outline-slate-200 p-3 sm:p-4">
                    <h3 class="text-sm sm:text-base font-semibold text-gray-800 mb-3 sm:mb-4">热门插件 Top10</h3>
                    <div class="h-48 sm:h-64 flex items-center justify-center relative">
                        <Pie
                            v-if="!pieDataLoading && hotPluginData.labels.length > 0"
                            :data="hotPluginData"
                            :options="pieOptions"
                        />
                        <div v-if="pieDataLoading" class="absolute inset-0 flex items-center justify-center">
                            <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                        </div>
                        <div v-if="!pieDataLoading && hotPluginData.labels.length === 0" class="text-center text-gray-400">
                            <TrendingUp class="h-12 w-12 mx-auto mb-2 opacity-50" />
                            <p class="text-sm">暂无数据</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- 柱状图区域 -->
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4">
            <!-- 好感度 Top10 -->
            <div class="bg-white rounded-2xl shadow-sm outline-1 outline-slate-200 p-3 sm:p-4">
                <h3 class="text-sm sm:text-base font-semibold text-gray-800 mb-3 sm:mb-4 flex items-center">
                    <Heart class="w-4 h-4 mr-2 text-pink-500" />
                    好感度 Top10
                </h3>
                <div class="h-64 sm:h-80 relative">
                    <Bar
                        v-if="favorabilityData.labels.length > 0"
                        :data="favorabilityData"
                        :options="barOptions"
                    />
                    <div v-else class="flex items-center justify-center h-full text-gray-400">
                        <Heart class="h-12 w-12 mr-2 opacity-50" />
                        <span>暂无数据</span>
                    </div>
                </div>
            </div>

            <!-- 金币 Top10 -->
            <div class="bg-white rounded-2xl shadow-sm outline-1 outline-slate-200 p-3 sm:p-4">
                <h3 class="text-sm sm:text-base font-semibold text-gray-800 mb-3 sm:mb-4 flex items-center">
                    <DollarSign class="w-4 h-4 mr-2 text-yellow-600" />
                    金币 Top10
                </h3>
                <div class="h-64 sm:h-80 relative">
                    <Bar
                        v-if="goldData.labels.length > 0"
                        :data="goldData"
                        :options="barOptions"
                    />
                    <div v-else class="flex items-center justify-center h-full text-gray-400">
                        <DollarSign class="h-12 w-12 mr-2 opacity-50" />
                        <span>暂无数据</span>
                    </div>
                </div>
            </div>
        </div>

        <!-- 详细统计数据 - 群组/好友消息和调用情况 -->
        <div class="bg-white rounded-2xl shadow-sm outline-1 outline-slate-200 p-3 sm:p-6">
            <div class="flex items-center justify-between mb-4 sm:mb-6">
                <h3 class="text-base sm:text-lg font-bold text-gray-800 flex items-center space-x-2">
                    <Activity class="w-4 h-4 sm:w-5 sm:h-5 text-blue-500" />
                    <span>详细统计</span>
                </h3>
                <button
                    @click="loadDetailedStatistics"
                    :disabled="isLoadingStats"
                    class="p-2 bg-gray-100 hover:bg-gray-200 rounded-2xl transition-colors btn-touch flex-shrink-0"
                    title="刷新统计数据"
                >
                    <RefreshCw :class="isLoadingStats ? 'animate-spin' : ''" class="w-5 h-5 text-gray-600" />
                </button>
            </div>

            <!-- Tab 切换 -->
            <div class="border-b border-gray-200 mb-4">
                <div class="flex space-x-4">
                    <button
                        @click="changeTab('groups')"
                        :class="activeTab === 'groups' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'"
                        class="py-2 px-1 border-b-2 font-medium text-sm transition-colors flex items-center space-x-1"
                    >
                        <Hash class="w-4 h-4" />
                        <span>群组统计</span>
                        <span class="ml-1 px-2 py-0.5 bg-blue-100 text-blue-600 rounded-full text-xs">{{ groupStats.length }}</span>
                    </button>
                    <button
                        @click="changeTab('friends')"
                        :class="activeTab === 'friends' ? 'border-green-500 text-green-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'"
                        class="py-2 px-1 border-b-2 font-medium text-sm transition-colors flex items-center space-x-1"
                    >
                        <User class="w-4 h-4" />
                        <span>好友统计</span>
                        <span class="ml-1 px-2 py-0.5 bg-green-100 text-green-600 rounded-full text-xs">{{ friendStats.length }}</span>
                    </button>
                </div>
            </div>

            <!-- 加载状态 -->
            <div v-if="isLoadingStats" class="flex justify-center items-center py-12">
                <RefreshCw class="w-8 h-8 text-gray-400 animate-spin" />
                <span class="ml-2 text-gray-500">加载中...</span>
            </div>

            <!-- 群组统计表格 -->
            <div v-else-if="activeTab === 'groups'" class="overflow-x-auto">
                <div v-if="groupStats.length === 0" class="text-center py-12 text-gray-500">
                    <Users class="w-12 h-12 text-gray-300 mx-auto mb-2" />
                    <p>暂无群组数据</p>
                </div>
                <table v-else class="w-full text-sm table-fixed">
                    <thead>
                        <tr class="border-b border-gray-200">
                            <th class="text-left py-3 px-2 text-gray-600 font-medium w-16">排名</th>
                            <th class="text-left py-3 px-2 text-gray-600 font-medium">群组名称</th>
                            <th class="text-left py-3 px-2 text-gray-600 font-medium w-40">群组 ID</th>
                            <th class="text-center py-3 px-2 text-gray-600 font-medium w-32">消息数量</th>
                            <th class="text-center py-3 px-2 text-gray-600 font-medium w-32">插件调用</th>
                            <th class="text-center py-3 px-2 text-gray-600 font-medium w-40">消息占比</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr
                            v-for="(group, index) in paginatedGroupStats"
                            :key="group.group_id"
                            class="border-b border-gray-100 hover:bg-gray-50 transition-colors"
                        >
                            <td class="py-3 px-2">
                                <span :class="getRankClass(index + 1 + (currentPage - 1) * pageSize)" class="inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold">
                                    {{ index + 1 + (currentPage - 1) * pageSize }}
                                </span>
                            </td>
                            <td class="py-3 px-2 text-gray-800 font-medium truncate" :title="group.group_name">{{ group.group_name }}</td>
                            <td class="py-3 px-2 text-gray-500 text-xs truncate" :title="group.group_id">{{ group.group_id }}</td>
                            <td class="py-3 px-2 text-center">
                                <span class="inline-flex items-center px-2 py-1 rounded-2xl bg-blue-50 text-blue-600 font-medium">
                                    <MessageSquare class="w-3 h-3 mr-1" />
                                    {{ group.message_count }}
                                </span>
                            </td>
                            <td class="py-3 px-2 text-center">
                                <span class="inline-flex items-center px-2 py-1 rounded-2xl bg-purple-50 text-purple-600 font-medium">
                                    <Plug class="w-3 h-3 mr-1" />
                                    {{ group.plugin_call_count }}
                                </span>
                            </td>
                            <td class="py-3 px-2 text-center">
                                <div class="flex items-center justify-center space-x-2">
                                    <div class="w-20 h-2 bg-gray-200 rounded-full overflow-hidden flex-shrink-0">
                                        <div
                                            class="h-full bg-gradient-to-r from-blue-400 to-blue-500 rounded-full"
                                            :style="{ width: `${getMessagePercentage(group.message_count)}%` }"
                                        ></div>
                                    </div>
                                    <span class="text-gray-600 text-xs w-10 flex-shrink-0">{{ getMessagePercentage(group.message_count).toFixed(1) }}%</span>
                                </div>
                            </td>
                        </tr>
                    </tbody>
                </table>

                <!-- 分页控件 -->
                <div v-if="groupTotalPages > 1" class="flex items-center justify-between mt-4 pt-4 border-t border-gray-200">
                    <div class="text-sm text-gray-500">
                        {{ currentPageRangeText }}
                    </div>
                    <div class="flex items-center space-x-2">
                        <button
                            @click="currentPage = 1"
                            :disabled="currentPage === 1"
                            class="px-3 py-1 text-sm rounded-2xl border border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100 transition-colors"
                        >
                            首页
                        </button>
                        <button
                            @click="currentPage = Math.max(1, currentPage - 1)"
                            :disabled="currentPage === 1"
                            class="px-3 py-1 text-sm rounded-2xl border border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100 transition-colors"
                        >
                            上一页
                        </button>
                        <span class="px-3 py-1 text-sm text-gray-600">
                            第 {{ currentPage }} / {{ groupTotalPages }} 页
                        </span>
                        <button
                            @click="currentPage = Math.min(groupTotalPages, currentPage + 1)"
                            :disabled="currentPage === groupTotalPages"
                            class="px-3 py-1 text-sm rounded-2xl border border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100 transition-colors"
                        >
                            下一页
                        </button>
                        <button
                            @click="currentPage = groupTotalPages"
                            :disabled="currentPage === groupTotalPages"
                            class="px-3 py-1 text-sm rounded-2xl border border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100 transition-colors"
                        >
                            末页
                        </button>
                    </div>
                </div>
            </div>

            <!-- 好友统计表格 -->
            <div v-else-if="activeTab === 'friends'" class="overflow-x-auto">
                <div v-if="friendStats.length === 0" class="text-center py-12 text-gray-500">
                    <Users class="w-12 h-12 text-gray-300 mx-auto mb-2" />
                    <p>暂无好友数据</p>
                </div>
                <table v-else class="w-full text-sm table-fixed">
                    <thead>
                        <tr class="border-b border-gray-200">
                            <th class="text-left py-3 px-2 text-gray-600 font-medium w-16">排名</th>
                            <th class="text-left py-3 px-2 text-gray-600 font-medium">用户名称</th>
                            <th class="text-left py-3 px-2 text-gray-600 font-medium w-40">用户 ID</th>
                            <th class="text-center py-3 px-2 text-gray-600 font-medium w-32">消息数量</th>
                            <th class="text-center py-3 px-2 text-gray-600 font-medium w-32">插件调用</th>
                            <th class="text-center py-3 px-2 text-gray-600 font-medium w-40">消息占比</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr
                            v-for="(friend, index) in paginatedFriendStats"
                            :key="friend.user_id"
                            class="border-b border-gray-100 hover:bg-gray-50 transition-colors"
                        >
                            <td class="py-3 px-2">
                                <span :class="getRankClass(index + 1 + (currentPage - 1) * pageSize)" class="inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold">
                                    {{ index + 1 + (currentPage - 1) * pageSize }}
                                </span>
                            </td>
                            <td class="py-3 px-2 text-gray-800 font-medium truncate" :title="friend.user_name">{{ friend.user_name }}</td>
                            <td class="py-3 px-2 text-gray-500 text-xs truncate" :title="friend.user_id">{{ friend.user_id }}</td>
                            <td class="py-3 px-2 text-center">
                                <span class="inline-flex items-center px-2 py-1 rounded-2xl bg-green-50 text-green-600 font-medium">
                                    <MessageSquare class="w-3 h-3 mr-1" />
                                    {{ friend.message_count }}
                                </span>
                            </td>
                            <td class="py-3 px-2 text-center">
                                <span class="inline-flex items-center px-2 py-1 rounded-2xl bg-pink-50 text-pink-600 font-medium">
                                    <Plug class="w-3 h-3 mr-1" />
                                    {{ friend.plugin_call_count }}
                                </span>
                            </td>
                            <td class="py-3 px-2 text-center">
                                <div class="flex items-center justify-center space-x-2">
                                    <div class="w-20 h-2 bg-gray-200 rounded-full overflow-hidden flex-shrink-0">
                                        <div
                                            class="h-full bg-gradient-to-r from-green-400 to-green-500 rounded-full"
                                            :style="{ width: `${getMessagePercentage(friend.message_count)}%` }"
                                        ></div>
                                    </div>
                                    <span class="text-gray-600 text-xs w-10 flex-shrink-0">{{ getMessagePercentage(friend.message_count).toFixed(1) }}%</span>
                                </div>
                            </td>
                        </tr>
                    </tbody>
                </table>

                <!-- 分页控件 -->
                <div v-if="friendTotalPages > 1" class="flex items-center justify-between mt-4 pt-4 border-t border-gray-200">
                    <div class="text-sm text-gray-500">
                        {{ currentPageRangeText }}
                    </div>
                    <div class="flex items-center space-x-2">
                        <button
                            @click="currentPage = 1"
                            :disabled="currentPage === 1"
                            class="px-3 py-1 text-sm rounded-2xl border border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100 transition-colors"
                        >
                            首页
                        </button>
                        <button
                            @click="currentPage = Math.max(1, currentPage - 1)"
                            :disabled="currentPage === 1"
                            class="px-3 py-1 text-sm rounded-2xl border border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100 transition-colors"
                        >
                            上一页
                        </button>
                        <span class="px-3 py-1 text-sm text-gray-600">
                            第 {{ currentPage }} / {{ friendTotalPages }} 页
                        </span>
                        <button
                            @click="currentPage = Math.min(friendTotalPages, currentPage + 1)"
                            :disabled="currentPage === friendTotalPages"
                            class="px-3 py-1 text-sm rounded-2xl border border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100 transition-colors"
                        >
                            下一页
                        </button>
                        <button
                            @click="currentPage = friendTotalPages"
                            :disabled="currentPage === friendTotalPages"
                            class="px-3 py-1 text-sm rounded-2xl border border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100 transition-colors"
                        >
                            末页
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
</style>
