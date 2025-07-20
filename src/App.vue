<script setup>
// import { router } from '@/router'
import {setRouter} from "@/utils/navigation.js";
import {useRoute} from 'vue-router'

const router = useRoute()



setRouter(router)
// TO_DO
// 多添加统计菜单

</script>

<template>
  <div class="min-h-screen overflow-hidden">
    <router-view></router-view>
  </div>

</template>

<style scoped>
</style>
