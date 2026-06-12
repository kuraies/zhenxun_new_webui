<script setup lang="ts">
import { defineAsyncComponent } from "vue";
import { RefreshCw, Save } from "lucide-vue-next";

const ZXTextEditor = defineAsyncComponent(
    () => import("@/components/ZXTextEditor"),
);

defineProps<{
    modelValue: string;
    path: string;
    loading: boolean;
    saving: boolean;
    language?: string;
}>();

const emit = defineEmits<{
    "update:modelValue": [value: string];
    refresh: [];
    save: [];
}>();
</script>

<template>
    <div
        class="flex min-h-0 flex-1 flex-col rounded-3xl bg-white shadow-sm outline-1 outline-slate-200"
    >
        <div
            class="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 p-3"
        >
            <slot name="toolbar-left" />

            <div class="flex items-center space-x-2">
                <button
                    :disabled="loading"
                    class="btn-touch rounded-2xl p-1.5 transition-colors hover:bg-gray-100"
                    title="刷新"
                    @click="emit('refresh')"
                >
                    <RefreshCw
                        :class="{ 'animate-spin': loading }"
                        class="h-4 w-4 text-gray-600"
                    />
                </button>

                <button
                    :disabled="saving || loading"
                    class="btn-touch flex items-center space-x-2 rounded-2xl bg-blue-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-600 disabled:opacity-50"
                    @click="emit('save')"
                >
                    <Save :class="{ 'animate-spin': saving }" class="h-4 w-4" />
                    <span>保存</span>
                </button>
            </div>
        </div>

        <div class="min-h-0 flex-1">
            <ZXTextEditor
                :loading="loading"
                :model-value="modelValue"
                :language="language || 'yaml'"
                :path="path"
                hide-toolbar
                @update:model-value="emit('update:modelValue', $event)"
            />
        </div>
    </div>
</template>
