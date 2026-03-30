<script setup lang="ts">
import { ref, reactive, onMounted, onUnmounted, useTemplateRef } from "vue";
import { ZXMessageBox, ZXNotification } from "components/index.js";
import { showLocationAddress } from "components/zxcomponent/LocationAddress";
import { throttle } from "@/utils/util";
import { auth } from "@/utils/auth.js";
import { useRouter } from "vue-router";
import { useComponentStore } from "@/store/component.js";
import { authApi } from "@/utils/api-next";
import { gsap } from "gsap";
import ZXInput from "@/components/zxcomponent/ZXInput.vue";

/*
图片导入区
 */

import bg_img from "@/assets/img/title.png";
import poster_img from "@/assets/img/img.png";
import logo_img from "@/assets/img/title.png";

/*
图片导入区结束
 */

const router = useRouter();

const componentStore = useComponentStore();

// 表单数据
const username = ref<string>("");
const password = ref<string>("");

// Refs for template refs (确保类型正确)
const bgRef = useTemplateRef("bgRef")
const imgRef = useTemplateRef("imgRef")
const card = useTemplateRef("card")
const login_card = useTemplateRef("login_card")
const logo = useTemplateRef("logo")
const showLocationButton = useTemplateRef("showLocationButton")

const validate = reactive({
    username: false,
    password: false,
});

const message = reactive({
    username: "",
    password: "",
});

const changeUsername = (_username: string) => {
    if (_username) {
        validate.username = true;
        message.username = "";
    } else {
        validate.username = false;
        message.username = "请输入用户名";
    }
};

const changePassword = (_password: string) => {
    if (_password) {
        validate.password = true;
        message.password = "";
    } else {
        validate.password = false;
        message.password = "请输入密码";
    }
};

const handleSubmitLogin = throttle(() => {
    authApi
        .login({
            username: username.value,
            password: password.value
        })
        .then((axiosRes) => {
            const response = axiosRes as any;
            if (response?.success) {
                if (response?.warning) {
                    ZXNotification({
                        title: "警告＞︿＜",
                        type: "warning",
                        message: response.warning,
                    });
                    return;
                }

                auth.setAuthState(true);

                auth.setAuthToken(
                    response?.data?.token_type,
                    response?.data?.access_token,
                );

                ZXNotification({
                    title: "🥳",
                    type: "success",
                    message: response?.message || "登录成功",
                    confetti: true,
                });

                router.push({ name: "Home" });
            } else {
                ZXNotification({
                    title: "哎呀（；´д｀）ゞ",
                    type: "error",
                    message: response?.message || "登录失败",
                });
            }
        })
        .catch((error: Error) => {
            console.error(error);
            // 显示错误消息
            const axiosError = error as any;
            const message = axiosError.response?.data?.message || "登录失败，请检查网络";
            ZXNotification({
                title: "哎呀（；´д｀）ゞ",
                type: "error",
                message: message,
            });
        });
}, 1000);

const submitLogin = () => {
    changeUsername(username.value);
    changePassword(password.value);
    if (!validate.username || !validate.password) return;
    handleSubmitLogin();
};

const showLocation = () => {
    const activeElement = document.activeElement;
    if (activeElement instanceof HTMLElement) {
        activeElement.blur();
    }
    showLocationAddress({
        bg_visible: false,
    });
};

const showForgetPassword = () => {
    ZXMessageBox({
        title: "活该！！",
        message: "哥哥竟然忘记密码了呢~人家好伤心哦🤣",
        confirmButtonText: "😡",
        confirmButtonHoverText: "🤡",
    });
};

const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === "Enter") {
        if (!componentStore.LocationAddress) submitLogin();
    }
};

onMounted(() => {
    window.addEventListener("keydown", handleKeyDown);

    const el = card.value;
    const el2 = login_card.value;
    const el3 = logo.value;

    useSodaBlast(el, el2, el3).then(() => {
        createParallaxEffect(bgRef.value, {
            depth: 0.8,
            duration: 0.1,
        });
        createParallaxEffect(imgRef.value, {
            xOffset: 10,
            yOffset: 10,
            depth: 0.15,
            duration: 1,
        });
    });
    createSVGConfetti();
});

onUnmounted(() => {
    window.removeEventListener("keydown", handleKeyDown);
});

