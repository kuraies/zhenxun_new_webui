
// 定义类型：函数 + 静态方法
export type ZXConfettiFn = ((options?: ZXConfettiOptions) => void) & {
    atMouse: (options?: ZXConfettiOptions) => void
    atElement: (el: HTMLElement, options?: ZXConfettiOptions) => void
    success: () => void
    error: () => void
    fireworks: () => void
}

// 🎉 Confetti 参数类型
export interface ZXConfettiOptions {
    x?: number
    y?: number
    total?: number
    colors?: string[]
    emojiList?: string[]
    useEmoji?: boolean
    [key: string]: any // 允许扩展
}

// Confetti.vue 暴露的 API 类型
export interface ZXConfettiExposed {
    launch: (x: number, y: number, options: ZXConfettiOptions) => void
}