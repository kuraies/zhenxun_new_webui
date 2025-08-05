// src/stores/websocket.js
import { defineStore } from 'pinia'
import { ref } from 'vue'
import { createWebSocket } from '@/utils/websocket/index.js'
import { getHost } from '@/utils/api/index.js'

export const useWebSocketStore = defineStore('websocket', () => {
    // 使用Map存储各命名空间的消息，保持灵活性和高性能
    const namespaceMap = ref(new Map())
    const socketManger = ref(createWebSocket({
        host: getHost(),
        path: '/zhenxun/socket'
    }))


    /**
     * 通用消息存储方法
     * @param {string} namespace - 命名空间标识
     * @param {any} message - 要存储的消息内容
     * @param {boolean} [append=false] - 是否追加模式（默认替换/设置）
     * @param {number} [maxSize] - 可选的最大存储数量（防止内存溢出）
     */
    const addMessage = (namespace, message, append = false, maxSize) => {
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
     * @param {string} namespace - 要获取的命名空间
     * @param {'raw'|'array'|'latest'} [mode='raw'] - 返回模式
     * @returns {any} 根据模式返回的消息内容
     */
    const getMessages = (namespace, mode = 'raw') => {
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
     * @param {string} namespace - 要清空的命名空间
     * @param {'keepArray'|'reset'} [mode='keepArray'] - 清空模式
     */
    const clearMessages = (namespace, mode = 'keepArray') => {
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
        clearMessages,
    }
})