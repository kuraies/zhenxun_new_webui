import { ref, type Ref, nextTick, watch, onUnmounted } from 'vue'
import gsap from 'gsap'

export interface ListAnimationOptions {
    /** 进入动画持续时间（毫秒） */
    enterDuration?: number
    /** 离开动画持续时间（毫秒） */
    leaveDuration?: number
    /** 交错延迟（毫秒） */
    stagger?: number
    /** 进入动画 Y 偏移 */
    enterY?: number
    /** 离开动画缩放 */
    leaveScale?: number
    /** 缓动函数 */
    ease?: string
}

const defaultOptions: ListAnimationOptions = {
    enterDuration: 300,
    leaveDuration: 200,
    stagger: 40,
    enterY: 16,
    leaveScale: 0.95,
    ease: 'power2.out'
}

/**
 * 列表动画 Hook
 * 用于处理列表项的进入、离开、筛选动画
 */
export function useListAnimation(options: ListAnimationOptions = {}) {
    const mergedOptions = { ...defaultOptions, ...options }
    const isAnimating = ref(false)
    let animationTl: gsap.core.Timeline | null = null

    /**
     * 播放列表项进入动画
     * @param elements 目标元素列表
     * @param onComplete 完成回调
     */
    const playEnterAnimation = (
        elements: Element[] | NodeListOf<Element> | HTMLElement[],
        onComplete?: () => void
    ): void => {
        if (!elements || elements.length === 0) {
            onComplete?.()
            return
        }

        isAnimating.value = true

        // 设置初始状态
        gsap.set(elements, {
            opacity: 0,
            y: mergedOptions.enterY
        })

        // 播放动画
        gsap.to(elements, {
            opacity: 1,
            y: 0,
            duration: (mergedOptions.enterDuration || 300) / 1000,
            ease: mergedOptions.ease || 'power2.out',
            stagger: (mergedOptions.stagger || 40) / 1000,
            onComplete: () => {
                isAnimating.value = false
                onComplete?.()
            }
        })
    }

    /**
     * 播放列表项离开动画
     * @param elements 目标元素列表
     * @param onComplete 完成回调
     */
    const playLeaveAnimation = (
        elements: Element[] | NodeListOf<Element> | HTMLElement[],
        onComplete?: () => void
    ): Promise<void> => {
        return new Promise((resolve) => {
            if (!elements || elements.length === 0) {
                onComplete?.()
                resolve()
                return
            }

            isAnimating.value = true

            gsap.to(elements, {
                opacity: 0,
                scale: mergedOptions.leaveScale || 0.95,
                duration: (mergedOptions.leaveDuration || 200) / 1000,
                ease: 'power2.in',
                stagger: (mergedOptions.stagger || 40) / 1000 / 2,
                onComplete: () => {
                    isAnimating.value = false
                    onComplete?.()
                    resolve()
                }
            })
        })
    }

    /**
     * 播放列表项进入动画（带延迟，用于页面加载）
     * @param containerRef 容器 ref
     * @param selector 子元素选择器
     * @param delay 延迟时间（毫秒）
     */
    const playEnterAnimationWithDelay = async (
        containerRef: Ref<HTMLElement | null>,
        selector: string = '.list-item',
        delay: number = 100
    ): Promise<void> => {
        if (!containerRef.value) return

        await new Promise(resolve => setTimeout(resolve, delay))

        const items = containerRef.value.querySelectorAll(selector)
        playEnterAnimation(items)
    }

    /**
     * 停止当前动画
     */
    const stopAnimation = () => {
        if (animationTl) {
            animationTl.kill()
            animationTl = null
        }
        gsap.killTweensOf('*')
        isAnimating.value = false
    }

    onUnmounted(() => {
        stopAnimation()
    })

    return {
        /** 播放进入动画 */
        playEnterAnimation,
        /** 播放离开动画 */
        playLeaveAnimation,
        /** 播放进入动画（带延迟） */
        playEnterAnimationWithDelay,
        /** 停止动画 */
        stopAnimation,
        /** 是否正在动画中 */
        isAnimating
    }
}

/**
 * 卡片交互动画 Hook
 * 用于处理卡片的悬停、点击、选中动画
 */
export function useCardInteraction() {
    /**
     * 播放点击反馈动画
     * @param element 目标元素
     */
    const playClickFeedback = (element: HTMLElement): void => {
        gsap.timeline()
            .to(element, {
                scale: 0.98,
                duration: 0.08,
                ease: 'power2.in'
            })
            .to(element, {
                scale: 1,
                duration: 0.15,
                ease: 'back.out(1.5)'
            })
    }

    /**
     * 播放选中动画
     * @param element 目标元素
     */
    const playSelectAnimation = (element: HTMLElement): void => {
        gsap.to(element, {
            scale: 1.02,
            duration: 0.25,
            ease: 'power2.out'
        })
    }

    /**
     * 播放取消选中动画
     * @param element 目标元素
     */
    const playDeselectAnimation = (element: HTMLElement): void => {
        gsap.to(element, {
            scale: 1,
            duration: 0.25,
            ease: 'power2.out'
        })
    }

    /**
     * 播放悬停进入动画
     * @param element 目标元素
     */
    const playHoverEnter = (element: HTMLElement): void => {
        gsap.to(element, {
            y: -4,
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
            duration: 0.2,
            ease: 'power2.out'
        })
    }

    /**
     * 播放悬停离开动画
     * @param element 目标元素
     */
    const playHoverLeave = (element: HTMLElement): void => {
        gsap.to(element, {
            y: 0,
            boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
            duration: 0.2,
            ease: 'power2.out'
        })
    }

    return {
        /** 点击反馈动画 */
        playClickFeedback,
        /** 选中动画 */
        playSelectAnimation,
        /** 取消选中动画 */
        playDeselectAnimation,
        /** 悬停进入动画 */
        playHoverEnter,
        /** 悬停离开动画 */
        playHoverLeave
    }
}

/**
 * 监听数据变化并自动播放动画
 * @param listRef 列表数据的 ref
 * @param containerRef 容器 ref
 * @param selector 子元素选择器
 */
export function useListAnimationWatch<T>(
    listRef: Ref<T[]>,
    containerRef: Ref<HTMLElement | null>,
    selector: string = '.list-item'
) {
    const { playEnterAnimation, playLeaveAnimation, isAnimating } = useListAnimation()

    // 记录之前的列表长度
    let prevLength = 0

    watch(
        () => listRef.value.length,
        async (newLength, oldLength) => {
            if (isAnimating.value) return

            // 等待 DOM 更新
            await nextTick()

            if (!containerRef.value) return

            const items = containerRef.value.querySelectorAll(selector)

            if (newLength > (oldLength || 0)) {
                // 列表项增加，播放进入动画
                playEnterAnimation(items)
            } else if (newLength < (oldLength || 0)) {
                // 列表项减少，重新播放进入动画（因为 Vue 已经更新了 DOM）
                playEnterAnimation(items)
            }

            prevLength = newLength
        },
        { flush: 'post' }
    )

    return {
        isAnimating
    }
}