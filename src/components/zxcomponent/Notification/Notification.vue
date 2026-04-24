<template>
    <Teleport to="body">
        <div
            v-for="(list, position) in groupedNotifications"
            :key="position"
            :class="['fixed z-9999', position]"
        >
            <TransitionGroup
                tag="div"
                class="space-y-4"
                @before-enter="onBeforeEnter"
                @enter="onEnter"
            >
                <div
                    v-for="(item, index) in list"
                    :key="item.id"
                    :data-index="index"
                    :data-notification-id="item.id"
                    :class="[
                        'min-h-20 min-w-80 rounded-xl bg-white px-4 py-4 shadow-sm',
                        item.type,
                        item.customClass,
                    ]"
                    @mouseenter="pauseTimer(item)"
                    @mouseleave="resumeTimer(item)"
                >
                    <div class="relative flex">
                        <div class="logo">
                            <!--info-->
                            <div v-if="item.type === 'info'">
                                <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    stroke-width="1.5"
                                    stroke="currentColor"
                                    class="size-6 text-slate-500"
                                >
                                    <path
                                        stroke-linecap="round"
                                        stroke-linejoin="round"
                                        d="m11.25 11.25.041-.02a.75.75 0 0 1 1.063.852l-.708 2.836a.75.75 0 0 0 1.063.853l.041-.021M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9-3.75h.008v.008H12V8.25Z"
                                    />
                                </svg>
                            </div>
                            <!--warning-->
                            <div v-else-if="item.type === 'warning'">
                                <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    stroke-width="1.5"
                                    stroke="currentColor"
                                    class="size-6 text-orange-500"
                                >
                                    <path
                                        stroke-linecap="round"
                                        stroke-linejoin="round"
                                        d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z"
                                    />
                                </svg>
                            </div>
                            <!--success-->
                            <div v-else-if="item.type === 'success'">
                                <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    stroke-width="1.5"
                                    stroke="currentColor"
                                    class="size-6 text-green-500"
                                >
                                    <path
                                        stroke-linecap="round"
                                        stroke-linejoin="round"
                                        d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
                                    />
                                </svg>
                            </div>
                            <!--error-->

                            <div v-else-if="item.type === 'error'">
                                <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    stroke-width="1.5"
                                    stroke="currentColor"
                                    class="size-6 text-red-500"
                                >
                                    <path
                                        stroke-linecap="round"
                                        stroke-linejoin="round"
                                        d="m9.75 9.75 4.5 4.5m0-4.5-4.5 4.5M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
                                    />
                                </svg>
                            </div>
                            <!--custom-->
                            <div v-else>
                                {{ item.type }}
                            </div>
                        </div>
                        <div class="content w-full pl-2">
                            <div class="notification-header">
                                <strong v-if="item.title" class="title">{{
                                    item.title
                                }}</strong>
                            </div>
                            <div
                                class="message mt-2 text-sm"
                                :class="item.contentClass"
                            >
                                {{ item.message }}
                            </div>
                            <div
                                class="absolute top-0 right-0 cursor-pointer text-gray-400"
                                @click="manualClose(item)"
                            >
                                <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    stroke-width="1.5"
                                    stroke="currentColor"
                                    class="size-4"
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
                </div>
            </TransitionGroup>
        </div>
    </Teleport>
</template>

<script setup>
import { computed, ref } from "vue";
import gsap from "gsap";
import { ZXConfetti } from "components/zxcomponent/Confetti/index.ts";

const MAX_PER_POSITION = 99;
const notifications = ref([]);
const timers = new Map();

// 分组通知（按位置）
const groupedNotifications = computed(() => {
    const groups = {};
    for (const n of notifications.value) {
        if (!groups[n.position]) groups[n.position] = [];
        groups[n.position].push(n);
    }
    return groups;
});

// 暴露方法供外部调用
function addNotification(config) {
    const id = Date.now() + Math.random();
    const {
        title = "",
        message = "",
        type = "info",
        duration = 3000,
        position = "top-center",
        onClose,
        customClass = "",
        contentClass = "text-gray-500",
        confetti = false,
    } = config;

    const list = notifications.value.filter((n) => n.position === position);
    if (list.length >= MAX_PER_POSITION) {
        const first = list[0];
        removeNotification(first.id, first.onClose);
    }

    const notification = {
        id,
        title,
        message,
        type,
        position,
        onClose,
        customClass,
        contentClass,
        duration,
        remaining: duration,
        createdAt: Date.now(),
        confetti,
    };

    notifications.value.push(notification);

    nextTick(() => {
        if (confetti) {
            const el = document.querySelector(`[data-notification-id="${id}"]`);
            if (el) {
                const confettiConfig =
                    typeof confetti === "boolean" ? {} : confetti;
                ZXConfetti.atElement(el, confettiConfig);
            }
        }
    });

    if (duration > 0) {
        startTimer(notification);
    }
}

