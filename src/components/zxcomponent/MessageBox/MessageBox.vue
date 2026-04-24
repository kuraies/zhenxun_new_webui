<template>
    <Teleport to="body">
        <div
            v-show="visible"
            ref="overlay"
            class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 select-none"
            @click.self="handleCancel"
        >
            <div
                ref="box"
                class="relative w-100 max-w-[90%] scale-95 rounded-2xl bg-white p-6 opacity-0 shadow-xl"
            >
                <h3
                    v-if="title"
                    class="mb-4 text-xl font-semibold text-gray-800"
                >
                    {{ title }}
                </h3>

                <div class="mb-6 text-sm text-gray-700">
                    <slot>{{ message }}</slot>
                </div>

                <div class="flex justify-end gap-6">
                    <button
                        v-if="cancelButtonText"
                        @click="handleCancel"
                        class="cursor-pointer rounded-full bg-gray-200 px-6 py-1.5 text-sm text-gray-700 transition hover:bg-gray-300 active:scale-95"
                    >
                        {{ cancelButtonText }}
                    </button>

                    <button
                        @click="handleConfirm"
                        @mouseenter="hovering = true"
                        @mouseleave="hovering = false"
                        class="cursor-pointer rounded-full px-6 py-1.5 text-sm text-white transition active:scale-95"
                        :class="
                            confirmButtonHoverBg
                                ? confirmButtonHoverBg
                                : 'bg-sky-500 hover:bg-sky-600'
                        "
                    >
                        {{
                            hovering && confirmButtonHoverText
                                ? confirmButtonHoverText
                                : confirmButtonText
                        }}
                    </button>
                </div>

                <div
                    class="absolute top-0 right-0 -translate-x-4/5 translate-y-4/5 cursor-pointer text-gray-400 active:scale-90"
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
                        <path
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            d="M6 18 18 6M6 6l12 12"
                        />
                    </svg>
                </div>
            </div>
        </div>
    </Teleport>
</template>

<script setup>
import { onMounted, ref } from "vue";
import { gsap } from "gsap";

const props = defineProps({
    title: String,
    message: String,
    confirmButtonText: { type: String, default: "确定" },
    confirmButtonHoverText: String,
    confirmButtonHoverBg: String,
    cancelButtonText: String,
    onConfirm: Function,
    onCancel: Function,
});

const visible = ref(false);
const hovering = ref(false);
const overlay = useTemplateRef("overlay");
const box = useTemplateRef("box");

onMounted(() => {
    visible.value = true;

    // 动画进入
    gsap.fromTo(
        overlay.value,
        { opacity: 0 },
        { opacity: 1, duration: 0.3, ease: "power2.out" },
    );
    gsap.fromTo(
        box.value,
        { opacity: 0, scale: 0.8 },
        { opacity: 1, scale: 1.1, duration: 0.3, ease: "back.out(1.7)" },
    );
});

function handleConfirm() {
    close(() => props.onConfirm?.());
}

function handleCancel() {
    close(() => props.onCancel?.());
}

function close(callback) {
    gsap.to(box.value, {
        opacity: 0,
        scale: 0.8,
        duration: 0.2,
        ease: "power2.in",
    });
    gsap.to(overlay.value, {
        opacity: 0,
        duration: 0.2,
        ease: "power2.in",
        onComplete() {
            visible.value = false;
            callback?.();
        },
    });
}
</script>
