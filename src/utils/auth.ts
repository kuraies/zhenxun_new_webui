/**
 * 认证工具函数
 */

const AUTH_KEY = 'isAuthenticated'
const TOKEN_KEY = 'token'

export const auth = {
    setAuthState(state: boolean) {
        sessionStorage.setItem(AUTH_KEY, String(state))
    },

    getAuthState(): boolean {
        return sessionStorage.getItem(AUTH_KEY) === 'true'
    },

    setAuthToken(type: string, token: string) {
        const formattedToken = token.startsWith('Bearer ') || token.startsWith('bearer ')
            ? token
            : `${type.charAt(0).toUpperCase() + type.slice(1)} ${token}`
        sessionStorage.setItem(TOKEN_KEY, formattedToken)
    },

    getAuthToken(): string | null {
        return sessionStorage.getItem(TOKEN_KEY)
    },

    deleteAuthToken() {
        sessionStorage.removeItem(TOKEN_KEY)
    },

    logout() {
        this.deleteAuthToken()
        this.setAuthState(false)
    }
}