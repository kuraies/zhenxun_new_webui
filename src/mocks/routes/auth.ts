/**
 * Mock 路由 - 认证
 */
import type { MockRoute } from '../types'

export const authRoutes: MockRoute[] = [
    {
        method: 'post',
        url: '/auth/login',
        response: ({ body }) => {
            // 密码传 wrong 时模拟登录失败，方便调试失败分支
            if (body?.password === 'wrong') {
                return { success: false, message: '用户名或密码错误 (mock)', code: 400, data: null }
            }
            return {
                access_token: 'mock-access-token.' + Math.random().toString(36).slice(2),
                token_type: 'Bearer',
                expires_in: 86400,
            }
        },
    },
    {
        method: 'get',
        url: '/auth/verify',
        response: () => ({ valid: true, username: 'admin' }),
    },
    {
        method: 'post',
        url: '/auth/refresh',
        response: () => ({
            access_token: 'mock-refreshed-token.' + Math.random().toString(36).slice(2),
            token_type: 'Bearer',
            expires_in: 86400,
        }),
    },
]
