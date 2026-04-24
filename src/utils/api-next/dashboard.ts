/**
 * WebUI Next API - 仪表盘接口
 */

import { api } from "./client";
import { mainApi } from "./main";
import type {
    APIResponse,
    DashboardResult,
    DetailedStatistics,
} from "@/types/api-next.types";

export const dashboardApi = {
    getDashboard(): Promise<APIResponse<DashboardResult>> {
        return api.get<DashboardResult>("/dashboard");
    },

    getDetailedStatistics(): Promise<APIResponse<DetailedStatistics>> {
        return api.get<DetailedStatistics>("/dashboard/statistics");
    },

    getChatAndCallMonth(bot_id?: string): Promise<APIResponse<any>> {
        return mainApi.getChatStatistics(bot_id);
    },
    getCommits(option: {}): Promise<APIResponse<any>> {
        return api.get("/dashboard/commits", option);
    },
};