function useSodaBlast(
    el: HTMLElement | null,
    el2: HTMLElement | null,
    el3: HTMLElement | null,
) {
    const timeline = gsap.timeline();

    const start_scale = 0.3;

    // Step 1: 变小
    timeline.to(el, {
        scale: start_scale,
        duration: 0.1,
        ease: "power1.inOut",
    });

    timeline.to(
        el2,
        {
            scale: 0.5,
            duration: 0.1,
            ease: "power1.inOut",
        },
        "<",
    ); // "<" 表示与前一个动画同时开始

    // Step 2: 喷发（el 和 el2 同时进行）
    timeline.to(el, {
        y: -5,
        scale: 1.09,
        rotation: 0,
        duration: 0.5,
        ease: "power4.out",
    }); // "<" 表示与上一个动画同时开始

    timeline.to(
        el2,
        {
            y: -20,
            scale: 1.1,
            rotation: 0,
            duration: 0.6,
            ease: "power4.out",
        },
        "<",
    ); // "<" 表示与前一个动画同时开始

    timeline.to(
        el3,
        {
            y: -20,
            scale: 1.03,
            rotation: 0,
            duration: 0.6,
            ease: "power4.out",
        },
        "<",
    ); // "<" 表示与前一个动画同时开始

    // Step 3: 回落（el 单独回落）
    timeline.to(el, {
        y: 0,
        scale: 1,
        duration: 0.6,
        ease: "bounce.out",
    });
    timeline.to(
        el2,
        {
            y: 0,
            scale: 1,
            duration: 0.6,
            ease: "bounce.out",
        },
        "<",
    ); // "<" 表示与前一个动画同时开始

    timeline.to(
        el3,
        {
            y: 0,
            scale: 1,
            duration: 0.6,
            ease: "bounce.out",
            delay: 0.1,
        },
        "<",
    ); // "<" 表示与前一个动画同时开始

    return timeline;
}

function createSVGConfetti() {
    const container = document.createElement("div");
    container.style.position = "fixed";
    container.style.top = "0";
    container.style.left = "0";
    container.style.width = "100%";
    container.style.height = "100%";
    container.style.pointerEvents = "none";
    container.style.zIndex = "0";
    document.body.appendChild(container);

    // 创建彩条元素
    const colors = [
        "#ff0000",
        "#00ff00",
        "#0000ff",
        "#ffff00",
        "#ff00ff",
        "#00ffff",
    ];
    const count = 100; // 彩条数量

    for (let i = 0; i < count; i++) {
        const confetti = document.createElement("div");
        confetti.style.position = "absolute";
        confetti.style.width = "10px";
        confetti.style.height = "30px";
        confetti.style.backgroundColor =
            colors[Math.floor(Math.random() * colors.length)];
        confetti.style.left = "50%";
        confetti.style.top = "50%";
        confetti.style.transformOrigin = "center center";
        confetti.style.transform = "translate(-50%, -50%)";
        confetti.style.borderRadius = "2px";
        container.appendChild(confetti);

        // 动画设置
        const angle = Math.random() * Math.PI * 2;
        const distance = 100 + Math.random() * 1000;
        const duration = 1 + Math.random() * 2;

        gsap.to(confetti, {
            x: Math.cos(angle) * distance,
            y: Math.sin(angle) * distance,
            rotation: Math.random() * 360,
            opacity: 0,
            duration: duration,
            ease: "power2.out",
            onComplete: () => {
                container.removeChild(confetti);
                if (container.children.length === 0) {
                    document.body.removeChild(container);
                }
            },
        });
    }
}

function createParallaxEffect(
    element: HTMLElement | null,
    options: {
        xOffset?: number
        yOffset?: number
        depth?: number
        easing?: string
        duration?: number
        throttleTime?: number
    } = {}
): () => void {
    const el = element
    if (!el) return () => {}

    const {
        xOffset = 200,
        yOffset = 200,
        depth = 0.5,
        easing = 'power2.out',
        duration = 1.0,
        throttleTime = 16,
    } = options

    let throttleTimeout: number | null = null

    const throttler = (func: (e: MouseEvent) => void, limit: number) => {
        return (e: MouseEvent) => {
            if (!throttleTimeout) {
                throttleTimeout = window.setTimeout(() => {
                    func(e)
                    throttleTimeout = null
                }, limit) as unknown as number
            }
        }
    }

    const handleMouseMove = (e: MouseEvent) => {
        const rect = el.getBoundingClientRect()
        const centerX = rect.left + rect.width / 2
        const centerY = rect.top + rect.height / 2

        const relX = (e.clientX - centerX) / (rect.width / 2)
        const relY = (e.clientY - centerY) / (rect.height / 2)

        const targetX = -relX * xOffset * depth
        const targetY = -relY * yOffset * depth

        gsap.to(el, { x: targetX, y: targetY, ease: easing, duration: duration, overwrite: true })
    }

    const throttledHandleMouseMove = throttler(handleMouseMove, throttleTime)
    window.addEventListener('mousemove', throttledHandleMouseMove)

    return () => {
        window.removeEventListener('mousemove', throttledHandleMouseMove)
        gsap.killTweensOf(el)
        gsap.set(el, { x: 0, y: 0 })
    }
}


