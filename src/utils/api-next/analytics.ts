/**
 * WebUI Next API - 数据分析接口
 */

import { api } from './client'
import type {
    TrendData,
    DetailedStatisticsTimeRange,
    APIResponse,
    Granularity,
    FavorabilityRank,
    GoldRank,
} from '@/types/api-next.types'

export const analyticsApi = {
    /**
     * 获取趋势数据
     * @param params 请求参数
     * @param params.start_time 起始时间 (ISO 格式)
     * @param params.end_time 结束时间 (ISO 格式)
     * @param params.granularity 时间粒度 (hour/day/week/month)
     * @param params.bot_id Bot ID，可选
     */
    getTrendData(params: {
        start_time: string
        end_time: string
        granularity: Granularity
        bot_id?: string
    }): Promise<APIResponse<TrendData>> {
        return api.get<TrendData>('/analytics/trend', params)
    },

    /**
     * 获取详细统计数据（带时间范围）
     * @param params 请求参数
     * @param params.start_time 起始时间 (ISO 格式)
     * @param params.end_time 结束时间 (ISO 格式)
     * @param params.bot_id Bot ID，可选
     */
    getStatistics(params: {
        start_time: string
        end_time: string
        bot_id?: string
    }): Promise<APIResponse<DetailedStatisticsTimeRange>> {
        return api.get<DetailedStatisticsTimeRange>('/analytics/statistics', params)
    },

    /**
     * 获取好感度 top10
     * @param bot_id Bot ID，可选
     */
    getFavorabilityTop10(bot_id?: string): Promise<APIResponse<FavorabilityRank[]>> {
        return api.get('/analytics/favorability-top10', { bot_id })
    },

    /**
     * 获取金币 top10
     * @param bot_id Bot ID，可选
     */
    getGoldTop10(bot_id?: string): Promise<APIResponse<GoldRank[]>> {
        return api.get('/analytics/gold-top10', { bot_id })
    },
}
