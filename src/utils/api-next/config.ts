/**
 * WebUI Next API - 配置管理接口
 */

import { api } from './client'
import type {
    EnvFileContent,
    YamlConfigContent,
    ConfigSaveRequest,
    APIResponse,
} from '@/types/api-next.types'

export const configApi = {
    /**
     * 读取环境变量文件
     */
    getEnvFile(name: string): Promise<APIResponse<EnvFileContent>> {
        return api.get<EnvFileContent>('/config/env', { name })
    },

    /**
     * 保存环境变量文件
     */
    saveEnvFile(request: ConfigSaveRequest): Promise<APIResponse<boolean>> {
        return api.post<boolean>('/config/env', request)
    },

    /**
     * 读取 config.yaml 配置文件
     */
    getYamlFile(): Promise<APIResponse<YamlConfigContent>> {
        return api.get<YamlConfigContent>('/config/yaml')
    },

    /**
     * 保存 config.yaml 配置文件
     */
    saveYamlFile(content: string): Promise<APIResponse<boolean>> {
        return api.post<boolean>('/config/yaml', { content })
    },

    /**
     * 获取配置值
     */
    getConfigValue(module: string, key: string): Promise<APIResponse<string | null>> {
        return api.get<string | null>('/config/value', { module, key })
    },

    /**
     * 设置配置值
     */
    setConfigValue(module: string, key: string, value: string): Promise<APIResponse<boolean>> {
        return api.post<boolean>('/config/value', { module, key, value })
    },
}
