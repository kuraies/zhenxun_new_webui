/**
 * WebUI Next API - 认证接口
 */

import { api } from './client'
import type { LoginRequest, LoginResponse, APIResponse } from '@/types/api-next.types'

export const authApi = {
    login(request: LoginRequest, options?: Record<string, any>): Promise<APIResponse<LoginResponse>> {
        return api.post<LoginResponse>('/auth/login', request, {
            headers: { 'Content-Type': 'application/json' },
            ...options
        })
    },

    verifyToken(token: string): Promise<APIResponse<{ valid: boolean; username?: string; error?: string }>> {
        return api.get(`/auth/verify?token=${encodeURIComponent(token)}`)
    },

    refreshToken(token: string): Promise<APIResponse<LoginResponse>> {
        return api.post<LoginResponse>(`/auth/refresh?token=${encodeURIComponent(token)}`)
    },
}
