/**
 * Mock 模式 - WebSocket 模拟
 * 用定时器代替真实 WebSocket 连接，周期性向处理器推送假数据
 */

export interface MockWsHandle {
    stop: () => void
}

/**
 * 启动一个 mock 推送循环：立即标记连接成功，然后按 interval 推送 emitter 生成的数据
 */
export function startMockPush(
    onState: (open: boolean) => void,
    onMessage: (data: any) => void,
    emitter: () => any,
    interval: number,
): MockWsHandle {
    const timer = window.setInterval(() => {
        let data: any
        try {
            data = emitter()
        } catch (e) {
            console.error('[Mock] 生成推送数据失败:', e)
            return
        }
        if (data) onMessage(data)
    }, interval)

    // 状态同步到下一帧，模拟真实连接的建立过程
    window.setTimeout(() => onState(true), 0)

    return {
        stop: () => {
            clearInterval(timer)
            onState(false)
        },
    }
}
