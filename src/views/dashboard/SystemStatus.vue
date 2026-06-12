<script setup lang="ts">
interface Props {
    icon: any;
    title: String;
    data: Number;
}

const props = defineProps<Props>();
</script>

<template>
    <div
        class="flex h-30 flex-1 rounded-2xl border border-slate-200 bg-white px-6 py-4 shadow-sm"
    >
        <div class="left flex flex-col">
            <div class="title mb-4 text-slate-600">
                {{ props.title }}
            </div>
            <div class="data flex flex-1 items-center text-3xl font-bold">
                {{ props.data }}%
            </div>
        </div>
        <div class="right ml-auto">
            <div class="icon rounded-full bg-slate-900 p-3">
                <component
                    :is="props.icon"
                    class="size-6 text-white"
                ></component>
            </div>
        </div>
    </div>
</template>

<style scoped></style>
