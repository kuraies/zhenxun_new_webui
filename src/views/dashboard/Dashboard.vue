<script setup>

import { useWebSocketStore } from '@/store/websocket.js'

const socketStore = useWebSocketStore()

const messages = computed(() => socketStore.getMessages('system_status'))


</script>

<template>
<div class="w-full h-full bg-white shadow-sm p-4 rounded-4xl">
    这是控制台
    <div>
        cpu:{{messages?.cpu}}
    </div>
    <div>
        memory:{{messages?.memory}}
    </div>
    <div>
        disk:{{messages?.disk}}
    </div>
</div>
</template>

<style scoped>

</style>