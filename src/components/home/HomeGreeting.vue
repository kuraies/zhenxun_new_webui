<script setup lang="ts">
import { computed } from "vue";

const greeting = computed(() => {
    const hour = new Date().getHours();
    if (hour < 6) return "😴 夜深了，早点休息哦~";
    if (hour < 12) return "😊 早安，今天也要元气满满！";
    if (hour < 14) return "😋 午安，吃饱了才有力气干活~";
    if (hour < 18) return "🙂 下午好，继续加油！";
    return "😌 晚上好，辛苦了一天，放松一下吧~";
});
</script>

<template>
    <h1 class="min-w-0 flex-1 truncate text-2xl font-light text-slate-500">{{ greeting }}</h1>
</template>
