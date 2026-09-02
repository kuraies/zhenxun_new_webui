// 🔧 定义函数类型（带静态方法）
export type ZXNotificationFn = {
    (options: ZXNotificationOptions | string): void
    success: (options: ZXNotificationOptions | string) => void
    error: (options: ZXNotificationOptions | string) => void
    info: (options: ZXNotificationOptions | string) => void
    warning: (options: ZXNotificationOptions | string) => void
    setDefaultOptions: (opts: Partial<ZXNotificationOptions>) => void
    resetDefaultOptions: () => void
}

// 🔧 通知配置类型
export interface ZXNotificationOptions {
    message?: string
    duration?: number
    position?: 'top-center' | 'top-left' | 'top-right' | 'bottom-center' | 'bottom-left' | 'bottom-right'
    type?: 'success' | 'error' | 'info' | 'warning' | string
    customClass?: string
    confetti?: boolean
    /** 头像模式：左侧显示头像（如 bot 上下线通知），消息行按 type 附带上/下线图标 */
    avatar?: string
    /** 头像模式：标题下方的副标题（如 bot 的 self_id） */
    subtitle?: string
    [key: string]: any // 扩展字段
}