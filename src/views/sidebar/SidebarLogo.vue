<script setup lang="ts">
import { useGlobalStore } from "@/store/global.js";
import logo from "@/assets/img/title.png";

const globalStore = useGlobalStore();
</script>

<template>
    <div
        class="logo flex flex-shrink-0 items-center justify-center duration-200 ease-in-out"
        :class="{
            hidden: globalStore.navMini,
            'w-full px-2 sm:px-4': !globalStore.navMini,
        }"
    >
        <img :src="logo" alt="Logo" class="max-w-full object-contain sm:h-25" />
    </div>
</template>
