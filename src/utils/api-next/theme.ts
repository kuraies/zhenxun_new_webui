/**
 * WebUI Next API - 主题配置（管理员全局，多端同步）
 */

import { api } from "./client";
import type { APIResponse } from "@/types/api-next.types";

export interface ThemeConfig {
    /** custom = 自定义颜色主题；preset = 内置预设 */
    source: "custom" | "preset";
    preset: string;
    primary: string;
    /** light | dark | system（跟随系统） */
    mode: "light" | "dark" | "system";
}

export const themeApi = {
    getTheme(): Promise<APIResponse<ThemeConfig>> {
        return api.get("/theme");
    },

    saveTheme(config: ThemeConfig): Promise<APIResponse<ThemeConfig>> {
        return api.put("/theme", config);
    },
};
