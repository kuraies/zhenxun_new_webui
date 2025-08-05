<script setup>

import { botApi } from '@/utils/api/bot.js'
import {useGlobalStore} from "@/store/global.js";
import {useBotStore} from "@/store/bot.js";

import {
    ArrowLeftRight
} from 'lucide-vue-next'

/*
图片导入区
 */

import avatar from '@/assets/img/avatar.jpg'


/*
图片导入区结束
 */


const globalStore = useGlobalStore()

const botStore = useBotStore()

function avatar_click(){
    if(!globalStore.navHidden){
        globalStore.navMini=!globalStore.navMini
    }

}

onMounted(() => {
    botStore.getBotList()
})

</script>

<template>
<div class="h-15 bg-white rounded-full shadow-sm flex p-1 outline-1 outline-slate-200 items-center space-x-4 pr-6">
    <div class="avatar h-full rounded-full" @click="avatar_click">
        <img :src="botStore.lastBot?.ava_url" alt="" class="h-full rounded-full">
    </div>
    <div class="right flex flex-1 items-center  @max-3xs:hidden">
        <div class="username flex-1 truncate" title="Mioooooooooooooooooooooooooooooooooooooooo">
            {{botStore.lastBot?.nickname}}
        </div>
        <div class="change text-slate-600">
            <ArrowLeftRight class="size-4"></ArrowLeftRight>
        </div>
    </div>
</div>
</template>

<style scoped>
@layer base {
    img{
        max-width: none;
    }
}
</style>