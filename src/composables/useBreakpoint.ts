import { ref, computed, onMounted, onUnmounted } from 'vue'

/**
 * Tailwind 断点定义
 */
export const breakpoints = {
    sm: 640,
    md: 768,
    lg: 1024,
    xl: 1280,
    '2xl': 1536
} as const

export type Breakpoint = keyof typeof breakpoints

/**
 * 断点检测 Hook
 * 检测当前断点并在断点变化时触发回调
 *
 * @param onBreakpointChange 断点变化时的回调函数
 */
export function useBreakpoint(onBreakpointChange?: (from: Breakpoint, to: Breakpoint) => void) {
    const currentBreakpoint = ref<Breakpoint>('sm')
    const windowWidth = ref(0)

    /**
     * 根据窗口宽度获取断点
     */
    const getBreakpoint = (width: number): Breakpoint => {
        if (width >= breakpoints['2xl']) return '2xl'
        if (width >= breakpoints.xl) return 'xl'
        if (width >= breakpoints.lg) return 'lg'
        if (width >= breakpoints.md) return 'md'
        if (width >= breakpoints.sm) return 'sm'
        return 'sm' // 小于 sm 时也返回 sm
    }

    /**
     * 是否为移动端（小于 md）
     */
    const isMobile = computed(() => currentBreakpoint.value === 'sm')

    /**
     * 是否为平板（md 或 lg）
     */
    const isTablet = computed(() =>
        currentBreakpoint.value === 'md' || currentBreakpoint.value === 'lg'
    )

    /**
     * 是否为桌面端（xl 及以上）
     */
    const isDesktop = computed(() =>
        currentBreakpoint.value === 'xl' || currentBreakpoint.value === '2xl'
    )

    // 防抖定时器
    let debounceTimer: ReturnType<typeof setTimeout> | null = null

    /**
     * 处理窗口大小变化
     */
    const handleResize = () => {
        // 清除之前的定时器
        if (debounceTimer) {
            clearTimeout(debounceTimer)
        }

        // 防抖 150ms
        debounceTimer = setTimeout(() => {
            const newWidth = window.innerWidth
            const newBreakpoint = getBreakpoint(newWidth)

            windowWidth.value = newWidth

            // 仅在断点变化时触发回调
            if (newBreakpoint !== currentBreakpoint.value) {
                const oldBreakpoint = currentBreakpoint.value
                currentBreakpoint.value = newBreakpoint

                if (onBreakpointChange) {
                    onBreakpointChange(oldBreakpoint, newBreakpoint)
                }
            }
        }, 150)
    }

    onMounted(() => {
        // 初始化当前断点
        windowWidth.value = window.innerWidth
        currentBreakpoint.value = getBreakpoint(window.innerWidth)

        // 监听窗口大小变化
        window.addEventListener('resize', handleResize)
    })

    onUnmounted(() => {
        window.removeEventListener('resize', handleResize)
        if (debounceTimer) {
            clearTimeout(debounceTimer)
        }
    })

    return {
        /** 当前断点 */
        currentBreakpoint,
        /** 窗口宽度 */
        windowWidth,
        /** 是否为移动端 */
        isMobile,
        /** 是否为平板 */
        isTablet,
        /** 是否为桌面端 */
        isDesktop,
        /** 获取指定宽度的断点 */
        getBreakpoint
    }
}

/**
 * 比较两个断点的大小
 * @returns 正数表示 a > b，负数表示 a < b，0 表示相等
 */
export function compareBreakpoints(a: Breakpoint, b: Breakpoint): number {
    const order: Breakpoint[] = ['sm', 'md', 'lg', 'xl', '2xl']
    return order.indexOf(a) - order.indexOf(b)
}