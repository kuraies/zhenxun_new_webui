<script setup lang="ts">
import User from "@/components/User.vue";
import Island from "components/Island/Island.vue";
</script>

<template>
    <div
        class="top relative z-10 flex w-full flex-col space-y-2 sm:space-y-0 sm:space-x-4 lg:space-x-8"
    >
        <div class="flex w-full items-end space-x-4 pr-4 select-none sm:w-auto">
            <User></User>
            <Island />
        </div>
    </div>
</template>
