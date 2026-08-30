<script setup lang="ts">
import { ref, computed, onMounted, watch, nextTick, useTemplateRef } from "vue";
import { onClickOutside } from "@vueuse/core";

const props = defineProps<{
    modelValue: string;
    visible: boolean;
    ignore?: (HTMLElement | null)[];
}>();

const emit = defineEmits<{
    "update:modelValue": [value: string];
    "update:visible": [value: boolean];
}>();

const containerRef = useTemplateRef("containerRef");

onClickOutside(containerRef, () => {
    if (props.visible) {
        close();
    }
}, { ignore: computed(() => props.ignore || []) });

const hueRef = useTemplateRef("hueRef");
const pickerRef = useTemplateRef("pickerRef");

const hue = ref(0);
const saturation = ref(100);
const lightness = ref(50);
const hexInput = ref(props.modelValue);
const isDraggingHue = ref(false);
const isDraggingPicker = ref(false);

function hexToHsl(hex: string): { h: number; s: number; l: number } {
    hex = hex.replace("#", "");
    const r = parseInt(hex.substring(0, 2), 16) / 255;
    const g = parseInt(hex.substring(2, 4), 16) / 255;
    const b = parseInt(hex.substring(4, 6), 16) / 255;

    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const l = (max + min) / 2;

    if (max === min) return { h: 0, s: 0, l: Math.round(l * 100) };

    const d = max - min;
    const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

    let h = 0;
    if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
    else if (max === g) h = ((b - r) / d + 2) / 6;
    else h = ((r - g) / d + 4) / 6;

    return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) };
}

