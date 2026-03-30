/**
 * WebUI Next API - 聊天 WebSocket
 */

import type { ChatMessage } from '@/types/api-next.types'
import { getWsBaseUrl } from './client'

let ws: WebSocket | null = null
let reconnectTimer: number | null = null
const RECONNECT_DELAY = 3000 // 3 秒重连

export type ChatMessageHandler = (message: ChatMessage) => void
export type StateChangeHandler = (isOpen: boolean) => void

let messageHandlers: Set<ChatMessageHandler> = new Set()
let stateChangeHandlers: Set<StateChangeHandler> = new Set()

/**
 * 连接聊天 WebSocket
 */
export function connectChatWebSocket(): void {
    if (ws?.readyState === WebSocket.CONNECTING || ws?.readyState === WebSocket.OPEN) {
        return
    }

    try {
        const url = `${getWsBaseUrl()}/chat`
        ws = new WebSocket(url)

        ws.onopen = () => {
            console.log('聊天 WebSocket 连接成功')
            stateChangeHandlers.forEach(handler => handler(true))
        }

        ws.onmessage = (event) => {
            try {
                const message: ChatMessage = JSON.parse(event.data)
                messageHandlers.forEach(handler => handler(message))
            } catch (e) {
                console.error('解析聊天消息失败:', e)
            }
        }

        ws.onerror = (error) => {
            console.error('聊天 WebSocket 错误:', error)
        }

        ws.onclose = () => {
            console.log('聊天 WebSocket 连接关闭，尝试重连...')
            stateChangeHandlers.forEach(handler => handler(false))
            // 自动重连
            if (reconnectTimer) {
                clearTimeout(reconnectTimer)
            }
            reconnectTimer = window.setTimeout(() => {
                connectChatWebSocket()
            }, RECONNECT_DELAY)
        }
    } catch (error) {
        console.error('创建聊天 WebSocket 连接失败:', error)
    }
}

/**
 * 断开聊天 WebSocket 连接
 */
export function disconnectChatWebSocket(): void {
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
export function onChatMessage(handler: ChatMessageHandler): () => void {
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
export function isChatConnected(): boolean {
    return ws?.readyState === WebSocket.OPEN
}

// ==================== 兼容旧 API 的导出 ====================

/**
 * 初始化 WebSocket（兼容旧 API）
 */
export function initWebSocket(): void {
    connectChatWebSocket()
}

/**
 * 添加消息回调（兼容旧 API）
 */
export function addMessageCallback(handler: ChatMessageHandler): void {
    messageHandlers.add(handler)
}

/**
 * 移除消息回调（兼容旧 API）
 */
export function removeMessageCallback(handler: ChatMessageHandler): void {
    messageHandlers.delete(handler)
}

/**
 * 发送消息（兼容旧 API 的多参数版本）
 * @param bot - Bot 信息对象
 * @param groupId - 群组 ID（可选）
 * @param userId - 好友 ID（可选）
 * @param message - 消息内容
 */
export function sendMessage(
    bot: { self_id: string; name?: string },
    groupId: string | null,
    userId: string | null,
    message: string
): Promise<void>;

/**
 * 发送消息（简单版本）
 * @param message - 消息内容
 */
export function sendMessage(message: string): Promise<void>;

export function sendMessage(
    botOrMessage: { self_id: string; name?: string } | string,
    groupId?: string | null,
    userId?: string | null,
    message?: string
): Promise<void> {
    return new Promise((resolve, reject) => {
        if (!ws || ws.readyState !== WebSocket.OPEN) {
            reject(new Error('WebSocket 未连接'))
            return
        }

        let payload: any
        if (typeof botOrMessage === 'string') {
            // 简单版本：只发送消息内容
            payload = { message: botOrMessage }
        } else {
            // 兼容旧 API 的多参数版本
            payload = {
                self_id: botOrMessage.self_id,
                group_id: groupId,
                user_id: userId,
                message: message
            }
        }

        try {
            ws.send(JSON.stringify(payload))
            resolve()
        } catch (error) {
            reject(error)
        }
    })
}

/**
 * 检查连接状态（兼容旧 API）
 */
export function isConnected(): boolean {
    return isChatConnected()
}
