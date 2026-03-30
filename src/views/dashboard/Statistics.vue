<script setup lang="ts">


interface Props {
    title: string;
    data: number;
}

const props = defineProps<Props>();


</script>

<template>
    <div class="min-w-30 w-full h-30 bg-white rounded-2xl shadow-sm flex flex-1 flex-col justify-between items-center outline-1 p-4 outline-slate-200">
        <div class="data text-4xl font-bold flex-1 flex items-center">
            {{props.data}}
        </div>
        <div class="title text-slate-700">
            {{ props.title }}
        </div>
    </div>
</template>

<style scoped>

</style>