<script setup lang="ts">
interface Props {
    title: string;
    data: number;
}

const props = defineProps<Props>();
</script>

<template>
    <div
        class="flex h-30 w-full min-w-30 flex-1 flex-col items-center justify-between rounded-4xl border border-slate-200 bg-white p-4 shadow-sm"
    >
        <div class="data flex flex-1 items-center text-4xl font-bold">
            {{ props.data }}
        </div>
        <div class="title text-slate-700">
            {{ props.title }}
        </div>
    </div>
</template>

<style scoped></style>
