import { defineStore } from 'pinia'
import { reactive, computed, watch } from 'vue'
import { mainApi } from '@/utils/api-next'
import { useWebSocketStore } from '@/store/websocket'
import { createPolling } from '@/composables/usePolling'
import type { SystemCount, SystemStatus as SystemStatusType } from '@/types/store.types'

export const useSystemStore = defineStore('system', () => {
    /**
     * 统计相关数据，包含历史总数与今日数据
     */
    const count = reactive<SystemCount>({
        chat_num: 0,
        chat_day: 0,
        call_num: 0,
        call_day: 0,
        friend_count: 0,
        group_count: 0,
        plugin_count: 0,
        database_size: 0
    })

    /**
     * 系统运行状态，表示当前资源使用率（通常为 0~100 的百分比数值）
     */
    const systemStatus = reactive<SystemStatusType>({
        cpu: 0,
        memory: 0,
        disk: 0
    })

    /**
     * 轮询控制器，用于管理统计数据轮询
     * 使用页面可见性感知的轮询，当页面在后台时自动暂停
     */
    let pollingController: ReturnType<typeof createPolling> | null = null

    /**
     * 引入 WebSocket 状态管理 Store，用于监听系统状态消息
     */
    const socketStore = useWebSocketStore()

    /**
     * 获取 WebSocket 中 system_status 类型的最新消息流（计算属性）
     * 使用 'latest' 模式获取数组中的最后一个元素（最新消息）
     */
    const messages = computed(() => socketStore.getMessages('system_status', 'latest'))

    /**
     * 监听来自 WebSocket 的系统状态更新，并同步到本地 systemStatus 对象
     * 支持立即触发（immediate: true），确保初始化时也能响应已有数据
     */
    watch(
        messages,
        (newVal) => {
            // 只有当 newVal 是包含有效数字字段的对象时才更新
            if (newVal && typeof newVal === 'object') {
                // 使用 Number() 转换并验证是否为有效数字
                // 同时检查是否在合理范围内 (0-100 的百分比)
                const cpu = Number(newVal.cpu)
                const memory = Number(newVal.memory)
                const disk = Number(newVal.disk)

                // 只在数据有效且在合理范围内 (0-100) 时才更新
                if (!isNaN(cpu) && isFinite(cpu) && cpu >= 0 && cpu <= 100) {
                    systemStatus.cpu = cpu
                }
                if (!isNaN(memory) && isFinite(memory) && memory >= 0 && memory <= 100) {
                    systemStatus.memory = memory
                }
                if (!isNaN(disk) && isFinite(disk) && disk >= 0 && disk <= 100) {
                    systemStatus.disk = disk
                }
            }
        },
        { immediate: true }
    )

    /**
     * 获取聊天统计数据的回调函数
     * 供轮询控制器调用
     */
    async function fetchPollingData() {
        try {
            const res = await mainApi.getChatStatistics()
            if (res?.success && res?.data) {
                // 只更新存在的字段，避免覆盖其他统计字段
                Object.assign(count, {
                    chat_num: res.data.chat_num ?? count.chat_num,
                    chat_day: res.data.chat_day ?? count.chat_day,
                    call_num: res.data.call_num ?? count.call_num,
                    call_day: res.data.call_day ?? count.call_day
                })
                // 可选：将统计数据缓存到本地，防止刷新丢失
                localStorage.setItem('chat_call_count', JSON.stringify(count))
            }
        } catch (err) {
            console.error('❌ 轮询获取统计失败:', err)
        }
    }

    /**
     * 从 localStorage 恢复之前缓存的统计数据（如页面刷新后重新初始化）
     */
    function restoreCount() {
        const cached = localStorage.getItem('chat_call_count')
        if (cached) {
            try {
                const parsed = JSON.parse(cached)
                Object.assign(count, parsed)
            } catch (e) {
                console.error('❌ 解析 chat_call_count 缓存失败:', e)
            }
        }
    }

    /**
     * 从 localStorage 恢复之前缓存系统状态数据
     */
    function restoreSystemStatus() {
        const cached = localStorage.getItem('system_status')
        if (cached) {
            try {
                const parsed = JSON.parse(cached)
                Object.assign(systemStatus, parsed)
            } catch (e) {
                console.error('❌ 解析 system_status 缓存失败:', e)
            }
        }
    }

    /**
     * 启动所有数据恢复和定时任务
     * 包括：恢复本地缓存数据、启动轮询定时器
     */
    function startPolling() {
        restoreCount()
        restoreSystemStatus()
        // 创建并启动页面可见性感知的轮询
        pollingController = createPolling(fetchPollingData, 5000)
        pollingController.start()
    }

    /**
     * 停止轮询任务，并将当前统计数据与系统状态保存至 localStorage
     * 通常在页面卸载 / 用户退出前调用，用于持久化当前状态
     */
    function stopPolling() {
        if (pollingController) {
            pollingController.stop()
            pollingController = null
        }
        // 将当前状态持久化到本地存储
        localStorage.setItem('chat_call_count', JSON.stringify(count))
        localStorage.setItem('system_status', JSON.stringify(systemStatus))
    }

    /**
     * 手动获取聊天统计数据
     */
    async function fetchChatStatistics() {
        try {
            const res = await mainApi.getChatStatistics()
            if (res?.success && res?.data) {
                Object.assign(count, {
                    chat_num: res.data.chat_num ?? count.chat_num,
                    chat_day: res.data.chat_day ?? count.chat_day,
                    call_num: res.data.call_num ?? count.call_num,
                    call_day: res.data.call_day ?? count.call_day
                })
                // 缓存到 localStorage
                localStorage.setItem('chat_call_count', JSON.stringify(count))
            }
        } catch (err) {
            console.error('❌ 获取聊天统计失败:', err)
        }
    }

    /**
     * 手动获取完整统计数据（包括好友数、群组数等）
     */
    async function fetchAllStatistics() {
        try {
            const res = await mainApi.getChatStatistics()
            if (res?.success && res?.data) {
                Object.assign(count, {
                    chat_num: res.data.chat_num ?? count.chat_num,
                    chat_day: res.data.chat_day ?? count.chat_day,
                    call_num: res.data.call_num ?? count.call_num,
                    call_day: res.data.call_day ?? count.call_day,
                    friend_count: res.data.friend_count ?? count.friend_count,
                    group_count: res.data.group_count ?? count.group_count,
                    plugin_count: res.data.plugin_count ?? count.plugin_count,
                    database_size: res.data.database_size ?? count.database_size
                })
                // 缓存到 localStorage
                localStorage.setItem('chat_call_count', JSON.stringify(count))
            }
        } catch (err) {
            console.error('❌ 获取完整统计失败:', err)
        }
    }

    return {
        // 状态数据
        count,
        systemStatus,

        // 控制方法
        startPolling,
        stopPolling,
        fetchChatStatistics,
        fetchAllStatistics
    }
})
