<template>
    <Teleport to="body">
        <!-- 预定义所有位置容器 -->
        <div
            v-for="position in positions"
            :key="position"
            :class="['fixed z-9999', positionClasses[position]]"
        >
            <TransitionGroup tag="div"
                             class="space-y-3"
                             :css="false"
                             appear
                             @before-enter="onBeforeEnter"
                             @enter="onEnter"
                             @leave="onLeave"
                             @after-leave="onAfterLeave"
            >
                <div
                    v-for="item in getNotificationsByPosition(position)"
                    :key="item.id"
                    :data-index="item.index"
                    :data-notification-id="item.id"
                    :class="[
                        'notification-card min-w-80 max-w-96 rounded-2xl px-4 py-3.5 shadow-lg btn-touch',
                        typeClasses[item.type] || 'bg-white/95 border-l-4 border-blue-500',
                        item.customClass
                    ]"
                    @mouseenter="pauseTimer(item)"
                    @mouseleave="resumeTimer(item)"
                >
                    <div class="relative flex items-start">
                        <!-- 图标 -->
                        <div class="icon flex-shrink-0">
                            <!-- emoji 类型直接显示 emoji -->
                            <span
                                v-if="['🥳', '😭', '⚠️', '✅'].includes(item.type)"
                                class="text-2xl"
                            >{{ item.type }}</span>
                            <!-- 其他类型显示图标 -->
                            <component
                                v-else
                                :is="typeIcons[item.type]"
                                class="w-5 h-5"
                                :class="iconColorClasses[item.type] || 'text-blue-500'"
                            />
                        </div>
                        <!-- 内容 -->
                        <div class="content flex-1 min-w-0 pl-3">
                            <div v-if="item.title" class="notification-header font-medium text-sm mb-1">
                                {{ item.title }}
                            </div>
                            <div
                                class="message text-sm leading-relaxed break-words"
                                :class="item.contentClass || 'text-gray-600'"
                            >
                                {{ item.message }}
                            </div>
                            <!-- 进度条（仅在有时长的通知中显示） -->
                            <div
                                v-if="item.duration > 0"
                                class="progress-bar mt-2 h-0.5 rounded-full overflow-hidden"
                                :style="{ '--progress-duration': item.duration + 'ms' }"
                            >
                                <div
                                    class="progress-fill h-full rounded-full"
                                    :class="progressColorClasses[item.type] || 'bg-blue-500'"
                                ></div>
                            </div>
                        </div>
                        <!-- 关闭按钮 -->
                        <button
                            class="close-btn absolute -top-1 -right-1 p-1 rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-all duration-200 btn-touch"
                            @click="manualClose(item)"
                        >
                            <X class="w-3.5 h-3.5" />
                        </button>
                    </div>
                </div>
            </TransitionGroup>
        </div>
    </Teleport>
</template>

<script setup>
import { ref, computed, nextTick } from 'vue'
import gsap from 'gsap'
import { ZXConfetti } from "components/zxcomponent/Confetti"
import { ZXMessageBox } from '@/components/index.js'
import { Info, AlertTriangle, CheckCircle, XCircle, Bell } from 'lucide-vue-next'

const MAX_PER_POSITION = 99
const notifications = ref([])
const timers = new Map()
const pendingRemovals = new Map()

// 预定义所有位置
const positions = [
    'top-center',
    'top-right',
    'top-left',
    'bottom-center',
    'bottom-right',
    'bottom-left'
]

// 位置类名映射
const positionClasses = {
    'top-center': 'top-center',
    'top-right': 'top-right',
    'top-left': 'top-left',
    'bottom-center': 'bottom-center',
    'bottom-right': 'bottom-right',
    'bottom-left': 'bottom-left'
}

// 根据位置获取通知列表
function getNotificationsByPosition(position) {
    return notifications.value
        .filter((n) => n.position === position)
        .map((n, index) => ({ ...n, index }))
}

// 类型样式映射
const typeClasses = {
    'info': 'bg-white/95 border-l-4 border-blue-500',
    'success': 'bg-white/95 border-l-4 border-green-500',
    'warning': 'bg-white/95 border-l-4 border-orange-500',
    'error': 'bg-white/95 border-l-4 border-red-500',
    'default': 'bg-white/95 border-l-4 border-blue-500',
    // Emoji 表情类型映射
    '🥳': 'bg-white/95 border-l-4 border-blue-500',
    '😭': 'bg-white/95 border-l-4 border-red-500',
    '⚠️': 'bg-white/95 border-l-4 border-orange-500',
    '✅': 'bg-white/95 border-l-4 border-green-500'
}

// 图标映射
const typeIcons = {
    'info': Info,
    'success': CheckCircle,
    'warning': AlertTriangle,
    'error': XCircle,
    'default': Bell,
    // Emoji 表情类型 - 显示为文字
    '🥳': Bell,
    '😭': XCircle,
    '⚠️': AlertTriangle,
    '✅': CheckCircle
}

// 图标颜色映射
const iconColorClasses = {
    'info': 'text-blue-500',
    'success': 'text-green-500',
    'warning': 'text-orange-500',
    'error': 'text-red-500',
    'default': 'text-blue-500',
    // Emoji 表情类型映射
    '🥳': 'text-blue-500',
    '😭': 'text-red-500',
    '⚠️': 'text-orange-500',
    '✅': 'text-green-500'
}

// 进度条颜色映射
const progressColorClasses = {
    'info': 'bg-blue-500',
    'success': 'bg-green-500',
    'warning': 'bg-orange-500',
    'error': 'bg-red-500',
    'default': 'bg-blue-500',
    // Emoji 表情类型映射
    '🥳': 'bg-blue-500',
    '😭': 'bg-red-500',
    '⚠️': 'bg-orange-500',
    '✅': 'bg-green-500'
}

