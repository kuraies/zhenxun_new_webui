import { createApp, defineAsyncComponent, h, ref, Ref } from 'vue'
import { useComponentStore } from '@/store/component.js'

// 异步加载组件
const LocationAddress = defineAsyncComponent(() => import('./LocationAddress.vue'))

// 假设 LocationAddress.vue 使用 defineExpose 暴露了 leaveAnimation
type LocationAddressExposed = {
    leaveAnimation?: () => Promise<void>
}

export function showLocationAddress(props: Record<string, any> = {}) {
    const container = document.createElement('div')
    document.body.appendChild(container)

    const visible = ref(true)
    const modalRef: Ref<LocationAddressExposed | null> = ref(null)

    const componentStore = useComponentStore()
    componentStore.LocationAddress = visible.value

    const close = async (): Promise<void> => {
        // 调用组件暴露的离开动画方法
        if (modalRef.value?.leaveAnimation) {
            await modalRef.value.leaveAnimation()
        }
        app.unmount()
        container.remove()
    }

    const app = createApp({
        setup() {
            return () =>
                h(LocationAddress, {
                    ...props,
                    modelValue: visible.value,
                    ref: modalRef,
                    'onUpdate:modelValue': (val: boolean) => {
                        visible.value = val
                        if (!val) {
                            close()
                        }
                    },
                })
        },
    })

    app.mount(container)

    // 返回关闭方法以便外部调用
    return {
        close,
    }
}