function handleHoverShowLocation(): gsap.core.Timeline {
    const el = showLocationButton.value
    if (!el) return gsap.timeline()

    const tl = gsap.timeline({
        paused: true,
        repeat: 1,
        onComplete: function () {
            gsap.to(el, { rotation: 0, duration: 0.2 })
        }
    })

    tl.to(el, { rotation: 4, duration: 0.1 }).to(el, { rotation: -4, duration: 0.1 })
    return tl.restart()
}
</script>

<template>
    <div
        class="flex h-screen items-center justify-center bg-[#fefefe] select-none"
    >
        <div
            ref="card"
            class="login-card roof relative z-1 flex h-160 w-260 rounded-2xl border-8 border-white bg-transparent shadow-[0_0_16px_rgba(30,30,30,0.5)] after:content-[''] max-sm:h-screen max-sm:bg-pink-100 sm:m-10"
        >
            <div
                class="backdrop pointer-events-none h-full overflow-hidden rounded-l-2xl bg-white max-md:hidden max-sm:hidden"
            >
                <div
                    class="flex h-full w-full flex-col justify-center bg-white"
                >
                    <svg
                        height="100%"
                        style="position: absolute"
                        width="100%"
                        x="0"
                        y="0"
                    >
                        <filter
                            id="remove-white"
                            height="100%"
                            width="100%"
                            x="0"
                            y="0"
                        >
                            <feColorMatrix
                                type="matrix"
                                values="
                1 0 0 0 0
                0 1 0 0 0
                0 0 1 0 0
                -1 -1 -1 1 1"
                            />
                        </filter>
                    </svg>
                    <img
                        ref="imgRef"
                        :src="poster_img"
                        alt=""
                        class="h-full w-100 object-cover object-center filter-[url(#remove-white)]"
                    />
                </div>
            </div>
            <div
                class="right-area z-2 flex flex-1 flex-col rounded-r-2xl py-6 backdrop-blur-xl max-sm:pb-0"
            >
                <div class="location mx-6 ml-auto max-sm:mb-20">
                    <button
                        ref="showLocationButton"
                        class="flex cursor-pointer items-center rounded-2xl border border-transparent bg-white px-4 py-2 text-center text-xs text-slate-800 shadow-sm hover:shadow-md focus:outline-none disabled:pointer-events-none disabled:opacity-50 disabled:shadow-none"
                        type="button"
                        @click="showLocation"
                        @mouseenter="handleHoverShowLocation"
                    >
                        <svg
                            class="mr-1 size-5"
                            fill="currentColor"
                            viewBox="0 0 24 24"
                            xmlns="http://www.w3.org/2000/svg"
                        >
                            <path
                                clip-rule="evenodd"
                                d="M11.078 2.25c-.917 0-1.699.663-1.85 1.567L9.05 4.889c-.02.12-.115.26-.297.348a7.493 7.493 0 0 0-.986.57c-.166.115-.334.126-.45.083L6.3 5.508a1.875 1.875 0 0 0-2.282.819l-.922 1.597a1.875 1.875 0 0 0 .432 2.385l.84.692c.095.078.17.229.154.43a7.598 7.598 0 0 0 0 1.139c.015.2-.059.352-.153.43l-.841.692a1.875 1.875 0 0 0-.432 2.385l.922 1.597a1.875 1.875 0 0 0 2.282.818l1.019-.382c.115-.043.283-.031.45.082.312.214.641.405.985.57.182.088.277.228.297.35l.178 1.071c.151.904.933 1.567 1.85 1.567h1.844c.916 0 1.699-.663 1.85-1.567l.178-1.072c.02-.12.114-.26.297-.349.344-.165.673-.356.985-.57.167-.114.335-.125.45-.082l1.02.382a1.875 1.875 0 0 0 2.28-.819l.923-1.597a1.875 1.875 0 0 0-.432-2.385l-.84-.692c-.095-.078-.17-.229-.154-.43a7.614 7.614 0 0 0 0-1.139c-.016-.2.059-.352.153-.43l.84-.692c.708-.582.891-1.59.433-2.385l-.922-1.597a1.875 1.875 0 0 0-2.282-.818l-1.02.382c-.114.043-.282.031-.449-.083a7.49 7.49 0 0 0-.985-.57c-.183-.087-.277-.227-.297-.348l-.179-1.072a1.875 1.875 0 0 0-1.85-1.567h-1.843ZM12 15.75a3.75 3.75 0 1 0 0-7.5 3.75 3.75 0 0 0 0 7.5Z"
                                fill-rule="evenodd"
                            />
                        </svg>
                        地址设置
                    </button>
                </div>
                <div
                    ref="logo"
                    class="title mb-4 flex justify-center text-3xl font-bold text-slate-800"
                >
                    <img
                        :src="logo_img"
                        alt=""
                        class="max-w-100 min-w-70 sm:w-70"
                    />
                </div>
                <div
                    ref="login_card"
                    class="login relative mx-30 mb-8 flex-1 space-y-10 rounded-2xl px-8 pt-12 text-sm text-gray-700 shadow-sm before:absolute before:inset-0 before:-z-10 before:rounded-2xl before:bg-white before:bg-cover before:bg-center before:content-[''] max-sm:m-0 max-sm:px-10"
                >
                    <div class="user space-y-2">
                        <div class="title font-bold">用户名</div>
                        <div class="relative w-full min-w-60">
                            <ZXInput
                                v-model="username"
                                :message="message.username"
                                placeholder="请输入用户名"
                                @blur="changeUsername(username)"
                            />
                        </div>
                    </div>
                    <div class="password space-y-2">
                        <div class="title font-bold">密码</div>
                        <div class="relative w-full min-w-[200px]">
                            <ZXInput
                                v-model="password"
                                type="password"
                                :message="message.password"
                                placeholder="请输入密码"
                                @blur="changePassword(password)"
                            />
                        </div>
                    </div>
                    <div class="login-button mb-6">
                        <button
                            class="w-full cursor-pointer items-center rounded-2xl border border-transparent bg-slate-800 px-4 py-2 text-center text-lg font-bold text-white shadow-sm transition-all hover:bg-slate-700 hover:shadow-md disabled:pointer-events-none disabled:opacity-50 disabled:shadow-none"
                            type="button"
                            @click="submitLogin"
                        >
                            登录
                        </button>
                    </div>
                    <div class="forget text-right font-light">
                        <span
                            class="cursor-pointer text-blue-600 hover:text-blue-400"
                            @click="showForgetPassword"
                            >忘记密码？</span
                        >
                    </div>
                </div>
            </div>
        </div>
        <svg
            class="absolute"
            height="150"
            viewBox="0 0 300 150"
            width="300"
            xmlns="http://www.w3.org/2000/svg"
        >
            <defs>
                <filter id="noiseFilter" color-interpolation-filters="sRGB">
                    <!-- 基础噪点生成 -->
                    <feTurbulence
                        baseFrequency="0.65"
                        numOctaves="3"
                        result="turbulence"
                        stitchTiles="stitch"
                        type="fractalNoise"
                    />

                    <!-- 颜色调整 -->
                    <feColorMatrix
                        result="coloredNoise"
                        type="matrix"
                        values="0 0 0 0 0.5
                0 0 0 0 0.5
                0 0 0 0 0.5
                0 0 0 0.2 0"
                    />

                    <!-- 对比度增强 -->
                    <feComponentTransfer result="contrastNoise">
                        <feFuncR intercept="-0.5" slope="2" type="linear" />
                        <feFuncG intercept="-0.5" slope="2" type="linear" />
                        <feFuncB intercept="-0.5" slope="2" type="linear" />
                    </feComponentTransfer>

                    <!-- 与原图混合 -->
                    <feBlend
                        in="SourceGraphic"
                        in2="contrastNoise"
                        mode="multiply"
                    />
                </filter>
            </defs>
        </svg>
        <div
            class="bg absolute -z-0 flex h-full w-full flex-col items-center justify-center overflow-hidden bg-gradient-to-br from-white/20 via-white/8 to-white/3 [filter:url(#noiseFilter)]"
        >
            <!--            -->
            <!--            <div-->
            <!--                class="bg absolute -z-0 flex h-full w-full flex-col items-center justify-center overflow-hidden"-->
            <!--            >-->
            <img
                ref="bgRef"
                :src="bg_img"
                alt=""
                class="w-full blur-3xl transition-transform duration-1000 ease-linear"
            />
            <!--            -->
        </div>
    </div>
</template>

<style scoped></style>
