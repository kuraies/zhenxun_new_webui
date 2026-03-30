import { createApp, h, Component, VNode, App } from 'vue'
import { MessageBoxOptions } from './types'


export default function ZXMessageBox(options: MessageBoxOptions = {}): Promise<boolean> {
    return new Promise(async (resolve) => {
        const container = document.createElement('div')
        document.body.appendChild(container)

        const { default: MessageBox }: { default: Component } = await import('./MessageBox.vue')

        let app: App | null = null

        try {
            app = createApp({
                render(): VNode {
                    const slots = options.slots || undefined;
                    return h(MessageBox, {
                        ...options,
                        // 直接使用 options 中的 onConfirm 和 onCancel 作为事件处理器
                        onConfirm: () => {
                            options.onConfirm?.()
                            resolve(true)
                            app?.unmount()
                            container.remove()
                        },
                        onCancel: () => {
                            options.onCancel?.()
                            resolve(false)
                            app?.unmount()
                            container.remove()
                        },
                    }, slots)
                },
            })

            app.mount(container)
        } catch (error) {
            console.error('Failed to load MessageBox component:', error)
            resolve(false)
            container.remove()
        }
    })
}