<script setup lang="ts">
import { useGlobalStore } from "@/store/global.js";
import logo from "@/assets/img/title.png";

const globalStore = useGlobalStore();
</script>

<template>
    <div
        class="logo flex w-full flex-shrink-0 items-center justify-center overflow-hidden px-2 transition-[padding] duration-[400ms] ease-in-out sm:px-4"
    >
        <img
            :src="logo"
            alt="Logo"
            class="sidebar-logo-image max-w-full object-contain transition-[transform,opacity] duration-[400ms] ease-in-out sm:h-25"
            :class="
                globalStore.navMini
                    ? 'scale-95 opacity-0'
                    : 'scale-100 opacity-100'
            "
        />
    </div>
</template>

<style scoped>
.sidebar-logo-image {
    filter: var(--zx-sidebar-logo-filter);
}
</style>
