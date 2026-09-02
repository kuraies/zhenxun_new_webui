<script setup lang="ts">
/**
 * CornerFrame - 游离四角取景框
 *
 * 四个主题色 L 形括号组成的取景框。
 * moveTo(el)：
 *   - 隐藏中：在目标卡上以收缩态出现并展开；
 *   - 可见时：先收起再沿路径滑向目标卡；滑行途中目标变化会就地
 *     重新计算路径（不打断、不瞬移，从当前位置继续飞向新目标）。
 * hide()：对焦盒缩回中心并淡出。
 * 组件自身 fixed 定位用视口坐标，滚动/缩放时跟随目标重定位。
 */
import { onMounted, onUnmounted, ref } from "vue";
import { gsap } from "gsap";

const root = ref<HTMLElement | null>(null);
const focusBox = ref<HTMLElement | null>(null);

// 惯性甩动参数
const MAX_DRIFT = 3;
const EXPAND_MARGIN = 2;
// 括号臂长；收缩态中心空洞与臂等长，总宽 = 臂长 * 3
const BRACKET = 18;
let visible = false;
let traveling = false;
let currentEl: HTMLElement | null = null;
let targetEl: HTMLElement | null = null;
let box = { x: 0, y: 0, w: 0, h: 0 };
let targetX = 0;
let targetY = 0;
let driftX = 0;
let driftY = 0;

const clamp = (v: number, min: number, max: number) =>
    Math.min(max, Math.max(min, v));

// 鼠标运动给框一个冲量，ticker 里做衰减 + 弹簧拉回
const onMouseMove = (e: MouseEvent) => {
    if (!visible) return;
    targetX = clamp(targetX + e.movementX * 0.1, -MAX_DRIFT, MAX_DRIFT);
    targetY = clamp(targetY + e.movementY * 0.1, -MAX_DRIFT, MAX_DRIFT);
};

const onTick = () => {
    const frame = root.value;
    if (!frame) return;
    if (
        Math.abs(targetX) < 0.05 &&
        Math.abs(targetY) < 0.05 &&
        Math.abs(driftX) < 0.05 &&
        Math.abs(driftY) < 0.05
    ) {
        if (driftX !== 0 || driftY !== 0) {
            driftX = 0;
            driftY = 0;
            gsap.set(frame, { x: 0, y: 0 });
        }
        return;
    }
    targetX *= 0.8;
    targetY *= 0.8;
    driftX += (targetX - driftX) * 0.3;
    driftY += (targetY - driftY) * 0.3;
    gsap.set(frame, { x: driftX, y: driftY });
};

// 滚动 / 窗口变化时跟随重定位（滑行途中跳过，避免和滑行补间打架）
const reposition = () => {
    const frame = root.value;
    if (!visible || traveling || !currentEl || !frame) return;
    const rect = currentEl.getBoundingClientRect();
    box = { x: rect.left, y: rect.top, w: rect.width, h: rect.height };
    gsap.set(frame, {
        left: box.x,
        top: box.y,
        width: box.w,
        height: box.h,
    });
};

const tweenFocusBox = (
    inset: number,
    insetY: number,
    duration: number,
    ease: string,
) => {
    const focus = focusBox.value;
    if (!focus) return;
    gsap.to(focus, {
        left: inset,
        top: insetY,
        right: inset,
        bottom: insetY,
        duration,
        ease,
        overwrite: "auto",
    });
};

// 滑行补间：从当前框状态飞向目标卡（重复调用即就地重算路径）
const travelTo = (
    el: HTMLElement,
    dest: { x: number; y: number; w: number; h: number },
    delay = 0,
) => {
    const frame = root.value;
    const focus = focusBox.value;
    if (!frame || !focus) return;
    gsap.killTweensOf(frame, "left,top,width,height");
    gsap.killTweensOf(focus, "left,top,right,bottom");
    gsap.to(frame, {
        left: dest.x,
        top: dest.y,
        width: dest.w,
        height: dest.h,
        duration: 0.26,
        delay,
        ease: "power2.inOut",
        onUpdate: () => {
            const r = frame.getBoundingClientRect();
            box = { x: r.left, y: r.top, w: r.width, h: r.height };
        },
        onComplete: () => {
            // 目标在中途又变了（新滑行已接管）时不落位
            if (targetEl !== el) return;
            traveling = false;
            currentEl = el;
            tweenFocusBox(
                -EXPAND_MARGIN,
                -EXPAND_MARGIN,
                0.25,
                "power3.out",
            );
        },
    });
    gsap.to(focus, {
        left: dest.w / 2 - BRACKET * 1.5,
        top: dest.h / 2 - BRACKET * 1.5,
        right: dest.w / 2 - BRACKET * 1.5,
        bottom: dest.h / 2 - BRACKET * 1.5,
        duration: 0.26,
        delay,
        ease: "power2.inOut",
        overwrite: "auto",
    });
};

