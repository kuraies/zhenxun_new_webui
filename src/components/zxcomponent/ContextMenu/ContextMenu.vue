<script setup lang="ts">
/**
 * 全局右键菜单面板（单例，由 index.ts 挂载并驱动 state）
 * 位置自动防溢出；点击菜单外 / Escape / 滚动 / 窗口缩放时关闭
 */
import { nextTick, onMounted, onUnmounted, ref, watch } from "vue";
import type { ZXContextMenuState } from "./index";

const props = defineProps<{ state: ZXContextMenuState }>();

const menuRef = ref<HTMLElement | null>(null);
const pos = ref({ x: 0, y: 0 });

const hide = () => {
    props.state.visible = false;
};

/** 视口内防溢出定位 */
const updatePos = () => {
    const el = menuRef.value;
    const w = el?.offsetWidth ?? 160;
    const h = el?.offsetHeight ?? 100;
    pos.value = {
        x: Math.max(4, Math.min(props.state.x, window.innerWidth - w - 8)),
        y: Math.max(4, Math.min(props.state.y, window.innerHeight - h - 8)),
    };
};

watch(
    () => props.state.visible,
    visible => {
        if (visible) nextTick(updatePos);
    },
);

const onPointerDown = (e: PointerEvent) => {
    if (!props.state.visible) return;
    if (menuRef.value && !menuRef.value.contains(e.target as Node)) hide();
};

const onKeydown = (e: KeyboardEvent) => {
    if (props.state.visible && e.key === "Escape") hide();
};

const onDismiss = () => {
    if (props.state.visible) hide();
};

const handleClick = (item: ZXContextMenuItemLike) => {
    if (item.disabled) return;
    hide();
    item.action?.();
};

interface ZXContextMenuItemLike {
    label: string;
    danger?: boolean;
    disabled?: boolean;
    action?: () => void;
}

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
    <Transition name="ctx-pop">
        <div
            v-if="state.visible"
            ref="menuRef"
            class="fixed z-9999 min-w-36 overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-lg"
            :style="{ left: `${pos.x}px`, top: `${pos.y}px` }"
            @contextmenu.prevent
        >
            <button
                v-for="(item, index) in state.items"
                :key="index"
                :disabled="item.disabled"
                :class="
                    item.danger
                        ? 'text-red-500 hover:bg-red-50'
                        : 'text-slate-600 hover:bg-slate-100'
                "
                class="flex w-full cursor-pointer items-center gap-2 px-3.5 py-1.5 text-left text-sm transition-colors disabled:pointer-events-none disabled:opacity-40"
                type="button"
                @click="handleClick(item)"
            >
                <component :is="item.icon" v-if="item.icon" class="size-4 shrink-0" />
                <span class="whitespace-nowrap">{{ item.label }}</span>
            </button>
        </div>
    </Transition>
</template>

<style scoped>
.ctx-pop-enter-active,
.ctx-pop-leave-active {
    transition:
        opacity 0.12s ease,
        transform 0.12s ease;
}

.ctx-pop-enter-from,
.ctx-pop-leave-to {
    opacity: 0;
    transform: scale(0.92) translateY(-4px);
}
</style>
