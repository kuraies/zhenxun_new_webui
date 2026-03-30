/**
 * WebUI Next API - 仪表盘接口
 */

import { api } from './client'
import { mainApi } from './main'
import type { DashboardResult, DetailedStatistics, APIResponse } from '@/types/api-next.types'

export const dashboardApi = {
    getDashboard(): Promise<APIResponse<DashboardResult>> {
        return api.get<DashboardResult>('/dashboard')
    },

    getDetailedStatistics(): Promise<APIResponse<DetailedStatistics>> {
        return api.get<DetailedStatistics>('/dashboard/statistics')
    },

    // 兼容旧代码
    getChatAndCallCount(bot_id?: string): Promise<APIResponse<any>> {
        return mainApi.getChatStatistics(bot_id)
    },

    getAllChatAndCallCount(bot_id?: string): Promise<APIResponse<any>> {
        return mainApi.getPluginStatistics(bot_id)
    },

    getChatAndCallMonth(bot_id?: string): Promise<APIResponse<any>> {
        return mainApi.getChatStatistics(bot_id)
    },
}
