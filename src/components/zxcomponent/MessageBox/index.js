import { createApp, h } from 'vue'


export default function ZXMessageBox(options = {}) {
    return new Promise(async (resolve) => {
        const container = document.createElement('div')
        document.body.appendChild(container)

        const {default: MessageBox} = await import('./MessageBox.vue')

        const app = createApp({
            render() {
                return h(MessageBox, {
                    ...options,
                    onConfirm: () => {
                        options.onConfirm?.()
                        resolve(true)
                        app.unmount()
                        container.remove()
                    },
                    onCancel: () => {
                        options.onCancel?.()
                        resolve(false)
                        app.unmount()
                        container.remove()
                    },
                }, options.slots ? options.slots : null)
            },
        })

        app.mount(container)
    })
}
