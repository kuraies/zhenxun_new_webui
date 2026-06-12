<script setup lang="ts">
// @ts-ignore - Element Plus locale file
import zhCn from "element-plus/es/locale/lang/zh-cn";
</script>

<template>
    <el-config-provider :locale="zhCn">
        <div class="min-h-screen w-full overflow-hidden">
            <router-view></router-view>
        </div>
    </el-config-provider>
</template>

<style scoped></style>
