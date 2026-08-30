<script setup lang="ts">
/**
 * 调试客户端登录页：复刻主站登录页（Login.vue）的视觉设计
 * （烟雾背景 + 白边卡片 + logo + 白色表单卡），仅登录逻辑换成
 * 调试端自己的精简 API 客户端，并增加可折叠的后端地址设置。
 */
import { reactive, ref } from "vue";
import { ChevronDown, Server } from "lucide-vue-next";
import ZXInput from "@/components/zxcomponent/ZXInput.vue";
import ZXNotification from "@/components/zxcomponent/Notification";
import logo_img from "@/assets/img/title.png";
import { poster_img } from "@/utils/poster";
import {
    authApi,
    formatToken,
    setBaseApiUrl,
    setPort,
    setToken,
    updateApiBaseUrl,
} from "./api";

const emit = defineEmits<{ success: [] }>();

const username = ref("");
const password = ref("");
const loading = ref(false);

// 后端设置（同域部署时保持默认即可）
const backendOpen = ref(false);
const backendUrl = ref(
    localStorage.getItem("url") ||
        `${window.location.protocol}//${window.location.hostname}`,
);
const backendPort = ref(localStorage.getItem("port") || "8080");

const validate = reactive({
    username: false,
    password: false,
});

const message = reactive({
    username: "",
    password: "",
});

// 窄窗口（独立应用窗口）里海报图不渲染，兜底放行卡片显示
const img_loaded = ref(false);
setTimeout(() => (img_loaded.value = true), 600);

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

const submitLogin = async () => {
    changeUsername(username.value);
    changePassword(password.value);
    if (!validate.username || !validate.password || loading.value) return;

    loading.value = true;
    try {
        setBaseApiUrl(backendUrl.value.trim());
        setPort(backendPort.value.trim());
        updateApiBaseUrl();

        const res: any = await authApi.login({
            username: username.value.trim(),
            password: password.value,
        });
        const login = res?.data;
        if (!res?.success || !login?.access_token) {
            if (res?.warning) {
                ZXNotification({
                    title: "警告＞︿＜",
                    type: "warning",
                    message: res.warning,
                });
                return;
            }
            throw { response: { data: res } };
        }
        setToken(formatToken(login.token_type, login.access_token));
        ZXNotification({
            title: "🥳",
            type: "success",
            message: res?.message || "登录成功",
        });
        emit("success");
    } catch (err: any) {
        ZXNotification({
            title: "哎呀（；´д｀）ゞ",
            type: "error",
            message:
                err?.response?.data?.message ||
                err?.message ||
                "登录失败，请检查网络或后端地址",
        });
    } finally {
        loading.value = false;
    }
};
</script>

<template>
    <div
        class="flex h-screen items-center justify-center bg-zx-bg select-none"
    >
        <div
            v-show="img_loaded"
            class="login-card roof relative z-1 flex h-160 w-260 rounded-3xl border-8 border-white bg-transparent shadow-[0_0_16px_rgba(30,30,30,0.5)] after:content-[''] max-sm:h-screen max-sm:w-full max-sm:bg-pink-100 sm:m-10"
        >
            <div
                v-if="poster_img"
                class="backdrop pointer-events-none h-full overflow-hidden bg-white max-md:hidden max-sm:hidden"
            >
                <div
                    class="flex h-full w-full flex-col justify-center bg-white"
                >
                    <img
                        :src="poster_img"
                        alt=""
                        class="h-full w-100 object-cover object-center"
                        @load="img_loaded = true"
                    />
                </div>
            </div>
            <div
                class="right-area z-2 flex flex-1 flex-col justify-center rounded-r-2xl py-6 backdrop-blur-xl max-sm:pb-0"
            >
                <div
                    class="title mb-4 flex justify-center text-3xl font-bold text-slate-800"
                >
                    <img
                        :src="logo_img"
                        alt=""
                        class="max-w-100 min-w-70 sm:w-70"
                    />
                </div>
                <div
                    class="login mx-30 flex flex-col space-y-8 rounded-3xl bg-white px-8 pt-12 pb-6 text-sm text-gray-700 shadow-sm max-sm:m-2 max-sm:px-10"
                >
                    <div class="user space-y-2">
                        <div class="title font-bold">用户名</div>
                        <div class="relative w-full min-w-60">
                            <ZXInput
                                v-model="username"
                                :message="message.username"
                                placeholder="请输入用户名"
                                @blur="changeUsername(username)"
                                @keydown.enter.prevent="submitLogin"
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
                                @keydown.enter.prevent="submitLogin"
                            />
                        </div>
                    </div>
                    <div class="backend space-y-2">
                        <button
                            class="flex cursor-pointer items-center gap-1 text-sm text-blue-500 transition-colors hover:text-blue-400 focus:outline-none"
                            type="button"
                            @click="backendOpen = !backendOpen"
                        >
                            <Server class="size-4" />
                            后端设置
                            <ChevronDown
                                class="size-4 transition-transform"
                                :class="backendOpen ? 'rotate-180' : ''"
                            />
                        </button>
                        <div v-if="backendOpen" class="flex gap-3">
                            <div class="relative min-w-0 flex-1">
                                <ZXInput
                                    v-model="backendUrl"
                                    placeholder="http://127.0.0.1"
                                />
                            </div>
                            <div class="relative w-26 shrink-0">
                                <ZXInput
                                    v-model="backendPort"
                                    placeholder="8080"
                                />
                            </div>
                        </div>
                        <p class="text-xs text-slate-400">
                            与主站同域部署时保持默认即可
                        </p>
                    </div>
                    <div class="login-button mb-6">
                        <button
                            :disabled="loading"
                            class="w-full cursor-pointer items-center rounded-2xl border border-transparent bg-slate-800 px-4 py-2 text-center text-lg font-bold text-white shadow-sm transition-all hover:bg-slate-700 hover:shadow-md disabled:pointer-events-none disabled:opacity-50 disabled:shadow-none"
                            type="button"
                            @click="submitLogin"
                        >
                            {{ loading ? "正在登录" : "登录" }}
                        </button>
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
                    <feTurbulence
                        baseFrequency="0.65"
                        numOctaves="3"
                        result="turbulence"
                        stitchTiles="stitch"
                        type="fractalNoise"
                    />
                    <feColorMatrix
                        result="coloredNoise"
                        type="matrix"
                        values="0 0 0 0 0.5
                0 0 0 0 0.5
                0 0 0 0 0.5
                0 0 0 0.2 0"
                    />
                    <feComponentTransfer result="contrastNoise">
                        <feFuncR intercept="-0.5" slope="2" type="linear" />
                        <feFuncG intercept="-0.5" slope="2" type="linear" />
                        <feFuncB intercept="-0.5" slope="2" type="linear" />
                    </feComponentTransfer>
                    <feBlend
                        in="SourceGraphic"
                        in2="contrastNoise"
                        mode="multiply"
                    />
                </filter>
            </defs>
        </svg>
        <div
            class="bg absolute -z-0 h-full w-full overflow-hidden bg-gradient-to-br from-white/20 via-white/8 to-white/3 [filter:url(#noiseFilter)]"
        >
            <!-- 粉色烟雾背景 -->
            <div ref="bgRef" class="absolute inset-[-12%]">
                <div class="smoke smoke-1"></div>
                <div class="smoke smoke-2"></div>
                <div class="smoke smoke-3"></div>
                <div class="smoke smoke-4"></div>
                <div class="smoke smoke-5"></div>
            </div>
        </div>
    </div>
