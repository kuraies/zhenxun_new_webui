<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from "vue";
import { gsap } from "gsap";
import { ChevronRight } from "lucide-vue-next";
import { useGlobalStore } from "@/store/global.js";
import { prefetchRoute, router } from "@/router/index.js";
import { openExternalWindow, type MenuItem } from "@/config/menu";

const props = defineProps<{ item: MenuItem }>();

const globalStore = useGlobalStore();

// 模板引用
const iconRef = ref<HTMLElement | null>(null);
const arrowRef = ref<HTMLElement | null>(null);

// 动画实例
let breathAnimation: gsap.core.Animation | null = null;
let rightAnimation: gsap.core.Animation | null = null;

// 二级菜单
const hasChildren = computed(() => !!props.item.children?.length);
const expanded = ref(false);

const isChildActive = computed(
    () =>
        props.item.children?.some(
            (child) => child.key === globalStore.activeMenuKey,
        ) ?? false,
);

// 判断当前项是否被激活（子项激活时父项同样高亮）
const isActive = computed(
    () => globalStore.activeMenuKey === props.item.key || isChildActive.value,
);

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

    if (!globalStore.navMini && !hasChildren.value && arrowRef.value) {
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

// 子项激活时自动展开父级
watch(
    isChildActive,
    (val) => {
        if (val) expanded.value = true;
    },
    { immediate: true },
);

onMounted(async () => {
    await nextTick();
    if (isActive.value) startAnim();
});

// 事件处理
const handleClick = () => {
    if (hasChildren.value) {
        expanded.value = !expanded.value;
        return;
    }
    if (props.item.external) {
        if (!props.item.path) return;
        if (props.item.externalWindow) {
            openExternalWindow(props.item.path, props.item.externalWindow);
        } else {
            window.open(props.item.path, "_blank", "noopener");
        }
        return;
    }
    globalStore.activeMenuKey = props.item.key;
    if (props.item.path) router.push(props.item.path);
};

const handleChildClick = (child: MenuItem) => {
    if (child.external) {
        if (!child.path) return;
        if (child.externalWindow) {
            openExternalWindow(child.path, child.externalWindow);
        } else {
            window.open(child.path, "_blank", "noopener");
        }
        return;
    }
    globalStore.activeMenuKey = child.key;
    if (child.path) router.push(child.path);
};

const handleMouseEnter = () => {
    // 顺手预取目标页的异步组件，消除点击后的 chunk 下载等待
    if (!hasChildren.value && !props.item.external && props.item.path) {
        prefetchRoute(props.item.path);
    }
    if (!isActive.value) startAnim();
};
const handleMouseLeave = () => {
    if (!isActive.value) stopAnim();
};

// 清理动画，防止内存泄漏
onUnmounted(() => stopAnim());
</script>

<template>
    <div class="snap-start">
        <div
            v-tile-glow
            class="menus-item group flex cursor-pointer items-center rounded-full border transition-[transform,border-color,box-shadow,height,width,padding] duration-[400ms] ease-in-out"
            :class="{
                'h-12 w-12 justify-center p-0': globalStore.navMini,
                'h-14 w-full p-1': !globalStore.navMini,
                'scale-105 border-slate-300 shadow-sm':
                    isActive && !globalStore.navMini,
                'border-transparent': !isActive || globalStore.navMini,
                'hover:scale-105 hover:border-slate-300 hover:shadow-sm':
                    !isActive && !globalStore.navMini,
                'hover:scale-110': globalStore.navMini,
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

                <!-- 有二级菜单：展开/收起指示箭头 -->
                <div
                    v-if="hasChildren"
                    class="flex flex-1 justify-end pr-4"
                >
                    <ChevronRight
                        class="h-3 w-3 text-slate-400 transition-transform duration-300 sm:h-4 sm:w-4"
                        :class="expanded ? 'rotate-90' : ''"
                    />
                </div>

                <!-- 无二级菜单：激活态的滑动箭头 -->
                <div
                    v-else
                    ref="arrowRef"
                    :class="[isActive ? 'flex' : 'hidden']"
                    class="arrow-right flex-1 justify-end pr-4"
                >
                    <ChevronRight class="h-3 w-3 text-slate-400 sm:h-4 sm:w-4" />
                </div>
            </div>
        </div>

        <!-- 二级菜单 -->
        <div
            v-if="hasChildren"
            class="grid transition-[grid-template-rows,opacity] duration-300 ease-in-out"
            :class="
                expanded
                    ? 'grid-rows-[1fr] opacity-100'
                    : 'grid-rows-[0fr] opacity-0'
            "
        >
            <div class="overflow-hidden">
                <div
                    class="flex flex-col gap-1 pt-2"
                    :class="globalStore.navMini ? 'items-center' : 'pl-5'"
                >
                    <div
                        v-for="child in item.children"
                        :key="child.key"
                        :title="child.name"
                        class="group/child flex cursor-pointer items-center rounded-full border transition-all duration-300 ease-in-out"
                        :class="[
                            globalStore.navMini
                                ? 'h-10 w-10 justify-center'
                                : 'h-10 gap-2 px-2 py-1',
                            child.key === globalStore.activeMenuKey
                                ? 'border-slate-300 bg-zx-nav-icon shadow-sm'
                                : 'border-transparent hover:border-slate-300 hover:shadow-sm',
                        ]"
                        @click.stop="handleChildClick(child)"
                    >
                        <div
                            class="flex h-7 w-7 shrink-0 items-center justify-center rounded-full transition-colors duration-300"
                            :class="
                                child.key === globalStore.activeMenuKey
                                    ? 'bg-zx-nav-icon-hover text-[color:var(--zx-nav-icon-hover-text)]'
                                    : 'bg-zx-nav-icon text-slate-600 group-hover/child:bg-zx-nav-icon-hover group-hover/child:text-[color:var(--zx-nav-icon-hover-text)]'
                            "
                        >
                            <component
                                v-if="child.icon"
                                :is="child.icon"
                                class="h-4 w-4"
                            />
                            <span
                                v-else
                                class="h-1.5 w-1.5 rounded-full bg-current"
                            ></span>
                        </div>

                        <span
                            v-if="!globalStore.navMini"
                            class="truncate text-sm text-slate-700"
                        >
                            {{ child.name }}
                        </span>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>
