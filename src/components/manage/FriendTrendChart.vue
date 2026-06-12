<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { Line } from 'vue-chartjs'
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
    type ChartOptions
} from 'chart.js'
import { TrendingUp, MessageSquare, Zap } from 'lucide-vue-next'
import { manageApi } from '@/utils/api-next'
import type { FriendTrend, FriendTrendPoint } from '@/types/manage.types'
import { createLineDatasetStyle, createLineOptions, themeChartTextColor } from '@/utils/chart-theme'

// 注册 ChartJS 组件
ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend,
    Filler
)

const props = defineProps<{
    userId: string | null
}>()

// 状态
const trendData = ref<FriendTrend | null>(null)
const isLoading = ref(false)

// 加载趋势数据
const loadTrendData = async () => {
    if (!props.userId) {
        trendData.value = null
        return
    }

    isLoading.value = true
    try {
        const res = await manageApi.getFriendTrend(props.userId, 7)
        if (res.success && res.data) {
            trendData.value = res.data
        } else {
            trendData.value = null
        }
    } catch (error) {
        console.error('加载好友趋势数据失败:', error)
        trendData.value = null
    } finally {
        isLoading.value = false
    }
}

// 监听 userId 变化
watch(() => props.userId, loadTrendData, { immediate: true })

// 格式化日期标签
const formatDateLabel = (dateStr: string): string => {
    const date = new Date(dateStr)
    return `${date.getMonth() + 1}/${date.getDate()}`
}

// 图表数据
const chartData = computed(() => {
    if (!trendData.value || trendData.value.data.length === 0) {
        return null
    }

    const labels = trendData.value.data.map((point: FriendTrendPoint) =>
        formatDateLabel(point.date)
    )

    return {
        labels,
        datasets: [
            {
                label: '聊天次数',
                ...createLineDatasetStyle('blue'),
                data: trendData.value.data.map((p: FriendTrendPoint) => p.chat_count),
                yAxisID: 'y'
            },
            {
                label: '调用次数',
                ...createLineDatasetStyle('green'),
                data: trendData.value.data.map((p: FriendTrendPoint) => p.call_count),
                yAxisID: 'y1'
            }
        ]
    }
})

// 图表配置
const chartOptions: ChartOptions<'line'> = createLineOptions({
    scales: {
        x: {
            grid: {
                display: false
            }
        },
        y: {
            type: 'linear',
            display: true,
            position: 'left',
            title: {
                display: true,
                text: '聊天次数',
                color: themeChartTextColor
            },
            beginAtZero: true
        },
        y1: {
            type: 'linear',
            display: true,
            position: 'right',
            title: {
                display: true,
                text: '调用次数',
                color: themeChartTextColor
            },
            grid: {
                drawOnChartArea: false
            },
            beginAtZero: true
        }
    }
})
</script>

<template>
    <div class="friend-trend-chart">
        <!-- 标题栏 -->
        <div class="flex items-center justify-between mb-3">
            <div class="flex items-center gap-2">
                <TrendingUp class="w-4 h-4 text-blue-500" />
                <span class="text-sm font-semibold text-gray-700">互动趋势</span>
            </div>
            <div v-if="trendData" class="text-xs text-gray-500 flex items-center gap-3">
                <span class="flex items-center gap-1">
                    <MessageSquare class="w-3 h-3" />
                    总聊天: {{ trendData.total_chat }}
                </span>
                <span class="flex items-center gap-1">
                    <Zap class="w-3 h-3" />
                    总调用: {{ trendData.total_call }}
                </span>
            </div>
        </div>

        <!-- 图表区域 -->
        <div class="h-48 relative">
            <!-- 加载状态 -->
            <div v-if="isLoading" class="absolute inset-0 flex items-center justify-center">
                <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            </div>

            <!-- 图表 -->
            <Line
                v-else-if="chartData && chartData.datasets[0].data.length > 0"
                :data="chartData"
                :options="chartOptions"
            />

            <!-- 空状态 -->
            <div v-else class="flex flex-col items-center justify-center h-full text-gray-400">
                <TrendingUp class="w-10 h-10 mb-2 opacity-30" />
                <p class="text-sm">暂无趋势数据</p>
            </div>
        </div>
    </div>
</template>

<style scoped>
.friend-trend-chart {
    min-height: 200px;
}
</style>
