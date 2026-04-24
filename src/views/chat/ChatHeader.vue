<script setup lang="ts">
import { MessageSquare } from "lucide-vue-next";
import { useGlobalStore } from "@/store/global.ts";
import { useChatStore } from "@/store/chat.ts";
import { storeToRefs } from "pinia";

const globalStore = useGlobalStore();
const chatStore = useChatStore();

const { wsConnected } = storeToRefs(globalStore);
const { selectedName } = storeToRefs(chatStore);
</script>

<template>
    <div
        class="flex items-center justify-between rounded-3xl border border-slate-200 bg-white p-4 shadow-sm"
    >
        <div class="flex min-w-0 items-center space-x-2 sm:space-x-3">
            <MessageSquare
                class="h-5 w-5 flex-shrink-0 text-blue-500 sm:h-6 sm:w-6"
            />
            <h2
                class="truncate text-base font-semibold text-gray-800 sm:text-lg"
            >
                聊天
            </h2>
            <span
                class="truncate text-xs text-gray-500 sm:text-sm"
                v-if="selectedName"
            >
                - {{ selectedName }}
            </span>
            <span
                class="hidden text-xs text-gray-400 sm:inline"
                v-if="wsConnected"
            >
                (已连接)
            </span>
            <span class="hidden text-xs text-orange-400 sm:inline" v-else>
                (未连接)
            </span>
        </div>
    </div>
</template>

<style scoped></style>
