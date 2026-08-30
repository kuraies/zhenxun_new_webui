/**
 * WebUI Next API - 日志 WebSocket
 */

import type { LogEntry } from '@/types/api-next.types'
import { getWsBaseUrl } from './client'
import { startMockPush, type MockWsHandle } from '@/mocks/ws'
import { MOCK_MODE } from 'virtual:mock-mode'

let ws: WebSocket | null = null
let reconnectTimer: number | null = null
let mockHandle: MockWsHandle | null = null
let mockSeq = 0
const RECONNECT_DELAY = 3000 // 3 秒重连

export type LogMessageHandler = (log: LogEntry) => void
export type StateChangeHandler = (isOpen: boolean) => void

let messageHandlers: Set<LogMessageHandler> = new Set()
let stateChangeHandlers: Set<StateChangeHandler> = new Set()

// ==================== Mock 数据生成 ====================
const MOCK_LOG_LEVELS = ['INFO', 'INFO', 'INFO', 'DEBUG', 'WARNING', 'ERROR'] as const
const MOCK_LOG_MODULES = ['plugin', 'database', 'scheduler', 'websocket', 'api', 'core']
const MOCK_LOG_MESSAGES = [
    '插件 chat_ai 处理消息完成，耗时 128ms',
    '数据库查询 chat_history 返回 42 条记录',
    '定时任务 epic_free_game 触发',
    '收到群消息: 700000000',
    '好感度更新: 10000000 +5',
    '缓存命中: plugin_config:chat_ai',
    '重连协议端成功',
]

function emitMockLog(): LogEntry {
    const level = MOCK_LOG_LEVELS[Math.floor(Math.random() * MOCK_LOG_LEVELS.length)]
    return {
        seq: ++mockSeq,
        timestamp: new Date().toISOString(),
        level,
        module: MOCK_LOG_MODULES[Math.floor(Math.random() * MOCK_LOG_MODULES.length)],
        message: MOCK_LOG_MESSAGES[Math.floor(Math.random() * MOCK_LOG_MESSAGES.length)],
    }
}

/**
 * 连接日志 WebSocket
 */
export function connectLogsWebSocket(): void {
    // Mock 模式:定时推送假日志，不建立真实连接
    if (MOCK_MODE) {
        if (mockHandle) return
        mockHandle = startMockPush(
            open => stateChangeHandlers.forEach(handler => handler(open)),
            log => messageHandlers.forEach(handler => handler(log)),
            emitMockLog,
            1800,
        )
        return
    }

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
