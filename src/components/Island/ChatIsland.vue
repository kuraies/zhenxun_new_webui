<script setup lang="ts">
import { MessageSquare } from "lucide-vue-next";
import { computed } from "vue";
import { useGlobalStore } from "@/store/global.ts";

const globalStore = useGlobalStore();

const isOnline = computed(() => globalStore.wsConnected);
</script>

<template>
    <div
        class="group flex w-fit items-center space-x-3 rounded-full border border-white/10 bg-white px-4 py-2 shadow-sm transition-all hover:scale-105"
    >
        <MessageSquare class="h-5 w-5 text-blue-500" />
        <span class="text-sm font-medium text-slate-700">聊天</span>
        <div class="relative flex h-2 w-2" v-if="isOnline">
            <span
                class="absolute inline-flex h-full w-full animate-ping rounded-full bg-sky-400 opacity-75"
            ></span>
            <span
                class="relative inline-flex h-2 w-2 rounded-full bg-sky-500"
            ></span>
        </div>
        <div class="relative flex h-2 w-2" v-else>
            <span
                class="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-500 opacity-75"
            ></span>
            <span
                class="relative inline-flex h-2 w-2 rounded-full bg-red-500"
            ></span>
        </div>
    </div>
</template>

<style scoped></style>
