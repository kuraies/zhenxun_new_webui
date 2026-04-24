/**
 * WebUI Next API - 主页接口
 */

import { api } from "./client";
import type { APIResponse, BotInfo, BotStatus } from "@/types/api-next.types";

export const mainApi = {
    /**
     * 获取 Bot 状态
     */
    getBotStatus(botId?: string): Promise<APIResponse<BotStatus>> {
        return api.get<BotStatus>("/main/bot-status", { bot_id: botId });
    },

    getBotList(): Promise<APIResponse<[BotInfo]>> {
        return api.get<[BotInfo]>("/main/bot-list");
    },

    /**
     * 获取聊天统计
     */
    getChatStatistics(
        botId?: string,
    ): Promise<APIResponse<Record<string, number>>> {
        return api.get("/main/chat-statistics", { bot_id: botId });
    },

    /**
     * 获取插件调用统计
     */
    getPluginStatistics(
        botId?: string,
    ): Promise<APIResponse<Record<string, number>>> {
        return api.get("/main/plugin-statistics", { bot_id: botId });
    },

    /**
     * 获取活跃群组
     */
    getActiveGroups(
        dateType?: string,
        botId?: string,
        startTime?: string,
        endTime?: string,
    ): Promise<
        APIResponse<
            Array<{
                group_id: string;
                name: string;
                chat_num: number;
                ava_img: string;
            }>
        >
    > {
        return api.get("/main/active-groups", {
            date_type: dateType,
            bot_id: botId,
            start_time: startTime,
            end_time: endTime,
        });
    },

    /**
     * 获取活跃群组（别名，兼容旧代码）
     */
    getActiveGroup(
        dateType?: string,
        botId?: string,
        startTime?: string,
        endTime?: string,
    ): Promise<
        APIResponse<
            Array<{
                group_id: string;
                name: string;
                chat_num: number;
                ava_img: string;
            }>
        >
    > {
        return this.getActiveGroups(dateType, botId, startTime, endTime);
    },

    /**
     * 获取热门插件
     */
    getHotPlugins(
        dateType?: string,
        botId?: string,
        startTime?: string,
        endTime?: string,
    ): Promise<
        APIResponse<Array<{ plugin_name: string; call_count: number }>>
    > {
        return api.get("/main/hot-plugins", {
            date_type: dateType,
            bot_id: botId,
            start_time: startTime,
            end_time: endTime,
        });
    },
};
