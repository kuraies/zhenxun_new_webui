import { createVNode, render, ComponentInternalInstance } from 'vue'
import { ZXConfettiExposed, ZXConfettiOptions, ZXConfettiFn } from './types'



// 记录最近鼠标坐标
let mouseX = window.innerWidth / 2
let mouseY = window.innerHeight / 2

window.addEventListener('mousemove', (e) => {
    mouseX = e.clientX
    mouseY = e.clientY
})

let vm: ComponentInternalInstance | null = null
let loadingPromise: Promise<ComponentInternalInstance | null> | null = null

async function ensureMounted(): Promise<ComponentInternalInstance | null> {
    if (vm) return vm
    if (loadingPromise) return vm

    loadingPromise = import('./Confetti.vue').then(({ default: ConfettiVue }) => {
        const container = document.createElement('div')
        document.body.appendChild(container)

        const vnode = createVNode(ConfettiVue)
        render(vnode, container)
        vm = vnode.component

        return vm
    })

    return vm
}

function baseConfetti(options: ZXConfettiOptions = {}) {
    const { x = window.innerWidth / 2, y = window.innerHeight / 2 } = options
    ensureMounted().then((instance) => {
        const exposed = instance?.exposed as ZXConfettiExposed | undefined
        exposed?.launch(x, y, options)
    })
}





const ZXConfetti = ((options?: ZXConfettiOptions) => {
    baseConfetti(options ?? {})
}) as ZXConfettiFn

ZXConfetti.atMouse = function (options: ZXConfettiOptions = {}) {
    ZXConfetti({ x: mouseX, y: mouseY, ...options })
}

ZXConfetti.atElement = function (el: HTMLElement, options: ZXConfettiOptions = {}) {
    const rect = el.getBoundingClientRect()
    const x = rect.left + rect.width / 2
    const y = rect.top + rect.height / 2
    ZXConfetti({ x, y, ...options })
}

// ✅ 风格预设
ZXConfetti.success = () =>
    ZXConfetti.atMouse({
        total: 40,
        colors: ['#34d399', '#10b981', '#6ee7b7'],
        emojiList: ['✅', '🎉', '👍'],
        useEmoji: true,
    })

ZXConfetti.error = () =>
    ZXConfetti.atMouse({
        total: 40,
        colors: ['#f87171', '#ef4444', '#dc2626'],
        emojiList: ['❌', '💥', '😵'],
        useEmoji: true,
    })

ZXConfetti.fireworks = () =>
    ZXConfetti.atMouse({
        total: 80,
        useEmoji: true,
        emojiList: ['🎆', '✨', '🎇', '💫'],
        colors: ['#60a5fa', '#fbbf24', '#a78bfa', '#34d399'],
    })

export { ZXConfetti }
