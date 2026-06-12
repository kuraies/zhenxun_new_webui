<script setup lang="ts">
import { FileText, Maximize2, Minimize2 } from "lucide-vue-next";

defineProps<{
    expanded?: boolean;
}>();

const emit = defineEmits<{
    toggle: [];
}>();
</script>

<template>
    <div
        class="flex items-center justify-between border-b border-slate-100 pr-4 pb-5"
    >
        <div class="flex items-center space-x-2">
            <FileText class="h-5 w-5 text-sky-600" />
            <span class="text-sm font-semibold text-gray-700">日志</span>
        </div>
        <button
            :aria-label="expanded ? '退出全屏' : '全屏查看日志'"
            :title="expanded ? '退出全屏' : '全屏查看日志'"
            class="btn-touch flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-full text-slate-400 transition-colors hover:bg-slate-100 hover:text-sky-600"
            type="button"
            @click="emit('toggle')"
        >
            <Minimize2 v-if="expanded" class="h-4 w-4" />
            <Maximize2 v-else class="h-4 w-4" />
        </button>
    </div>
</template>
