<script setup lang="ts">
import { FlaskConical, Sparkles } from "lucide-vue-next";
</script>

<template>
    <div class="flex min-h-full w-full flex-col sm:space-y-4">
        <div
            v-tile-glow
            class="flex flex-1 flex-col items-center justify-center gap-4 rounded-3xl border border-slate-200 bg-white p-8 shadow-sm"
        >
            <div
                class="flex h-14 w-14 items-center justify-center rounded-2xl bg-zx-primary-soft"
            >
                <FlaskConical class="h-7 w-7 text-zx-primary" />
            </div>

            <div class="text-lg font-semibold text-slate-800">
                二级菜单测试页
            </div>

            <p class="max-w-md text-center text-sm leading-6 text-slate-500">
                这个页面由侧边栏「扩展」下的二级菜单「测试按钮」打开，
                用于验证二级菜单的展开、收起与路由高亮。以后插件可以通过
                <code
                    class="rounded-md bg-slate-100 px-1.5 py-0.5 text-xs text-slate-600"
                    >registerMenuItem()</code
                >
                把自己的页面注册到这里。
            </p>

            <div
                class="flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs text-slate-500"
            >
                <Sparkles class="h-3.5 w-3.5" />
                插件二级菜单占位
            </div>
        </div>
    </div>
</template>
