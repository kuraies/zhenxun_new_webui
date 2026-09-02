<script setup lang="ts">
import { onMounted, ref } from "vue";
import { AppWindow, Loader2 } from "lucide-vue-next";
import LoginView from "./LoginView.vue";
import DebugPage from "./DebugPage.vue";
import {
    authApi,
    getToken,
    setUnauthorizedHandler,
    updateApiBaseUrl,
} from "./api";

type Phase = "checking" | "login" | "ready";

const phase = ref<Phase>("checking");

// 仅在"由主站脚本打开的弹窗"里显示：转为普通标签页后弹窗自关。
// 直接在地址栏打开（opener 为空）时没有转的必要
const canReturnToTab = !!window.opener && !window.opener.closed;

const returnToTab = () => {
    // 无特性参数的 window.open = 普通浏览器标签页（带标签栏和地址栏）
    window.open(window.location.href, "_blank");
    // 本窗口由主站脚本打开，允许脚本自关；直接打开的场景关不掉也无妨
    window.close();
};

setUnauthorizedHandler(() => {
    phase.value = "login";
});

onMounted(async () => {
    const token = getToken();
    if (!token) {
        phase.value = "login";
        return;
    }
    try {
        updateApiBaseUrl();
        const res = await authApi.verifyToken(token);
        phase.value = res.data?.valid ? "ready" : "login";
    } catch {
        // 后端暂时不可达时不丢登录态，进入主界面由用户自行重试
        phase.value = "ready";
    }
});
</script>

<template>
    <div class="h-dvh w-full">
        <LoginView v-if="phase === 'login'" @success="phase = 'ready'" />
        <DebugPage v-else-if="phase === 'ready'" />
        <div
            v-else
            class="flex h-full w-full items-center justify-center text-zx-primary"
        >
            <Loader2 class="size-8 animate-spin" />
        </div>

        <!-- 弹窗转标签页 -->
        <button
            v-if="canReturnToTab"
            class="btn-touch fixed right-4 bottom-4 z-50 flex cursor-pointer items-center gap-1.5 rounded-full border border-slate-200 bg-white/90 px-3.5 py-2 text-xs font-semibold text-slate-500 shadow-sm backdrop-blur-sm transition-colors hover:border-zx-primary hover:text-zx-primary"
            type="button"
            title="转为普通浏览器标签页"
            @click="returnToTab"
        >
            <AppWindow class="size-3.5" />
            转为标签页
        </button>
    </div>
</template>