function hslToHex(h: number, s: number, l: number): string {
    const sNorm = s / 100;
    const lNorm = l / 100;
    const c = (1 - Math.abs(2 * lNorm - 1)) * sNorm;
    const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
    const m = lNorm - c / 2;

    let r = 0, g = 0, b = 0;
    if (h < 60) { r = c; g = x; }
    else if (h < 120) { r = x; g = c; }
    else if (h < 180) { g = c; b = x; }
    else if (h < 240) { g = x; b = c; }
    else if (h < 300) { r = x; b = c; }
    else { r = c; b = x; }

    const toHex = (v: number) => Math.round((v + m) * 255).toString(16).padStart(2, "0");
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

const currentColor = computed(() => hslToHex(hue.value, saturation.value, lightness.value));

// props 同步引起的 currentColor 变化不回写 modelValue：
// HSL 换算的舍入误差会让回写值和色板原色差一点，
// 覆盖掉刚选的颜色导致对勾要点两次才出现
let syncingFromProp = false;

watch(currentColor, (val) => {
    hexInput.value = val;
    if (syncingFromProp) return;
    emit("update:modelValue", val);
});

watch(() => props.modelValue, (val) => {
    if (val !== currentColor.value) {
        syncingFromProp = true;
        const hsl = hexToHsl(val);
        hue.value = hsl.h;
        saturation.value = hsl.s;
        lightness.value = hsl.l;
        hexInput.value = val;
        nextTick(() => (syncingFromProp = false));
    }
});

watch(() => props.visible, (val) => {
    if (val) {
        const hsl = hexToHsl(props.modelValue);
        hue.value = hsl.h;
        saturation.value = hsl.s;
        lightness.value = hsl.l;
    }
});

function close() {
    emit("update:visible", false);
}

function handleHexInput() {
    const hex = hexInput.value.trim();
    if (/^#[0-9a-fA-F]{6}$/.test(hex)) {
        const hsl = hexToHsl(hex);
        hue.value = hsl.h;
        saturation.value = hsl.s;
        lightness.value = hsl.l;
    }
}

function handleHueMouseDown(e: MouseEvent) {
    isDraggingHue.value = true;
    updateHue(e);
    window.addEventListener("mousemove", handleHueMouseMove);
    window.addEventListener("mouseup", handleHueMouseUp);
}

function handleHueMouseMove(e: MouseEvent) {
    if (isDraggingHue.value) updateHue(e);
}

function handleHueMouseUp() {
    isDraggingHue.value = false;
    window.removeEventListener("mousemove", handleHueMouseMove);
    window.removeEventListener("mouseup", handleHueMouseUp);
}

function updateHue(e: MouseEvent) {
    const el = hueRef.value;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
    hue.value = Math.round((x / rect.width) * 360);
}

function handlePickerMouseDown(e: MouseEvent) {
    isDraggingPicker.value = true;
    updatePicker(e);
    window.addEventListener("mousemove", handlePickerMouseMove);
    window.addEventListener("mouseup", handlePickerMouseUp);
}

function handlePickerMouseMove(e: MouseEvent) {
    if (isDraggingPicker.value) updatePicker(e);
}

function handlePickerMouseUp() {
    isDraggingPicker.value = false;
    window.removeEventListener("mousemove", handlePickerMouseMove);
    window.removeEventListener("mouseup", handlePickerMouseUp);
}

function updatePicker(e: MouseEvent) {
    const el = pickerRef.value;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
    const y = Math.max(0, Math.min(e.clientY - rect.top, rect.height));
    saturation.value = Math.round((x / rect.width) * 100);
    lightness.value = Math.round(100 - (y / rect.height) * 100);
}

const pickerBg = computed(() => `hsl(${hue.value}, 100%, 50%)`);
const pickerThumbX = computed(() => `${saturation.value}%`);
const pickerThumbY = computed(() => `${100 - lightness.value}%`);

onMounted(() => {
    const hsl = hexToHsl(props.modelValue);
    hue.value = hsl.h;
    saturation.value = hsl.s;
    lightness.value = hsl.l;
});
</script>

<template>
    <Transition name="picker-pop">
        <div
            v-if="visible"
            ref="containerRef"
            class="absolute top-full left-1/2 z-50 mt-2 w-60 -translate-x-1/2 space-y-3 rounded-2xl border border-slate-200 bg-white p-3.5 shadow-xl"
        >
            <!-- 色相选择器 -->
            <div class="space-y-1.5">
                <div
                    ref="hueRef"
                    class="relative h-2.5 w-full cursor-pointer rounded-full"
                    style="background: linear-gradient(to right, #f00, #ff0, #0f0, #0ff, #00f, #f0f, #f00)"
                    @mousedown="handleHueMouseDown"
                >
                    <div
                        class="pointer-events-none absolute top-1/2 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow-md"
                        :style="{ left: `${(hue / 360) * 100}%`, background: hslToHex(hue, 100, 50) }"
                    />
                </div>
            </div>

            <!-- 饱和度/亮度选择器 -->
            <div
                ref="pickerRef"
                class="relative h-32 w-full cursor-crosshair rounded-xl"
                :style="{ background: pickerBg }"
                @mousedown="handlePickerMouseDown"
            >
                <div class="absolute inset-0 rounded-xl" style="background: linear-gradient(to right, #fff, transparent)" />
                <div class="absolute inset-0 rounded-xl" style="background: linear-gradient(to bottom, transparent, #000)" />
                <div
                    class="pointer-events-none absolute h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow-lg"
                    :style="{ left: pickerThumbX, top: pickerThumbY, background: currentColor }"
                />
            </div>

            <!-- 输入和预览 -->
            <div class="flex items-center gap-2">
                <div
                    class="h-7 w-7 flex-shrink-0 rounded-full shadow-sm ring-1 ring-slate-200"
                    :style="{ background: currentColor }"
                />
                <input
                    v-model="hexInput"
                    class="flex-1 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-mono text-slate-700 outline-none transition-colors focus:border-slate-300"
                    @change="handleHexInput"
                    @keydown.enter="handleHexInput"
                />
            </div>
        </div>
    </Transition>
</template>

<style scoped>
.picker-pop-enter-active {
    transition: opacity 0.2s ease, transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
}
.picker-pop-leave-active {
    transition: opacity 0.12s ease, transform 0.12s ease;
}
.picker-pop-enter-from {
    opacity: 0;
    transform: translateY(8px);
}
.picker-pop-leave-to {
    opacity: 0;
    transform: translateY(4px);
}
</style>
