import { ref, onUnmounted, onMounted } from 'vue'

/**
 * 页面可见性感知的轮询 Hook
 * 当页面在后台时自动暂停轮询，返回前台时恢复
 *
 * @param callback 轮询回调函数
 * @param interval 轮询间隔（毫秒）
 * @param options 配置选项
 */
export function usePolling(
    callback: () => void | Promise<void>,
    interval: number,
    options: {
        /** 是否立即执行一次回调 */
        immediate?: boolean
        /** 是否在组件挂载时自动开始 */
        autoStart?: boolean
    } = {}
) {
    const { immediate = false, autoStart = true } = options

    const isActive = ref(false)
    const isPageVisible = ref(true)
    let timer: ReturnType<typeof setInterval> | null = null

    // 检测页面可见性
    const handleVisibilityChange = () => {
        isPageVisible.value = !document.hidden

        if (isPageVisible.value && isActive.value) {
            // 页面变为可见，恢复轮询
            startTimer()
        } else {
            // 页面变为不可见，暂停轮询
            stopTimer()
        }
    }

    // 启动定时器
    const startTimer = () => {
        if (timer) {
            clearInterval(timer)
        }
        timer = setInterval(async () => {
            try {
                await callback()
            } catch (error) {
                console.error('轮询执行失败:', error)
            }
        }, interval)
    }

    // 停止定时器
    const stopTimer = () => {
        if (timer) {
            clearInterval(timer)
            timer = null
        }
    }

    // 开始轮询
    const start = async () => {
        if (isActive.value) return

        isActive.value = true

        // 立即执行一次
        if (immediate) {
            try {
                await callback()
            } catch (error) {
                console.error('轮询初始执行失败:', error)
            }
        }

        // 如果页面可见，启动定时器
        if (isPageVisible.value) {
            startTimer()
        }
    }

    // 停止轮询
    const stop = () => {
        isActive.value = false
        stopTimer()
    }

    // 切换轮询状态
    const toggle = () => {
        if (isActive.value) {
            stop()
        } else {
            start()
        }
    }

    // 组件挂载时
    onMounted(() => {
        // 监听页面可见性变化
        document.addEventListener('visibilitychange', handleVisibilityChange)

        // 自动开始
        if (autoStart) {
            start()
        }
    })

    // 组件卸载时清理
    onUnmounted(() => {
        document.removeEventListener('visibilitychange', handleVisibilityChange)
        stop()
    })

    return {
        /** 是否正在轮询 */
        isActive,
        /** 页面是否可见 */
        isPageVisible,
        /** 开始轮询 */
        start,
        /** 停止轮询 */
        stop,
        /** 切换轮询状态 */
        toggle
    }
}

/**
 * 简单的轮询函数（不需要 Vue 组件上下文）
 */
export function createPolling(
    callback: () => void | Promise<void>,
    interval: number
) {
    let timer: ReturnType<typeof setInterval> | null = null
    let isActive = false

    const handleVisibilityChange = () => {
        if (document.hidden) {
            // 页面隐藏，暂停轮询
            if (timer) {
                clearInterval(timer)
                timer = null
            }
        } else {
            // 页面显示，恢复轮询
            if (isActive) {
                timer = setInterval(async () => {
                    try {
                        await callback()
                    } catch (error) {
                        console.error('轮询执行失败:', error)
                    }
                }, interval)
            }
        }
    }

    const start = () => {
        if (isActive) return
        isActive = true

        document.addEventListener('visibilitychange', handleVisibilityChange)

        timer = setInterval(async () => {
            try {
                await callback()
            } catch (error) {
                console.error('轮询执行失败:', error)
            }
        }, interval)
    }

    const stop = () => {
        isActive = false
        if (timer) {
            clearInterval(timer)
            timer = null
        }
        document.removeEventListener('visibilitychange', handleVisibilityChange)
    }

    return { start, stop, isActive: () => isActive }
}