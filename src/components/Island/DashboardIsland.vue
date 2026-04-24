<script setup lang="ts">
import { Bot } from "lucide-vue-next";
import { useBotStore } from "@/store/bot.ts";

const botStore = useBotStore();
</script>

<template>
    <div
        class="group island-pop flex w-fit min-w-40 items-center space-x-3 rounded-full border border-white/10 bg-white px-4 py-2 shadow-sm backdrop-blur-md transition-all hover:scale-105"
    >
        <div class="relative flex h-2 w-2">
            <span
                class="absolute inline-flex h-full w-full animate-ping rounded-full bg-sky-400 opacity-75"
            ></span>
            <span
                class="relative inline-flex h-2 w-2 rounded-full bg-sky-500"
            ></span>
        </div>

        <div class="flex items-center space-x-2">
            <Bot class="h-5 w-5 text-sky-400" />
            <span
                class="nowrap text-xs font-medium tracking-wide text-slate-600"
                >Bot连接</span
            >
        </div>

        <div class="h-3 w-[1px] bg-black/30"></div>

        <span class="text-sm font-black text-sky-400">{{
            botStore.botList.length
        }}</span>
    </div>
</template>

<style scoped></style>
