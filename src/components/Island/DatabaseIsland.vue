<script setup lang="ts">
import { Clock, Database } from "lucide-vue-next";
import { useDatabaseStore } from "@/store/database.ts";

const databaseStore = useDatabaseStore();
const { openSqlLog } = databaseStore;
</script>

<template>
    <div class="flex w-full items-center justify-between">
        <div
            class="group flex w-fit items-center space-x-3 rounded-full border border-white/10 bg-white px-4 py-2 shadow-sm transition-all hover:scale-105"
        >
            <Database class="h-5 w-5 text-blue-500" />
            <span class="text-sm font-medium text-slate-700">文件管理</span>
        </div>
        <div class="flex items-center space-x-2">
            <button
                @click="openSqlLog"
                class="btn-touch flex cursor-pointer items-center space-x-2 rounded-2xl bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow-sm transition-colors hover:bg-gray-200 sm:px-4"
            >
                <Clock class="h-4 w-4" />
                <span class="hidden sm:inline">SQL 日志</span>
            </button>
        </div>
    </div>
</template>

<style scoped></style>
