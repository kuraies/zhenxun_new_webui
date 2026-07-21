<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from "vue";
import { gsap } from "gsap";
import { ChevronRight } from "lucide-vue-next";
import { useGlobalStore } from "@/store/global.js";
import { router } from "@/router/index.js";
import type { MenuItem } from "@/config/menu";

const props = defineProps<{ item: MenuItem }>();

const globalStore = useGlobalStore();

// 模板引用
const iconRef = ref<HTMLElement | null>(null);
const arrowRef = ref<HTMLElement | null>(null);

// 动画实例
let breathAnimation: gsap.core.Animation | null = null;
let rightAnimation: gsap.core.Animation | null = null;

// 判断当前项是否被激活
const isActive = computed(() => globalStore.activeMenuKey === props.item.key);

const startAnim = () => {
    if (!iconRef.value) return;
    if (globalStore.activeMenuKey) {
        stopAnim();
    }

    breathAnimation = gsap.fromTo(
        iconRef.value,
        { scale: 0.85 },
        {
            scale: 1.15,
            duration: 1.5,
            yoyo: true,
            repeat: -1,
            ease: "sine.inOut",
        },
    );

    if (!globalStore.navMini && arrowRef.value) {
        rightAnimation = gsap.fromTo(
            arrowRef.value,
            { x: -5 },
            { x: 5, duration: 1, yoyo: true, repeat: -1, ease: "sine.inOut" },
        );
    }
};

const stopAnim = () => {
    if (breathAnimation) {
        breathAnimation.kill();
        breathAnimation = null;
        if (iconRef.value) {
            gsap.to(iconRef.value, {
                scale: 1,
                duration: 0.2,
                ease: "back.out(1.7)",
            });
        }
    }
    if (rightAnimation) {
        rightAnimation.kill();
        rightAnimation = null;
        if (arrowRef.value) gsap.to(arrowRef.value, { x: 0, duration: 0.2 });
    }
};

// 监听激活状态，自动播放或停止动画
watch(
    isActive,
    (val) => {
        if (val) startAnim();
        else stopAnim();
    },
    { immediate: true },
);

watch(
    () => globalStore.navMini,
    () => {
        if (isActive.value) startAnim();
    },
);

onMounted(async () => {
    await nextTick();
    if (isActive.value) startAnim();
});

// 事件处理
const handleClick = () => {
    globalStore.activeMenuKey = props.item.key;
    if (props.item.path) router.push(props.item.path);
};

const handleMouseEnter = () => {
    if (!isActive.value) startAnim();
};
const handleMouseLeave = () => {
    if (!isActive.value) stopAnim();
};

// 清理动画，防止内存泄漏
onUnmounted(() => stopAnim());
</script>

<template>
    <div
        class="menus-item group flex cursor-pointer snap-start items-center rounded-full border transition-[transform,border-color,box-shadow,height,width,padding] duration-[400ms] ease-in-out"
        :class="{
            'h-12 w-12 justify-center p-0':
                globalStore.navMini,
            'h-14 w-full p-1': !globalStore.navMini,
            'scale-105 border-slate-300 shadow-sm':
                isActive && !globalStore.navMini,
            'border-transparent': !isActive || globalStore.navMini,
            'hover:scale-105 hover:border-slate-300 hover:shadow-sm':
                !isActive && !globalStore.navMini,
            'hover:scale-110': globalStore.navMini,
            // 'no-scrollbar': globalStore.navMini,
        }"
        @click="handleClick"
        @mouseenter="handleMouseEnter"
        @mouseleave="handleMouseLeave"
    >
        <div
            ref="iconRef"
            :class="[
                isActive
                    ? 'bg-zx-nav-icon-hover text-[color:var(--zx-nav-icon-hover-text)] shadow-sm'
                    : 'bg-zx-nav-icon text-slate-700',
                globalStore.navMini && isActive
                    ? 'border border-slate-300'
                    : 'border border-transparent',
                globalStore.navMini ? 'h-12 w-12 p-0' : 'p-3.5',
            ]"
            class="icon flex items-center justify-center rounded-full transition-[width,height,padding,background-color,color,border-color,box-shadow] duration-[400ms] ease-in-out group-hover:bg-zx-nav-icon-hover group-hover:text-[color:var(--zx-nav-icon-hover-text)]"
        >
            <component :is="item.icon" class="h-5 w-5" />
        </div>

        <div
            class="right flex min-w-0 flex-1 items-center overflow-hidden transition-[max-width,opacity,padding] duration-[400ms] ease-in-out"
            :class="
                globalStore.navMini
                    ? 'max-w-0 pl-0 opacity-0'
                    : 'max-w-48 pl-1.5 opacity-100 sm:pl-2'
            "
        >
            <span class="whitespace-nowrap group-hover:text-right">
                {{ item.name }}
            </span>
            <div
                ref="arrowRef"
                :class="[isActive ? 'flex' : 'hidden']"
                class="arrow-right flex-1 justify-end pr-4"
            >
                <ChevronRight class="h-3 w-3 text-slate-400 sm:h-4 sm:w-4" />
            </div>
        </div>
    </div>
</template>

<style scoped>
.no-scrollbar {
    -ms-overflow-style: none;
    scrollbar-width: none;
}
.no-scrollbar::-webkit-scrollbar {
    display: none;
}
</style>