</template>

<style scoped>
/* 粉色烟雾:多个大尺寸模糊径向渐变色块缓慢漂浮（与主站登录页同款） */
.smoke {
    position: absolute;
    border-radius: 9999px;
    filter: blur(90px);
    pointer-events: none;
    animation-timing-function: ease-in-out;
    animation-iteration-count: infinite;
    animation-direction: alternate;
}

.smoke-1 {
    top: -18vmax;
    left: -14vmax;
    width: 55vmax;
    height: 55vmax;
    background: radial-gradient(
        circle,
        rgb(244 114 182 / 0.75),
        transparent 71%
    );
    animation-name: smoke-drift-1;
    animation-duration: 24s;
}

.smoke-2 {
    top: -12vmax;
    right: -16vmax;
    width: 48vmax;
    height: 48vmax;
    background: radial-gradient(
        circle,
        rgb(249 168 212 / 0.8),
        transparent 71%
    );
    animation-name: smoke-drift-2;
    animation-duration: 32s;
}

.smoke-3 {
    bottom: -30vmax;
    left: 14vw;
    width: 62vmax;
    height: 62vmax;
    background: radial-gradient(
        circle,
        rgb(236 72 153 / 0.5),
        transparent 73%
    );
    animation-name: smoke-drift-3;
    animation-duration: 28s;
}

.smoke-4 {
    right: 4vw;
    bottom: -18vmax;
    width: 42vmax;
    height: 42vmax;
    background: radial-gradient(
        circle,
        rgb(219 39 119 / 0.42),
        transparent 73%
    );
    animation-name: smoke-drift-4;
    animation-duration: 36s;
}

.smoke-5 {
    top: 24vh;
    left: 36vw;
    width: 34vmax;
    height: 34vmax;
    background: radial-gradient(
        circle,
        rgb(251 207 232 / 0.82),
        transparent 73%
    );
    animation-name: smoke-drift-5;
    animation-duration: 20s;
}

@keyframes smoke-drift-1 {
    from {
        transform: translate(0, 0) scale(1) rotate(0deg);
    }
    to {
        transform: translate(5vw, 4vh) scale(1.18) rotate(12deg);
    }
}

@keyframes smoke-drift-2 {
    from {
        transform: translate(0, 0) scale(1.1);
    }
    to {
        transform: translate(-6vw, 5vh) scale(0.92);
    }
}

@keyframes smoke-drift-3 {
    from {
        transform: translate(0, 0) scale(1) rotate(0deg);
    }
    to {
        transform: translate(4vw, -5vh) scale(1.15) rotate(-10deg);
    }
}

@keyframes smoke-drift-4 {
    from {
        transform: translate(0, 0) scale(0.95);
    }
    to {
        transform: translate(-5vw, -3vh) scale(1.2);
    }
}

@keyframes smoke-drift-5 {
    from {
        transform: translate(0, 0) scale(1);
    }
    to {
        transform: translate(3vw, -4vh) scale(1.25);
    }
}

@media (prefers-reduced-motion: reduce) {
    .smoke {
        animation: none;
    }
}
</style>
