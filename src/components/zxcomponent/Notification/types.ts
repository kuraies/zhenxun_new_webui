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
    [key: string]: any // 扩展字段
}