// 暴露方法供外部调用
function addNotification(config) {
    const id = Date.now() + Math.random()
    const {
        title = '',
        message = '',
        type = 'info',
        duration = 3000,
        position = 'top-center',
        onClose,
        customClass = '',
        contentClass = 'text-gray-500',
        confetti = false,
    } = config

    const list = notifications.value.filter((n) => n.position === position)
    if (list.length >= MAX_PER_POSITION) {
        const first = list[0]
        removeNotification(first.id, first.onClose)
    }

    const notification = {
        id,
        title,
        message,
        type,
        position,
        onClose,
        customClass,
        contentClass,
        duration,
        remaining: duration,
        createdAt: Date.now(),
        confetti,
    }

    notifications.value.push(notification)

    nextTick(() => {
        if (confetti) {
            const el = document.querySelector(`[data-notification-id="${id}"]`)
            if (el) {
                const confettiConfig = typeof confetti === 'boolean' ? {} : confetti
                ZXConfetti.atElement(el, confettiConfig)
            }
        }
    })


    if (duration > 0) {
        startTimer(notification)
    }
}

defineExpose({addNotification})

// 手动关闭
function manualClose(item) {
    removeNotification(item.id, item.onClose)
}

// 启动计时器
function startTimer(item) {
    const id = item.id
    const start = Date.now()
    const timer = setTimeout(() => {
        removeNotification(id, item.onClose)
    }, item.remaining)

    timers.set(id, {
        timer,
        start,
    })
}


// 鼠标悬停时暂停
function pauseTimer(item) {
    const t = timers.get(item.id)
    if (!t) return
    clearTimeout(t.timer)
    item.remaining -= Date.now() - t.start
}

// 鼠标移开时继续
function resumeTimer(item) {
    startTimer(item)
}

// GSAP 进入前设置
function onBeforeEnter(el) {
    // 获取外层容器的位置类名（parentElement 是 TransitionGroup 的 div，再外层是位置容器）
    const containerClass = el.parentElement?.parentElement?.className || ''
    const isTop = containerClass.includes('top-')
    const isBottom = containerClass.includes('bottom-')

    gsap.set(el, {
        opacity: 0,
        y: isBottom ? 20 : -20,
        scale: 0.95
    })
}


function onEnter(el, done) {
    gsap.to(el, {
        opacity: 1,
        y: 0,
        scale: 1,
        duration: 0.35,
        ease: 'power2.out',
        onComplete: done,
        // 超时保护：确保 done 总是被调用
        onReverseComplete: done
    })
}

// 离开动画
function onLeave(el, done) {
    // 获取外层容器的位置类名
    const containerClass = el.parentElement?.parentElement?.className || ''
    const isTop = containerClass.includes('top-')
    const isBottom = containerClass.includes('bottom-')

    // 顶部位置向上滑出，底部位置向下滑出
    const yValue = isBottom ? 20 : -20

    gsap.to(el, {
        opacity: 0,
        y: yValue,
        scale: 0.95,
        duration: 0.3,
        ease: 'power2.in',
        onComplete: done,
        // 超时保护：确保 done 总是被调用
        onReverseComplete: done
    })

    // 强制超时：3 秒后如果动画还没完成，手动调用 done
    setTimeout(() => {
        if (el.parentElement) {
            done()
        }
    }, 3000)
}

// 离开动画完成后清理
function onAfterLeave(el) {
    // 从 DOM 元素获取通知 ID 并清理
    const id = el.getAttribute('data-notification-id')
    if (id) {
        const pending = pendingRemovals.get(Number(id))
        if (pending?.onClose) {
            pending.onClose()
        }
        pendingRemovals.delete(Number(id))
    }
}

// 移除通知 - 触发 TransitionGroup 的 leave 动画
function removeNotification(id, onClose) {
    // 保存 onClose 回调，供动画完成后调用
    pendingRemovals.set(id, { onClose })

    // 清除定时器
    const t = timers.get(id)
    if (t) {
        clearTimeout(t.timer)
        timers.delete(id)
    }

    // 从数组中移除，触发 TransitionGroup 的 leave 动画
    const index = notifications.value.findIndex((n) => n.id === id)
    if (index !== -1) {
        notifications.value.splice(index, 1)
    }
}

</script>

<style scoped>
/* 位置样式 */
.top-center {
    top: 1rem;
    left: 50%;
    transform: translateX(-50%);
}

.top-right {
    top: 1rem;
    right: 1rem;
}

.top-left {
    top: 1rem;
    left: 1rem;
}

.bottom-center {
    bottom: 1rem;
    left: 50%;
    transform: translateX(-50%);
}

.bottom-left {
    bottom: 1rem;
    left: 1rem;
}

.bottom-right {
    bottom: 1rem;
    right: 1rem;
}

/* 通知卡片样式 */
.notification-card {
    background-color: rgba(255, 255, 255, 0.95);
}

/* 移动设备响应式 */
@media (max-width: 640px) {
    .top-center,
    .bottom-center {
        left: 50%;
        right: auto;
        transform: translateX(-50%);
        min-width: 90vw;
        max-width: calc(100vw - 2rem);
    }

    .top-right,
    .top-left,
    .bottom-right,
    .bottom-left {
        left: 0.75rem;
        right: 0.75rem;
        min-width: auto;
        max-width: none;
    }
}

/* 进度条动画 */
@keyframes progress {
    from {
        width: 100%;
    }
    to {
        width: 0%;
    }
}

.progress-bar {
    background-color: #e5e7eb;
}

.progress-fill {
    animation: progress var(--progress-duration) linear forwards;
}

/* 关闭按钮触摸反馈 */
.close-btn:active {
    background-color: #e5e7eb;
}
</style>
