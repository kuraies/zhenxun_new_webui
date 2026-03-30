/**
 * WebUI Next API - 系统接口
 */

import { api } from './client'
import type {
    SystemStatus,
    SystemHealth,
    BotStatus,
    SystemInfo,
    NetworkStatus,
    APIResponse,
} from '@/types/api-next.types'

export const systemApi = {
    getStatus(): Promise<APIResponse<SystemStatus>> {
        return api.get<SystemStatus>('/system/status')
    },

    getHealth(): Promise<APIResponse<SystemHealth>> {
        return api.get<SystemHealth>('/system/health')
    },

    getBotStatus(): Promise<APIResponse<BotStatus>> {
        return api.get<BotStatus>('/system/bot-status')
    },

    checkNetwork(): Promise<APIResponse<NetworkStatus>> {
        return api.get<NetworkStatus>('/system/network')
    },

    ping(config?: { baseURL?: string }): Promise<APIResponse<any>> {
        return api.get('/system/ping', {}, config)
    },

    getSystemInfo(): Promise<APIResponse<SystemInfo>> {
        return api.get<SystemInfo>('/system/info')
    },

    restartBot(): Promise<APIResponse<boolean>> {
        return api.post('/system/restart')
    },
}
