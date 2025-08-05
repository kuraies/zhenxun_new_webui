<script setup>


import { Cpu, MemoryStick, HardDrive } from "lucide-vue-next";



import { useSystemStore } from '@/store/system.js'
import SystemStatus from "@/views/dashboard/SystemStatus.vue";
import Statistics from "@/views/dashboard/Statistics.vue";


const systemStore = useSystemStore()


onMounted(() => {
    systemStore.startPolling()
});

onBeforeUnmount(() => {
    systemStore.stopPolling()
});


</script>

<template>
    <div class="w-full h-full space-y-4 flex space-x-4">
        <div
            class="list max-w-120 w-full bg-white rounded-4xl shadow-sm flex flex-col justify-between items-center outline-1 p-4 outline-slate-200">
            <div class="bot flex flex-col">
                <div class="top-info">

                </div>
            </div>
        </div>
        <div class="info space-y-4 w-full  flex flex-col">
            <div class="status space-x-4 flex">
                <SystemStatus :data="systemStore.systemStatus.cpu" :icon="Cpu" title="CPU"></SystemStatus>
                <SystemStatus :data="systemStore.systemStatus.memory" :icon="MemoryStick" title="Memory"></SystemStatus>
                <SystemStatus :data="systemStore.systemStatus.disk" :icon="HardDrive" title="Disk"></SystemStatus>

            </div>
            <div class="statistics space-x-4 flex ">
                <Statistics :data="systemStore.count.chat_num" title="消息总数"></Statistics>
                <Statistics :data="systemStore.count.chat_day" title="今日消息"></Statistics>
                <Statistics :data="systemStore.count.call_num" title="调用总数"></Statistics>
                <Statistics :data="systemStore.count.call_day" title="今日调用"></Statistics>
            </div>
        </div>
    </div>
</template>

<style scoped>

</style>