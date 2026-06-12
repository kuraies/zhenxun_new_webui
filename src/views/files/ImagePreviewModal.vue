<script setup lang="ts">
import { onBeforeUnmount, watch, ref } from "vue";
import {
    Download,
    Image as ImageIcon,
    RotateCcw,
    RotateCw,
    X,
    ZoomIn,
    ZoomOut,
} from "lucide-vue-next";

const props = defineProps<{
    modelValue: boolean;
    imageUrl: string;
    imageName: string;
    loading: boolean;
}>();

const emit = defineEmits<{
    "update:modelValue": [value: boolean];
    loaded: [];
}>();

const imageScale = ref(1);
const imageRotation = ref(0);

const zoomIn = () => {
    if (imageScale.value < 3) {
        imageScale.value += 0.25;
    }
};

const zoomOut = () => {
    if (imageScale.value > 0.5) {
        imageScale.value -= 0.25;
    }
};

const resetZoom = () => {
    imageScale.value = 1;
};

const rotateLeft = () => {
    imageRotation.value = (imageRotation.value - 90) % 360;
};

const rotateRight = () => {
    imageRotation.value = (imageRotation.value + 90) % 360;
};

const close = () => {
    emit("update:modelValue", false);
};

const downloadImage = () => {
    if (!props.imageUrl) return;

    const link = document.createElement("a");
    link.href = props.imageUrl;
    link.download = props.imageName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};

const handleKeyDown = (event: KeyboardEvent) => {
    if (!props.modelValue) return;

    switch (event.key) {
        case "Escape":
            close();
            break;
        case "+":
        case "=":
            zoomIn();
            break;
        case "-":
            zoomOut();
            break;
        case "0":
            resetZoom();
            break;
        case "ArrowLeft":
            if (event.shiftKey) rotateLeft();
            break;
        case "ArrowRight":
            if (event.shiftKey) rotateRight();
            break;
    }
};

watch(
    () => props.modelValue,
    (visible) => {
        if (!visible) return;

        imageScale.value = 1;
        imageRotation.value = 0;
    },
);

window.addEventListener("keydown", handleKeyDown);

onBeforeUnmount(() => {
    window.removeEventListener("keydown", handleKeyDown);
});
</script>

<template>
    <div
        v-if="modelValue"
        class="fixed inset-0 z-50 flex items-center justify-center bg-black/90"
        @click="close"
    >
        <div
            class="relative flex h-full w-full flex-col items-center justify-between p-4"
            @click.stop
        >
            <div
                class="z-20 mb-4 flex w-full flex-shrink-0 items-center justify-between rounded-2xl bg-black/40 p-3 backdrop-blur-sm"
            >
                <div class="flex-1 text-center text-white">
                    <h3
                        class="mx-auto max-w-md truncate text-base font-semibold"
                    >
                        {{ imageName }}
                    </h3>
                    <p class="mt-1 text-sm text-gray-400">
                        缩放：{{ Math.round(imageScale * 100) }}% | 旋转：{{
                            imageRotation
                        }}°
                    </p>
                </div>
                <button
                    class="ml-4 flex-shrink-0 rounded-full bg-white/20 p-2 text-white transition-colors hover:bg-white/30"
                    @click="close"
                >
                    <X class="h-6 w-6" />
                </button>
            </div>

            <div
                class="relative z-0 flex min-h-0 w-full flex-1 items-center justify-center overflow-hidden"
            >
                <div
                    v-if="loading"
                    class="absolute inset-0 z-10 flex items-center justify-center"
                >
                    <div class="text-center text-white">
                        <ImageIcon
                            class="mx-auto mb-4 h-16 w-16 animate-pulse opacity-50"
                        />
                        <p>图片加载中...</p>
                    </div>
                </div>

                <img
                    v-show="!loading"
                    :alt="imageName"
                    :src="imageUrl"
                    :style="{
                        transform: `scale(${imageScale}) rotate(${imageRotation}deg)`,
                        transition: 'transform 0.3s ease',
                        maxWidth: '100%',
                        maxHeight: '100%',
                        objectFit: 'contain',
                        zIndex: 0,
                    }"
                    class="block"
                    @load="emit('loaded')"
                />
            </div>

            <div
                class="z-20 mt-4 flex flex-shrink-0 flex-wrap items-center justify-center gap-3 rounded-2xl bg-black/40 p-3 backdrop-blur-sm"
            >
                <div
                    class="flex items-center gap-2 rounded-2xl bg-white/10 p-2"
                >
                    <button
                        class="rounded-2xl p-2 text-white transition-colors hover:bg-white/20"
                        title="缩小"
                        @click="zoomOut"
                    >
                        <ZoomOut class="h-5 w-5" />
                    </button>
                    <button
                        class="min-w-[60px] rounded-2xl px-3 py-1 text-sm text-white transition-colors hover:bg-white/20"
                        @click="resetZoom"
                    >
                        {{ Math.round(imageScale * 100) }}%
                    </button>
                    <button
                        class="rounded-2xl p-2 text-white transition-colors hover:bg-white/20"
                        title="放大"
                        @click="zoomIn"
                    >
                        <ZoomIn class="h-5 w-5" />
                    </button>
                </div>

                <div
                    class="flex items-center gap-2 rounded-2xl bg-white/10 p-2"
                >
                    <button
                        class="rounded-2xl p-2 text-white transition-colors hover:bg-white/20"
                        title="向左旋转"
                        @click="rotateLeft"
                    >
                        <RotateCcw class="h-5 w-5" />
                    </button>
                    <button
                        class="rounded-2xl p-2 text-white transition-colors hover:bg-white/20"
                        title="向右旋转"
                        @click="rotateRight"
                    >
                        <RotateCw class="h-5 w-5" />
                    </button>
                </div>

                <button
                    class="flex items-center gap-2 rounded-2xl bg-blue-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-600"
                    @click="downloadImage"
                >
                    <Download class="h-4 w-4" />
                    下载
                </button>
            </div>
        </div>
    </div>
</template>
