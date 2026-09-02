<script setup lang="ts">
/**
 * ZXDropdown - 轻量下拉选择
 *
 * 触发器样式由父级通过 triggerClass 定制，面板 teleport 到 body（不受
 * 祖先 overflow / isolation / transform 裁剪），超出视口底部自动向上翻转。
 */
import { nextTick, onMounted, onUnmounted, ref, watch } from "vue";
import { Check, ChevronDown } from "lucide-vue-next";

export interface ZXDropdownOption {
    label: string;
    value: string;
    disabled?: boolean;
}

const props = defineProps<{
    options: ZXDropdownOption[];
    modelValue: string;
    placeholder?: string;
    triggerClass?: string;
}>();

const emit = defineEmits<{
    (e: "update:modelValue", value: string): void;
}>();

const triggerRef = ref<HTMLElement | null>(null);
const panelRef = ref<HTMLElement | null>(null);
const open = ref(false);
const pos = ref({ x: 0, y: 0 });

const currentLabel = () =>
    props.options.find((opt) => opt.value === props.modelValue)?.label ??
    props.placeholder ??
    "";

const toggle = () => {
    open.value = !open.value;
};

const select = (opt: ZXDropdownOption) => {
    if (opt.disabled) return;
    emit("update:modelValue", opt.value);
    open.value = false;
};

/** 视口内防溢出定位，底部放不下时向上翻 */
const updatePos = () => {
    const trigger = triggerRef.value;
    const panel = panelRef.value;
    if (!trigger || !panel) return;
    const r = trigger.getBoundingClientRect();
    const w = panel.offsetWidth;
    const h = panel.offsetHeight;
    const x = Math.max(8, Math.min(r.left, window.innerWidth - w - 8));
    let y = r.bottom + 6;
    if (y + h > window.innerHeight - 8) {
        y = Math.max(8, r.top - h - 6);
    }
    pos.value = { x, y };
};

const onPointerDown = (e: PointerEvent) => {
    if (!open.value) return;
    const target = e.target as Node;
    if (
        triggerRef.value?.contains(target) ||
        panelRef.value?.contains(target)
    ) {
        return;
    }
    open.value = false;
};

const onKeydown = (e: KeyboardEvent) => {
    if (open.value && e.key === "Escape") open.value = false;
};

const onDismiss = () => {
    if (open.value) open.value = false;
};

watch(open, (visible) => {
    if (visible) nextTick(updatePos);
});

onMounted(() => {
    window.addEventListener("pointerdown", onPointerDown, true);
    window.addEventListener("keydown", onKeydown);
    window.addEventListener("scroll", onDismiss, true);
    window.addEventListener("resize", onDismiss);
});

onUnmounted(() => {
    window.removeEventListener("pointerdown", onPointerDown, true);
    window.removeEventListener("keydown", onKeydown);
    window.removeEventListener("scroll", onDismiss, true);
    window.removeEventListener("resize", onDismiss);
});
</script>

<template>
    <button
        ref="triggerRef"
        class="flex cursor-pointer items-center gap-1"
        :class="triggerClass"
        type="button"
        @click="toggle"
    >
        <slot name="trigger" :label="currentLabel()" :open="open">
            <span class="whitespace-nowrap">{{ currentLabel() }}</span>
            <ChevronDown
                class="h-4 w-4 shrink-0 transition-transform"
                :class="open ? 'rotate-180' : ''"
            />
        </slot>
    </button>

    <Teleport to="body">
        <Transition name="zx-dd-pop">
            <div
                v-if="open"
                ref="panelRef"
                class="fixed z-9999 min-w-28 overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-lg"
                :style="{ left: `${pos.x}px`, top: `${pos.y}px` }"
            >
                <button
                    v-for="opt in options"
                    :key="opt.value"
                    :disabled="opt.disabled"
                    class="flex w-full cursor-pointer items-center justify-between gap-3 px-3.5 py-1.5 text-left text-sm whitespace-nowrap transition-colors disabled:pointer-events-none disabled:opacity-40"
                    :class="
                        opt.value === modelValue
                            ? 'text-zx-primary'
                            : 'text-slate-600 hover:bg-slate-100'
                    "
                    type="button"
                    @click="select(opt)"
                >
                    <span>{{ opt.label }}</span>
                    <Check
                        v-if="opt.value === modelValue"
                        class="h-3.5 w-3.5 shrink-0"
                    />
                </button>
            </div>
        </Transition>
    </Teleport>
</template>

<style scoped>
.zx-dd-pop-enter-active,
.zx-dd-pop-leave-active {
    transition:
        opacity 0.12s ease,
        transform 0.12s ease;
}

.zx-dd-pop-enter-from,
.zx-dd-pop-leave-to {
    opacity: 0;
    transform: scale(0.92) translateY(-4px);
}
</style>
