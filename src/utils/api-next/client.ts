/**
 * WebUI Next API 统一客户端
 * 使用新的后端接口 (/zhenxun/api/v1)
 */

import axios from 'axios'
import { ZXNotification } from '@/components'
import { auth } from '../auth'
import { navigateTo } from '@/utils/navigation'
import type { APIResponse } from '@/types/api-next.types'

const API_V1_BASE = '/zhenxun/api/v1'

export const getPort = () => localStorage.getItem('port') || window.location.port || '8080'

export const setPort = (port: string) => localStorage.setItem('port', port)

export const getBaseUrl = () => {
    const port = getPort()
    const host = localStorage.getItem('url') || `${window.location.protocol}//${window.location.hostname}`
    return host.startsWith('http://') || host.startsWith('https://')
        ? `${host}:${port}`
        : `${window.location.protocol}//${host}:${port}`
}

export const setBaseApiUrl = (url: string) => localStorage.setItem('url', url)

export const apiClient = axios.create({
    baseURL: getBaseUrl() + API_V1_BASE,
    timeout: 100000,
})

export const updateApiBaseUrl = () => {
    apiClient.defaults.baseURL = getBaseUrl() + API_V1_BASE
}

apiClient.interceptors.request.use(config => {
    const token = auth.getAuthToken()
    if (token) {
        config.headers['Authorization'] = token
    }
    return config
})

apiClient.interceptors.response.use(
    response => response.data,
    async error => {
        if (error.config?.skipInterceptor) {
            return Promise.reject(error)
        }

        const showNotification = (title: string, message: string, type: string) => {
            ZXNotification({ title, message, type, position: 'top-right' as const })
        }

        if (error.code === 'ECONNABORTED') {
            showNotification("哇啊啊啊", "小真寻被超时了இ௰இ", '😭')
        } else if (error.response?.status === 401) {
            showNotification("状态失效", "验证状态失效啦~返回登录 (っ °Д °;) っ", '🥲')
            auth.setAuthState(false)
            auth.deleteAuthToken()
            await navigateTo({ name: 'Login' })
        } else if (error.response?.status === 400) {
            const errorMsg = error.response?.data?.message || error.response?.data?.info || '请求失败'
            showNotification("请求错误", errorMsg, '😟')
        } else if (error.response?.status >= 400 && error.response?.status < 500) {
            showNotification("对不起", "服务器被小真寻吃掉惹 (っ °Д °;) っ", '😭')
        } else if (error.response?.status >= 500) {
            showNotification("哎呀", "服务器好像被小真寻玩坏惹 (*/ω＼*)", '😋')
        }

        return Promise.reject(error)
    }
)

export const api = {
    get<T>(url: string, params?: Record<string, any>, options?: Record<string, any>): Promise<APIResponse<T>> {
        return apiClient.get(url, { params, ...options })
    },

    post<T>(url: string, data?: any, options?: Record<string, any>): Promise<APIResponse<T>> {
        return apiClient.post(url, data, options)
    },

    put<T>(url: string, data?: any, options?: Record<string, any>): Promise<APIResponse<T>> {
        return apiClient.put(url, data, options)
    },

    delete<T>(url: string, params?: Record<string, any>, options?: Record<string, any>): Promise<APIResponse<T>> {
        return apiClient.delete(url, { params, ...options })
    },
}

export const getWsBaseUrl = () => {
    const port = getPort()
    let host = localStorage.getItem('url') || `${window.location.hostname}`
    host = host.replace(/^https?:\/\//, '')
    const protocol = localStorage.getItem('url')?.startsWith('https://') || window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    return `${protocol}//${host}:${port}/zhenxun/ws/v1`
}

export default api
