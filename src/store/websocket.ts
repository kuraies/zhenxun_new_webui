import { defineStore } from 'pinia'
import { ref } from 'vue'
import { getWsBaseUrl } from '@/utils/api-next/client'
import type { NamespaceMessageMap } from '@/types/store.types'

/**
 * 简易 WebSocket 客户端（支持多命名空间）
 */
class MultiNamespaceWebSocket {
    private baseUrl: string
    private connections: Map<string, WebSocket> = new Map()

    constructor(baseUrl: string) {
        this.baseUrl = baseUrl
    }

    of(namespace: string) {
        if (!this.connections.has(namespace)) {
            const ws = new WebSocket(`${this.baseUrl}/${namespace}`)
            this.connections.set(namespace, ws)
        }
        return this.connections.get(namespace)!
    }

    disconnect(namespace: string) {
        const ws = this.connections.get(namespace)
        if (ws) {
            ws.close()
            this.connections.delete(namespace)
        }
    }

    disconnectAll() {
        this.connections.forEach((ws) => ws.close())
        this.connections.clear()
    }
}

export const useWebSocketStore = defineStore('websocket', () => {
    // 使用 Map 存储各命名空间的消息，保持灵活性和高性能
    const namespaceMap = ref<NamespaceMessageMap>(new Map())
    const wsUrl = getWsBaseUrl()
    const socketManger = ref(new MultiNamespaceWebSocket(wsUrl))

    /**
     * 通用消息存储方法
     */
    const addMessage = (namespace: string, message: unknown, append = false, maxSize?: number) => {
        if (!namespaceMap.value.has(namespace)) {
            // 新命名空间初始化为数组（无论后续是追加还是设置都兼容）
            namespaceMap.value.set(namespace, [])
        }

        const current = namespaceMap.value.get(namespace)

        if (append) {
            // 追加模式
            if (!Array.isArray(current)) {
                // 如果当前不是数组，转换为数组
                namespaceMap.value.set(namespace, [current, message])
            } else {
                // 正常追加到数组
                current.push(message)
                // 应用大小限制
                if (maxSize && current.length > maxSize) {
                    current.shift() // 移除最旧的消息
                }
            }
        } else {
            // 设置/替换模式
            if (Array.isArray(message)) {
                // 如果传入的是数组，直接替换
                namespaceMap.value.set(namespace, [...message])
            } else {
                // 单个消息根据目标类型处理
                if (Array.isArray(current)) {
                    // 目标是数组则替换为单元素数组
                    namespaceMap.value.set(namespace, [message])
                } else {
                    // 否则直接替换值
                    namespaceMap.value.set(namespace, message)
                }
            }
        }
    }

    /**
     * 获取命名空间消息
     */
    const getMessages = (namespace: string, mode: 'raw' | 'array' | 'latest' = 'raw') => {
        if (!namespaceMap.value.has(namespace)) {
            return mode === 'array' ? [] : null
        }

        const value = namespaceMap.value.get(namespace)

        switch (mode) {
            case 'array':
                return Array.isArray(value) ? value : [value]
            case 'latest':
                return Array.isArray(value) ? value[value.length - 1] : value
            default:
                return value[0]
        }
    }

    /**
     * 清空命名空间消息
     */
    const clearMessages = (namespace: string, mode: 'keepArray' | 'reset' = 'keepArray') => {
        if (mode === 'keepArray' && Array.isArray(namespaceMap.value.get(namespace))) {
            namespaceMap.value.set(namespace, [])
        } else {
            namespaceMap.value.delete(namespace)
        }
    }

    return {
        namespaceMap,
        socketManger,
        addMessage,
        getMessages,
        clearMessages
    }
})
