<script setup lang="ts">


const props = defineProps({
    icon: {
    },
    title: {
        type: String,
    },
    data:{
        type: Number,
    }
})

</script>

<template>
    <div class=" w-full h-30 bg-white rounded-4xl shadow-sm flex outline-1 p-4 outline-slate-200">
        <div class="left flex flex-col">
            <div class="title text-slate-600 mb-4">
                {{title}}
            </div>
            <div class="data text-3xl flex-1 font-bold flex items-center">
                {{data}}%
            </div>
        </div>
        <div class="right ml-auto">
            <div class="icon p-3 bg-slate-900 rounded-full">
                <component :is="icon" class="size-6 text-white"></component>
            </div>
        </div>
    </div>
</template>

<style scoped>

</style>