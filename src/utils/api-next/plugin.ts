/**
 * WebUI Next API - 插件管理接口
 */

import { api } from './client'
import type {
    PluginListRequest,
    PluginListResult,
    PluginToggleRequest,
    PluginConfigResult,
    APIResponse,
} from '@/types/api-next.types'

export const pluginApi = {
    /**
     * 获取插件列表
     */
    getPluginList(request: PluginListRequest): Promise<APIResponse<PluginListResult>> {
        return api.post<PluginListResult>('/plugin/list', request)
    },

    /**
     * 切换插件状态
     */
    togglePlugin(request: PluginToggleRequest): Promise<APIResponse<boolean>> {
        return api.post<boolean>('/plugin/toggle', request)
    },

    /**
     * 切换插件状态（便捷方法）
     */
    togglePluginStatus(module: string, enable: boolean): Promise<APIResponse<boolean>> {
        return api.post<boolean>('/plugin/toggle', { module, enable })
    },

    /**
     * 获取插件配置
     */
    getPluginConfig(module: string): Promise<APIResponse<PluginConfigResult>> {
        return api.get<PluginConfigResult>(`/plugin/config/${encodeURIComponent(module)}`)
    },

    /**
     * 获取插件详情
     */
    getPluginDetail(module: string): Promise<APIResponse<Record<string, any>>> {
        return api.get(`/plugin/detail/${encodeURIComponent(module)}`)
    },

    /**
     * 保存插件配置
     */
    savePluginConfig(module: string, configs: Record<string, string>): Promise<APIResponse<boolean>> {
        return api.post<boolean>('/config/plugin/batch', { module, configs })
    },
}
