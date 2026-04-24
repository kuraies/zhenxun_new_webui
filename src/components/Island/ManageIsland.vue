<script lang="ts" setup>
import { onBeforeUnmount, onMounted, ref, watch } from "vue";
import { gsap } from "gsap";
import { Bell, Shield } from "lucide-vue-next";
import { useManageStore } from "@/store/manage.ts";
import { storeToRefs } from "pinia";

const manageStore = useManageStore();
const { requestDialogOpen, requestNum } = storeToRefs(manageStore);
const { loadRequestList } = manageStore;

const bellRef = ref();

let timer: ReturnType<typeof setInterval> | null = null;

let intervalId: ReturnType<typeof setInterval> | null = null;
let ringing = false;

// 打开请求列表对话框
const openRequestDialog = async () => {
    requestDialogOpen.value = true;
    await loadRequestList();
};

const ringBell = () => {
    if (!bellRef.value || ringing) return;

    ringing = true;

    const tl = gsap.timeline({
        onComplete() {
            ringing = false;
        },
    });

    tl.to(bellRef.value, {
        rotate: -18,
        duration: 0.08,
        transformOrigin: "50% 10%",
        ease: "power1.inOut",
    })
        .to(bellRef.value, { rotate: 18, duration: 0.12 })
        .to(bellRef.value, { rotate: -12, duration: 0.1 })
        .to(bellRef.value, { rotate: 8, duration: 0.08 })
        .to(bellRef.value, {
            rotate: 0,
            duration: 0.12,
            ease: "elastic.out(1,0.4)",
        });
};

const startLoop = async () => {
    if (intervalId) return;
    // 关键：立即触发一次
    ringBell();

    intervalId = setInterval(() => {
        if (requestNum.value > 0) {
            ringBell();
        }
    }, 3000); // 每3秒提醒一次
};

const stopLoop = () => {
    if (intervalId) {
        clearInterval(intervalId);
        intervalId = null;
    }
};

// 监听是否有未读
watch(
    () => requestNum.value,
    (val) => {
        if (val > 0) {
            startLoop();
        } else {
            stopLoop();
        }
    },
    { immediate: true },
);

onBeforeUnmount(() => {
    stopLoop();
    stopPollingRequestList();
});

// 开始轮询
const startPollingRequestList = () => {
    if (timer) return;

    // 立即执行一次
    loadRequestList();

    timer = setInterval(() => {
        if (!requestDialogOpen.value) loadRequestList();
    }, 5000); // 每5秒刷新一次
};

// 停止轮询
const stopPollingRequestList = () => {
    if (timer) {
        clearInterval(timer);
        timer = null;
    }
};

onMounted(() => {
    startPollingRequestList();
});
</script>

<template>
    <div class="flex w-full justify-between">
        <div
            class="group flex w-fit items-center space-x-3 rounded-full border border-white/10 bg-white px-4 py-2 shadow-sm transition-all hover:scale-105"
        >
            <Shield class="h-5 w-5 text-blue-500" />
            <span class="text-sm font-medium whitespace-nowrap text-slate-700"
                >管理</span
            >
        </div>
        <div
            class="group island-pop flex w-fit cursor-pointer items-center space-x-3 rounded-full border border-white/10 bg-white px-4 py-2 shadow-sm backdrop-blur-md transition-all hover:scale-105"
            @click="openRequestDialog"
        >
            <div class="flex items-center space-x-2">
                <Bell ref="bellRef" class="h-5 w-5 text-orange-500" />
                <span
                    class="nowrap text-xs font-medium tracking-wide text-slate-600"
                    >请求处理</span
                >
            </div>

            <div class="h-3 w-[1px] bg-black/30"></div>

            <span class="text-sm font-black text-orange-500">{{
                requestNum
            }}</span>
        </div>
    </div>
</template>

<style scoped></style>
