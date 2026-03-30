/**
 * Bot API - 兼容旧代码
 * 使用 dashboardApi 封装
 */

import { dashboardApi } from './dashboard'

export const botApi = {
    get_chat_and_call_count: (bot_id?: string) => {
        return dashboardApi.getChatAndCallCount(bot_id)
    },
    get_all_chat_and_call_count: (bot_id?: string) => {
        return dashboardApi.getAllChatAndCallCount(bot_id)
    },
    get_chat_and_call_month: (bot_id?: string) => {
        return dashboardApi.getChatAndCallMonth(bot_id)
    },
}
