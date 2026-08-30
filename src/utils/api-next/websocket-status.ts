/**
 * WebUI Next API - 系统状态 WebSocket
 */

import { getWsBaseUrl } from './client'
import { startMockPush, type MockWsHandle } from '@/mocks/ws'
import { MOCK_MODE } from 'virtual:mock-mode'

let ws: WebSocket | null = null
let reconnectTimer: number | null = null
let mockHandle: MockWsHandle | null = null
const RECONNECT_DELAY = 3000 // 3 秒重连

export type StatusMessageHandler = (data: any) => void
export type StateChangeHandler = (isOpen: boolean) => void

let messageHandlers: Set<StatusMessageHandler> = new Set()
let stateChangeHandlers: Set<StateChangeHandler> = new Set()

/** Mock 模式的系统状态数据，在 CPU/内存/磁盘上做随机波动 */
function emitMockStatus() {
    return {
        cpu: 8 + Math.random() * 30,
        memory: 38 + Math.random() * 20,
        disk: 41 + Math.random() * 5,
        check_time: new Date().toISOString(),
    }
}

/**
 * 连接系统状态 WebSocket
 */
export function connectStatusWebSocket(): void {
    // Mock 模式:定时推送假系统状态，不建立真实连接
    if (MOCK_MODE) {
        if (mockHandle) return
        mockHandle = startMockPush(
            open => stateChangeHandlers.forEach(handler => handler(open)),
            data => messageHandlers.forEach(handler => handler(data)),
            emitMockStatus,
            2000,
        )
        return
    }

    if (ws?.readyState === WebSocket.CONNECTING || ws?.readyState === WebSocket.OPEN) {
        return
    }

    try {
        const url = `${getWsBaseUrl()}/status`
        ws = new WebSocket(url)

        ws.onopen = () => {
            console.log('系统状态 WebSocket 连接成功')
            stateChangeHandlers.forEach(handler => handler(true))
        }

        ws.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data)
                // 跳过心跳消息
                if (data.type === 'heartbeat') {
                    return
                }
                messageHandlers.forEach(handler => handler(data))
            } catch (e) {
                console.error('解析系统状态消息失败:', e)
            }
        }

        ws.onerror = (error) => {
            console.error('系统状态 WebSocket 错误:', error)
        }

        ws.onclose = () => {
            console.log('系统状态 WebSocket 连接关闭，尝试重连...')
            stateChangeHandlers.forEach(handler => handler(false))
            // 自动重连
            if (reconnectTimer) {
                clearTimeout(reconnectTimer)
            }
            reconnectTimer = window.setTimeout(() => {
                connectStatusWebSocket()
            }, RECONNECT_DELAY)
        }
    } catch (error) {
        console.error('创建系统状态 WebSocket 连接失败:', error)
    }
}

/**
 * 断开系统状态 WebSocket 连接
 */
export function disconnectStatusWebSocket(): void {
    if (reconnectTimer) {
        clearTimeout(reconnectTimer)
        reconnectTimer = null
    }

    if (mockHandle) {
        mockHandle.stop()
        mockHandle = null
    }

    if (ws) {
        ws.onclose = null // 阻止重连
        ws.close()
        ws = null
    }

    messageHandlers.clear()
    stateChangeHandlers.clear()
}

/**
 * 添加消息处理器
 */
export function onStatusMessage(handler: StatusMessageHandler): () => void {
    messageHandlers.add(handler)
    return () => messageHandlers.delete(handler)
}

/**
 * 添加状态变化处理器
 */
export function onConnectionStateChange(handler: StateChangeHandler): () => void {
    stateChangeHandlers.add(handler)
    return () => stateChangeHandlers.delete(handler)
}

/**
 * 获取连接状态
 */
export function isStatusConnected(): boolean {
    return ws?.readyState === WebSocket.OPEN
}