const moveTo = (el: HTMLElement) => {
    const frame = root.value;
    const focus = focusBox.value;
    if (!frame || !focus) return;
    if (el === targetEl) return;
    targetEl = el;

    if (!visible) {
        // 隐藏中：在目标卡上以收缩态出现并展开
        traveling = false;
        currentEl = el;
        visible = true;
        const rect = el.getBoundingClientRect();
        box = { x: rect.left, y: rect.top, w: rect.width, h: rect.height };
        gsap.killTweensOf(frame);
        gsap.killTweensOf(focus);
        gsap.set(frame, {
            left: box.x,
            top: box.y,
            width: box.w,
            height: box.h,
        });
        gsap.set(focus, {
            left: box.w / 2 - BRACKET * 1.5,
            top: box.h / 2 - BRACKET * 1.5,
            right: box.w / 2 - BRACKET * 1.5,
            bottom: box.h / 2 - BRACKET * 1.5,
        });
        tweenFocusBox(-EXPAND_MARGIN, -EXPAND_MARGIN, 0.14, "power3.out");
        gsap.to(frame, { opacity: 1, duration: 0.15, overwrite: "auto" });
        return;
    }

    if (traveling) {
        // 滑行途中换目标：就地重新计算路线
        const rect = el.getBoundingClientRect();
        travelTo(el, {
            x: rect.left,
            y: rect.top,
            w: rect.width,
            h: rect.height,
        });
        return;
    }

    // 停留中：先收起再滑过去
    traveling = true;
    tweenFocusBox(box.w / 2 - BRACKET * 1.5, box.h / 2 - BRACKET * 1.5, 0.12, "power2.in");
    const rect = el.getBoundingClientRect();
    travelTo(
        el,
        { x: rect.left, y: rect.top, w: rect.width, h: rect.height },
        0.1,
    );
};

const hide = () => {
    visible = false;
    traveling = false;
    currentEl = null;
    targetEl = null;
    const frame = root.value;
    const focus = focusBox.value;
    if (!frame || !focus) return;
    gsap.killTweensOf(frame, "left,top,width,height");
    gsap.killTweensOf(focus, "left,top,right,bottom");
    // 离开时播放收缩动画：对焦盒缩回中心 + 淡出
    tweenFocusBox(box.w / 2 - BRACKET * 1.5, box.h / 2 - BRACKET * 1.5, 0.15, "power2.in");
    gsap.to(frame, { opacity: 0, duration: 0.2, overwrite: "auto" });
};

onMounted(() => {
    gsap.ticker.add(onTick);
    window.addEventListener("mousemove", onMouseMove);
    // 滚动容器/窗口滚动与缩放时跟随卡片
    window.addEventListener("scroll", reposition, true);
    window.addEventListener("resize", reposition);
});

onUnmounted(() => {
    gsap.ticker.remove(onTick);
    window.removeEventListener("mousemove", onMouseMove);
    window.removeEventListener("scroll", reposition, true);
    window.removeEventListener("resize", reposition);
});

defineExpose({ moveTo, hide });
</script>

<template>
    <div
        ref="root"
        class="pointer-events-none fixed left-0 top-0 z-30 opacity-0"
    >
        <div ref="focusBox" class="absolute">
            <span class="corner-marker corner-tl"></span>
            <span class="corner-marker corner-tr"></span>
            <span class="corner-marker corner-bl"></span>
            <span class="corner-marker corner-br"></span>
        </div>
    </div>
</template>

<style scoped>
.focus-box {
    position: absolute;
    inset: -8px;
}

.corner-marker {
    position: absolute;
    width: 18px;
    height: 18px;
    border: 0 solid var(--zx-color-primary);
    pointer-events: none;
}

.corner-tl {
    left: -8px;
    top: -8px;
    border-left-width: 2px;
    border-top-width: 2px;
    border-top-left-radius: 6px;
}

.corner-tr {
    right: -8px;
    top: -8px;
    border-right-width: 2px;
    border-top-width: 2px;
    border-top-right-radius: 6px;
}

.corner-bl {
    left: -8px;
    bottom: -8px;
    border-left-width: 2px;
    border-bottom-width: 2px;
    border-bottom-left-radius: 6px;
}

.corner-br {
    right: -8px;
    bottom: -8px;
    border-right-width: 2px;
    border-bottom-width: 2px;
    border-bottom-right-radius: 6px;
}
</style>
