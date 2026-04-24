<script setup lang="ts">
import { Folder, Plus } from "lucide-vue-next";
import { useFilesStore } from "@/store/files.ts";
import { storeToRefs } from "pinia";

const fileStore = useFilesStore();

const { showNewDialog } = storeToRefs(fileStore);
</script>

<template>
    <div class="flex w-full items-center justify-between">
        <div
            class="group flex w-fit items-center space-x-3 rounded-full border border-white/10 bg-white px-4 py-2 shadow-sm transition-all hover:scale-105"
        >
            <Folder class="h-5 w-5 text-blue-500" />
            <span class="text-sm font-medium text-slate-700">文件管理</span>
        </div>
        <div class="flex items-center space-x-2">
            <button
                @click="showNewDialog = true"
                class="btn-touch flex cursor-pointer items-center space-x-2 rounded-full bg-blue-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-600"
            >
                <Plus class="h-4 w-4" />
                <span class="hidden sm:inline">新建</span>
            </button>
        </div>
    </div>
</template>

<style scoped></style>
