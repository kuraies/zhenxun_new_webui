/**
 * 认证工具函数
 *
 * 登录态存 localStorage：同域下主站与独立调试客户端窗口天然共享，
 * 代价是关闭标签页不再自动登出（token 过期后重新登录即可）。
 */

const AUTH_KEY = 'isAuthenticated'
const TOKEN_KEY = 'token'

// 一次性迁移：老会话的 token 还留在 sessionStorage 里，搬过来
if (!localStorage.getItem(TOKEN_KEY)) {
    const legacy = sessionStorage.getItem(TOKEN_KEY)
    if (legacy) {
        localStorage.setItem(TOKEN_KEY, legacy)
        sessionStorage.removeItem(TOKEN_KEY)
    }
}

export const auth = {
    setAuthState(state: boolean) {
        localStorage.setItem(AUTH_KEY, String(state))
    },

    getAuthState(): boolean {
        return localStorage.getItem(AUTH_KEY) === 'true'
    },

    setAuthToken(type: string, token: string) {
        const formattedToken = token.startsWith('Bearer ') || token.startsWith('bearer ')
            ? token
            : `${type.charAt(0).toUpperCase() + type.slice(1)} ${token}`
        localStorage.setItem(TOKEN_KEY, formattedToken)
    },

    getAuthToken(): string | null {
        return localStorage.getItem(TOKEN_KEY)
    },

    deleteAuthToken() {
        localStorage.removeItem(TOKEN_KEY)
    },

    logout() {
        this.deleteAuthToken()
        this.setAuthState(false)
    }
}