defineExpose({ addNotification });

// 手动移除项目
const removeItem = async (item) => {
    // 1. 找到对应的DOM元素
    const el = document.querySelector(`[key="${item.id}"]`);

    // 2. 执行离开动画
    await animateOut(el);
};

// 封装动画为Promise
const animateOut = (el) => {
    return new Promise((resolve) => {
        gsap.to(el, {
            opacity: 0,
            y: -20,
            duration: 0.3,
            onComplete: resolve,
        });
    });
};

// 手动关闭
function manualClose(item) {
    // removeItem(item)
    removeNotification(item.id, item.onClose);
}

// 移除通知
function removeNotification(id, onClose) {
    const notificationEl = document.querySelector(
        `[data-notification-id="${id}"]`,
    );

    if (notificationEl) {
        const position = notificationEl
            .closest('[class*="top-"], [class*="bottom-"]')
            .className.split(" ")
            .find((c) => c.includes("top-") || c.includes("bottom-"));

        let animationProps = {};
        if (position.includes("top-")) {
            animationProps = { opacity: 0, y: -20 };
        } else {
            animationProps = { opacity: 0, y: 20 };
        }

        gsap.to(notificationEl, {
            ...animationProps,
            duration: 0.1,
            onComplete: () => {
                notifications.value = notifications.value.filter(
                    (n) => n.id !== id,
                );
                timers.delete(id);
                if (onClose) onClose();
            },
        });
    } else {
        notifications.value = notifications.value.filter((n) => n.id !== id);
        timers.delete(id);
        if (onClose) onClose();
    }
}

// 启动计时器
function startTimer(item) {
    const id = item.id;
    const start = Date.now();
    const timer = setTimeout(() => {
        removeNotification(id, item.onClose);
    }, item.remaining);

    timers.set(id, {
        timer,
        start,
    });
}

// 鼠标悬停时暂停
function pauseTimer(item) {
    const t = timers.get(item.id);
    if (!t) return;
    clearTimeout(t.timer);
    item.remaining -= Date.now() - t.start;
}

// 鼠标移开时继续
function resumeTimer(item) {
    startTimer(item);
}

// ✅ GSAP 动画
function onBeforeEnter(el) {
    // 更安全的方式查找位置容器
    const positionContainer = el.closest(
        ".top-center, .top-right, .top-left, .bottom-center, .bottom-right, .bottom-left",
    );

    if (positionContainer) {
        const positionClass = Array.from(positionContainer.classList).find(
            (cls) => cls.startsWith("top-") || cls.startsWith("bottom-"),
        );

        if (positionClass) {
            gsap.set(el, {
                opacity: 0,
                y: positionClass.startsWith("top-") ? -20 : 20,
            });
            return;
        }
    }

    // 默认设置（如果找不到位置容器或位置类）
    gsap.set(el, { opacity: 0, y: -20 });
}

function onEnter(el, done) {
    const position = el.parentElement.classList[1];
    switch (position) {
        case "top-center":
        case "top-right":
        case "top-left":
            gsap.to(el, {
                opacity: 1,
                y: 0,
                duration: 0.35,
                ease: "power2.out",
                onComplete: done,
            });
            break;
        case "bottom-center":
        case "bottom-right":
        case "bottom-left":
            gsap.to(el, {
                opacity: 1,
                y: 0,
                duration: 0.35,
                ease: "power2.out",
                onComplete: done,
            });
            break;
        default:
            gsap.to(el, {
                opacity: 1,
                y: 0,
                duration: 0.35,
                ease: "power2.out",
                onComplete: done,
            });
    }
}
</script>

<style scoped>
.top-center {
    top: 20px;
    left: 50%;
    transform: translateX(-50%);
}

.top-right {
    top: 20px;
    right: 20px;
}

.top-left {
    top: 20px;
    left: 20px;
}

.bottom-center {
    bottom: 20px;
    left: 50%;
    transform: translateX(-50%);
}

.bottom-left {
    bottom: 20px;
    left: 20px;
}

.bottom-right {
    bottom: 20px;
    right: 20px;
}

.notification-item {
    background-color: #fff;
    border-radius: 4px;

    box-shadow: 0 2px 12px rgba(0, 0, 0, 0.15);
    min-width: 280px;
    max-width: 400px;
    pointer-events: auto;
    opacity: 0.95;
    animation: slide-down 0.3s ease;
    position: relative;
    overflow: hidden;
    box-sizing: border-box;
}
</style>
