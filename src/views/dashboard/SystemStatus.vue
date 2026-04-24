<script setup lang="ts">

interface Props {
    icon:any,
    title: String,
    data:Number,
}

const props = defineProps<Props>()

</script>

<template>
    <div class="h-30 bg-white rounded-2xl shadow-sm flex border py-4 px-6 border-slate-200 flex-1">
        <div class="left flex flex-col">
            <div class="title text-slate-600 mb-4">
                {{props.title}}
            </div>
            <div class="data text-3xl flex-1 font-bold flex items-center">
                {{props.data}}%
            </div>
        </div>
        <div class="right ml-auto">
            <div class="icon p-3 bg-slate-900 rounded-full">
                <component :is="props.icon" class="size-6 text-white"></component>
            </div>
        </div>
    </div>
</template>

<style scoped>

</style>