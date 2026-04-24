<script setup lang="ts">
import { computed, onUnmounted, ref, watch } from "vue";
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
    if (!iconRef.value || !arrowRef.value) return;
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

    rightAnimation = gsap.fromTo(
        arrowRef.value,
        { x: -5 },
        { x: 5, duration: 1, yoyo: true, repeat: -1, ease: "sine.inOut" },
    );
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
        class="menus-item group flex h-14 w-full cursor-pointer snap-start items-center rounded-full border-slate-300 p-1 transition-[padding] duration-300 ease-in-out hover:shadow-sm"
        :class="{
            'scale-105 border border-slate-300 shadow-sm': isActive,
            'hover:scale-110 hover:border': !isActive,
            'translate-x-0.5 space-x-0! border-none! p-0! shadow-none!':
                globalStore.navMini,
            // 'no-scrollbar': globalStore.navMini,
        }"
        @click="handleClick"
        @mouseenter="handleMouseEnter"
        @mouseleave="handleMouseLeave"
    >
        <div
            ref="iconRef"
            :class="{ 'bg-black text-white': isActive }"
            class="icon flex items-center justify-center rounded-full bg-[#f0f1f6] p-3.5 group-hover:bg-black group-hover:text-white"
        >
            <component :is="item.icon" class="h-5 w-5" />
        </div>

        <div
            class="right flex min-w-0 flex-1 items-center pl-1.5 sm:pl-2"
            :class="{ hidden: globalStore.navMini }"
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