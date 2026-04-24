<template>
    <div
        v-show="visible"
        class="ws-root"
        :style="{ background: bgColor, zIndex: z_index }"
    >
        <div class="ws-content">
            <!-- 🔴 ERROR 状态 -->
            <template v-if="mode === 'error'">
                <div class="logo">ZHEN&nbsp;XUN</div>
                <div class="title">未检测到协议端</div>
                <div class="subtitle">连接终止</div>
                <div class="desc">请你接入协议端，连接取消，拒绝登入系统。</div>

                <div class="btn" @click="handleClose">返回</div>
            </template>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref } from "vue";
import { gsap } from "gsap";

const visible = ref(false);
const bgColor = ref("#fff");
const z_index = ref(999);
const mode = ref<"normal" | "error">("normal");

let resolveFn: (() => void) | null = null;

const show = (
    options = {
        color: "",
        mode: "",
    },
) => {
    const { color = "#fff", mode: m = "normal" } = options;

    const isFirstShow = !visible.value;

    bgColor.value = color;
    mode.value = m as "error" | "normal";
    visible.value = true;
    z_index.value = 99999;

    return new Promise<void>((resolve) => {
        resolveFn = resolve;

        // 🟢 普通模式：右 → 左
        if (m === "normal") {
            gsap.fromTo(
                ".ws-root",
                { x: "100%" },
                {
                    x: "0%",
                    duration: 0.45,
                    ease: "power4.inOut",
                    onComplete: resolve,
                },
            );
        }

        // 🔴 ERROR：中心扩散
        else if (m === "error") {
        }
    });
};

const hide = () => {
    return new Promise<void>((resolve) => {
        gsap.to(".ws-root", {
            x: "-100%",
            duration: 0.6,
            ease: "power3.inOut",
            onComplete: () => {
                visible.value = false;
                resolve();
                resolveFn?.();
                resolveFn = null;
            },
        });
    });
};

const handleClose = async () => {
    await hide();
};

defineExpose({
    show,
    hide,
});
</script>

<style scoped>
.ws-root {
    position: fixed;
    inset: 0;
    z-index: 999;
    display: flex;
    align-items: center;
    justify-content: center;
    user-select: none;
}

.ws-content {
    text-align: center;
    color: #fff;
    /*font-family: sans-serif;*/
    font-family: "黑体", serif;
}

.logo {
    color: white;
    font-family: "Arial Black", Gadget, sans-serif; /* 找一个粗壮的字体 */
    font-size: clamp(4rem, 15vw, 10rem);
    font-weight: 900;
    text-transform: uppercase;
    letter-spacing: -5px;

    /* 关键 1：透视变形 */
    /*transform: skew(20deg) scaleY(1.1);*/

    transform-origin: bottom center;
    animation: logoSwing 1s infinite;

    /* 关键 2：3D 挤压阴影 */
    /* 原理：向右下方每隔 1px 绘制一层红色阴影，最后加一层深色阴影增加立体感 */
    text-shadow:
        -1px 1px 0 #d71920,
        -2px 2px 0 #d71920,
        -3px 3px 0 #d71920,
        -4px 4px 0 #d71920,
        -5px 5px 0 #d71920,
        -6px 6px 0 #d71920,
        -7px 7px 0 #d71920,
        -8px 8px 0 #d71920,
        -9px 9px 0 #d71920,
        -10px 10px 0 #d71920,
        -11px 11px 2px rgba(0, 0, 0, 0.3); /* 最后的淡淡投影 */
}

@keyframes logoSwing {
    0% {
        transform: skew(20deg) scaleY(1.1);
    }

    25% {
        transform: skew(30deg) scaleY(1.3); /* 向上拉伸 */
    }

    50% {
        transform: skew(-00deg) scaleY(1.1); /* 切换到右倾 */
    }

    75% {
        transform: skew(-30deg) scaleY(1.3); /* 再拉伸 */
    }

    100% {
        transform: skew(20deg) scaleY(1.1); /* 回到起点 */
    }
}

.title {
    font-size: clamp(2rem, 5vw, 4rem);
    font-weight: bold;
    margin-bottom: 20px;
}

.subtitle {
    font-size: clamp(1.2rem, 3vw, 2.5rem);
    /*margin-bottom: 10px;*/
}

.desc {
    font-size: clamp(1rem, 2vw, 1.4rem);
    /*opacity: 0.85;*/
    margin-bottom: 40px;
}

.btn {
    display: inline-block;
    padding: clamp(10px, 1.5vw, 14px) clamp(30px, 4vw, 56px);
    border: 2px solid rgba(255, 255, 255, 0.6);
    font-size: clamp(1rem, 2vw, 1.2rem);
    /*border-radius: 6px;*/
    cursor: pointer;
    transition: 0.2s;
}

.btn:hover {
    background: rgba(255, 255, 255, 0.1);
}
</style>
