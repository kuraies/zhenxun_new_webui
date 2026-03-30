/**
 * WebUI Next API - 日志 WebSocket
 */

import type { LogEntry } from '@/types/api-next.types'
import { getWsBaseUrl } from './client'

let ws: WebSocket | null = null
let reconnectTimer: number | null = null
const RECONNECT_DELAY = 3000 // 3 秒重连

export type LogMessageHandler = (log: LogEntry) => void
export type StateChangeHandler = (isOpen: boolean) => void

let messageHandlers: Set<LogMessageHandler> = new Set()
let stateChangeHandlers: Set<StateChangeHandler> = new Set()

/**
 * 连接日志 WebSocket
 */
export function connectLogsWebSocket(): void {
    if (ws?.readyState === WebSocket.CONNECTING || ws?.readyState === WebSocket.OPEN) {
        return
    }

    try {
        const url = `${getWsBaseUrl()}/logs`
        ws = new WebSocket(url)

        ws.onopen = () => {
            console.log('日志 WebSocket 连接成功')
            stateChangeHandlers.forEach(handler => handler(true))
        }

        ws.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data)
                // 跳过心跳消息
                if (data.type === 'heartbeat') {
                    return
                }
                const logEntry: LogEntry = data
                messageHandlers.forEach(handler => handler(logEntry))
            } catch (e) {
                console.error('解析日志消息失败:', e)
            }
        }

        ws.onerror = (error) => {
            console.error('日志 WebSocket 错误:', error)
        }

        ws.onclose = () => {
            console.log('日志 WebSocket 连接关闭，尝试重连...')
            stateChangeHandlers.forEach(handler => handler(false))
            // 自动重连
            if (reconnectTimer) {
                clearTimeout(reconnectTimer)
            }
            reconnectTimer = window.setTimeout(() => {
                connectLogsWebSocket()
            }, RECONNECT_DELAY)
        }
    } catch (error) {
        console.error('创建日志 WebSocket 连接失败:', error)
    }
}

/**
 * 断开日志 WebSocket 连接
 */
export function disconnectLogsWebSocket(): void {
    if (reconnectTimer) {
        clearTimeout(reconnectTimer)
        reconnectTimer = null
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
export function onLogMessage(handler: LogMessageHandler): () => void {
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
export function isLogsConnected(): boolean {
    return ws?.readyState === WebSocket.OPEN
}
