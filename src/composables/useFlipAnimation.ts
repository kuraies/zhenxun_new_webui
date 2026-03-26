import { ref, type Ref, nextTick } from 'vue'
import gsap from 'gsap'

// 动态导入 Flip 插件并注册
let FlipPlugin: any = null
import('gsap/Flip').then(module => {
    FlipPlugin = module.Flip
    gsap.registerPlugin(FlipPlugin)
})

// Flip 类型定义（从全局类型获取）
type FlipState = any
type FlipTarget = string | Element | Element[] | NodeList

export interface FlipAnimationOptions {
    /** 动画持续时间（毫秒） */
    duration?: number
    /** 缓动函数 */
    ease?: string
    /** 元素间交错延迟（毫秒） */
    stagger?: number
    /** 是否启用绝对定位（用于从 DOM 移除的元素） */
    absolute?: boolean
    /** 是否缩放元素以适应新尺寸 */
    scale?: boolean
}

const defaultOptions: FlipAnimationOptions = {
    duration: 350,
    ease: 'power2.inOut',
    stagger: 25,
    absolute: false,
    scale: false
}

// 获取 Flip 类
const getFlip = () => {
    // @ts-expect-error GSAP Flip is globally registered
    return window.Flip || gsap.plugins?.flip
}

/**
 * FLIP 动画 Hook
 * 用于处理布局变化时的平滑过渡动画
 *
 * FLIP 技术：
 * First - 记录元素当前位置
 * Last - 执行布局变化，记录新位置
 * Invert - 计算位置差值
 * Play - 播放动画
 */
export function useFlipAnimation(options: FlipAnimationOptions = {}) {
    const mergedOptions = { ...defaultOptions, ...options }

    // 存储的状态
    let flipState: FlipState = null
    let isAnimating = false

    /**
     * 记录当前状态（First 阶段）
     * @param targets 目标元素
     */
    const recordState = (targets: FlipTarget): FlipState => {
        const Flip = getFlip()
        if (Flip) {
            flipState = Flip.getState(targets)
        }
        return flipState
    }

    /**
     * 执行 FLIP 动画（Play 阶段）
     * @param state 可选的状态
     * @param animationOptions 动画配置
     */
    const playAnimation = async (
        state?: FlipState,
        animationOptions?: FlipAnimationOptions
    ): Promise<void> => {
        const finalState = state || flipState
        if (!finalState) {
            console.warn('No FLIP state recorded. Call recordState() first.')
            return
        }

        if (isAnimating) {
            return
        }

        isAnimating = true
        const finalOptions = { ...mergedOptions, ...animationOptions }

        return new Promise((resolve) => {
            const Flip = getFlip()
            if (Flip) {
                Flip.from(finalState, {
                    duration: (finalOptions.duration || 350) / 1000,
                    ease: finalOptions.ease || 'power2.inOut',
                    stagger: (finalOptions.stagger || 25) / 1000,
                    absolute: finalOptions.absolute,
                    scale: finalOptions.scale,
                    onComplete: () => {
                        isAnimating = false
                        resolve()
                    }
                })
            } else {
                isAnimating = false
                resolve()
            }
        })
    }

    /**
     * 执行完整的 FLIP 动画流程
     */
    const flip = async (
        targets: FlipTarget,
        layoutChange: () => void | Promise<void>,
        animationOptions?: FlipAnimationOptions
    ): Promise<void> => {
        // First: 记录当前状态
        const state = recordState(targets)

        // 执行布局变化
        await layoutChange()

        // 等待 DOM 更新
        await nextTick()

        // Play: 播放动画
        await playAnimation(state, animationOptions)
    }

    /**
     * 清除记录的状态
     */
    const clearState = () => {
        flipState = null
    }

    /**
     * 是否正在动画中
     */
    const animating = ref(false)

    return {
        recordState,
        playAnimation,
        flip,
        clearState,
        animating
    }
}

/**
 * 为容器内的卡片元素创建 FLIP 动画
 * @param containerRef 容器的 ref
 * @param selector 卡片选择器，默认为 '.flip-card'
 */
export function useContainerFlipAnimation(
    containerRef: Ref<HTMLElement | null>,
    selector: string = '.flip-card'
) {
    const { flip, animating } = useFlipAnimation({
        duration: 350,
        ease: 'power2.inOut',
        stagger: 25
    })

    /**
     * 执行容器内卡片的 FLIP 动画
     * @param layoutChange 布局变化函数
     */
    const flipContainer = async (layoutChange: () => void | Promise<void>) => {
        if (!containerRef.value) return

        const cards = containerRef.value.querySelectorAll(selector)
        if (cards.length === 0) return

        animating.value = true
        await flip(cards, layoutChange)
        animating.value = false
    }

    return {
        flipContainer,
        animating
    }
}