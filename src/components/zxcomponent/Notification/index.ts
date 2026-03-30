import { createVNode, render, ComponentInternalInstance } from 'vue'
import { ZXNotificationFn, ZXNotificationOptions } from './types'


// 🔧 默认设置
const defaultOptions: Required<ZXNotificationOptions> = {
    duration: 3000,
    position: 'top-right',
    type: 'info',
    customClass: '',
    confetti: false,
    message: '',
}

let vm: ComponentInternalInstance | null = null
let loadingPromise: Promise<ComponentInternalInstance | null> | null = null

function ensureMounted(): Promise<ComponentInternalInstance | null> {
    if (vm) return Promise.resolve(vm)
    if (loadingPromise) return loadingPromise

    loadingPromise = import('./Notification.vue').then(({ default: CenterNotification }) => {
        return new Promise<ComponentInternalInstance | null>((resolve) => {
            const container = document.createElement('div')
            document.body.appendChild(container)

            const vnode = createVNode(CenterNotification)
            render(vnode, container)

            const checkReady = () => {
                const instance = vnode.component
                if (instance && instance.exposed && (instance.exposed as any).addNotification) {
                    vm = instance
                    resolve(vm)
                } else {
                    requestAnimationFrame(checkReady) // 等待下个 tick
                }
            }

            checkReady()
        })
    })

    return loadingPromise
}



// 主函数实现
const ZXNotification = ((options: ZXNotificationOptions | string) => {
        const finalOptions: ZXNotificationOptions =
            typeof options === 'string'
                ? { ...defaultOptions, message: options }
                : { ...defaultOptions, ...options }

        ensureMounted().then((comp) => {
            ;(comp?.exposed as any)?.addNotification(finalOptions)
        })
    }) as ZXNotificationFn

// 快捷函数
;(['success', 'error', 'info', 'warning'] as const).forEach((type) => {
    ZXNotification[type] = (opts: ZXNotificationOptions | string) => {
        const config = typeof opts === 'string' ? { message: opts } : opts
        ZXNotification({ ...defaultOptions, ...config, type:type })
    }
})


// 🌐 设置默认值
ZXNotification.setDefaultOptions = (opts: Partial<ZXNotificationOptions>) => {
    Object.assign(defaultOptions, opts)
}

// ✅ 重置默认值
ZXNotification.resetDefaultOptions = () => {
    Object.assign(defaultOptions, {
        duration: 3000,
        position: 'top-right',
        type: 'info',
        customClass: '',
        confetti: false,
        message: '',
    })
}

export default ZXNotification
