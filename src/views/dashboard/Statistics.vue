<script setup lang="ts">

const props = defineProps({
    title: {
        type: String,
    },
    data:{
        type: Number,
    }
})

</script>

<template>
    <div class="min-w-30 w-full h-30 bg-white rounded-4xl shadow-sm flex flex-col justify-between items-center outline-1 p-4 outline-slate-200">
        <div class="data text-4xl font-bold flex-1 flex items-center">
            {{data}}
        </div>
        <div class="title text-slate-700">
            {{ title }}
        </div>
    </div>
</template>

<style scoped>

</style>