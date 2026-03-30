<template>
    <Teleport to="body">
        <div
            v-show="visible"
            ref="overlay"
            class="fixed inset-0 glass-overlay z-50 flex items-center justify-center"
            :class="animating ? (closing ? 'modal-jelly-leave-active' : 'modal-jelly-enter-active') : ''"
            @click.self="handleCancel"
        >
            <div
                ref="box"
                class="modal-content bg-white rounded-2xl shadow-xl p-6 w-100 max-w-[90%] relative"
            >
                <h3 v-if="title" class="text-xl font-semibold mb-4 text-gray-800">
                    {{ title }}
                </h3>

                <div class="text-gray-700 mb-6">
                    <slot>{{ message }}</slot>
                </div>

                <div class="flex justify-end gap-6">
                    <button
                        v-if="cancelButtonText"
                        @click="handleCancel"
                        class="px-4 py-1.5 rounded-full bg-gray-200 text-gray-700 hover:bg-gray-300 transition cursor-pointer"
                    >
                        {{ cancelButtonText }}
                    </button>

                    <button
                        @click="handleConfirm"
                        @mouseenter="hovering = true"
                        @mouseleave="hovering = false"
                        class="px-4 py-1.5 rounded-full bg-orange-400 text-white hover:bg-orange-500 transition cursor-pointer"
                    >
                        {{ hovering && confirmButtonHoverText ? confirmButtonHoverText : confirmButtonText }}
                    </button>
                </div>

                <div
                    class="absolute top-0 right-0 -translate-x-4/5 translate-y-4/5 cursor-pointer text-gray-400"
                    @click="handleCancel"
                >
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke-width="1.5"
                        stroke="currentColor"
                        class="size-5"
                    >
                        <path stroke-linecap="round" stroke-linejoin="round" d="M6 18 18 6M6 6l12 12" />
                    </svg>
                </div>
            </div>
        </div>
    </Teleport>
</template>

<script setup>
import { ref, onMounted } from 'vue'

const props = defineProps({
    title: String,
    message: String,
    confirmButtonText: { type: String, default: '确定' },
    confirmButtonHoverText: String,
    cancelButtonText: String,
    onConfirm: Function,
    onCancel: Function,
})

const visible = ref(false)
const hovering = ref(false)
const animating = ref(false)
const closing = ref(false)
const overlay = useTemplateRef("overlay")
const box = useTemplateRef("box")

onMounted(() => {
    visible.value = true
    animating.value = true

    // 动画结束后清理
    setTimeout(() => {
        animating.value = false
    }, 500)
})

function handleConfirm() {
    close(() => props.onConfirm?.())
}

function handleCancel() {
    close(() => props.onCancel?.())
}

function close(callback) {
    closing.value = true
    animating.value = true

    // 等待离开动画完成
    setTimeout(() => {
        visible.value = false
        callback?.()
    }, 250)
}
</script>
