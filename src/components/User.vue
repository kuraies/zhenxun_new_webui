<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from "vue";
import { useBotStore } from "@/store/bot";
import { Check, ChevronDown, LogOut } from "lucide-vue-next";
import { useGlobalStore } from "@/store/global";
import avatar from "@/assets/img/avatar.jpg";
import { auth } from "@/utils/auth.ts";
import { whiteScreen } from "components/zxcomponent/WhiteScreen";
import { ZXMessageBox } from "@/services/ui";
import { router } from "@/router/index.js";

defineOptions({ inheritAttrs: false });

const globalStore = useGlobalStore();
const botStore = useBotStore();

// 下拉菜单状态
const dropdownOpen = ref(false);
const dropdownRef = ref<HTMLElement | null>(null);

// 切换下拉菜单
const toggleDropdown = () => {
    if (botStore.selectedBot?.self_id) {
        dropdownOpen.value = !dropdownOpen.value;
    }
};

// 选择 Bot
const selectBot = (botId: string) => {
    botStore.setSelectedBot(botId);
    dropdownOpen.value = false;
};

const handleLogout = () => {
    ZXMessageBox({
        title: "退出登录",
        message: "你是否要退出登录",
        cancelButtonText: "取消",
        onConfirm: () => {
            auth.logout();
            router.push({ name: "Login" });
        },
    });
};

// 点击外部关闭下拉菜单
const handleClickOutside = (event: MouseEvent) => {
    if (
        dropdownRef.value &&
        !dropdownRef.value.contains(event.target as Node)
    ) {
        dropdownOpen.value = false;
    }
};

onMounted(async () => {
    document.addEventListener("click", handleClickOutside);

    try {
        // 1. 获取列表
        await botStore.getBotList();

        if (!botStore.botList[0]?.self_id) {
            auth.logout();
            await whiteScreen.error();
            return;
        }

        // 2. 如果当前没有选中任何 Bot，且列表不为空，则默认选中第一个
        if (!botStore.selectedBotId) {
            botStore.setSelectedBot(<string>botStore.botList[0].self_id);
        }
    } catch (error) {
        console.error("初始化 Bot 列表失败:", error);
    }
});

onBeforeUnmount(() => {
    document.removeEventListener("click", handleClickOutside);
});
</script>

<template>
    <div
        v-tile-glow="110"
        ref="dropdownRef"
        v-bind="$attrs"
        class="relative flex h-15 w-full min-w-0 items-center gap-2 rounded-full border border-slate-200 bg-white p-1 pr-1.5 shadow-sm sm:w-72 sm:gap-2 sm:pr-2"
    >
        <div class="avatar h-full flex-shrink-0 cursor-pointer rounded-full">
            <img
                :src="botStore.selectedBot?.ava_url || avatar"
                alt=""
                class="h-full rounded-full"
            />
        </div>
        <div class="right flex min-w-0 flex-1 items-center gap-2">
            <div
                class="username truncate text-sm font-medium sm:text-base"
                :title="botStore.selectedBot?.nickname ?? undefined"
            >
                {{ botStore.selectedBot?.nickname || "未选择 Bot" }}
            </div>
        </div>
        <button
            class="flex h-8 w-8 flex-shrink-0 cursor-pointer items-center justify-center rounded-full text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700"
            title="切换 Bot"
            @click="toggleDropdown"
        >
            <ChevronDown
                class="size-4 transition-transform duration-200"
                :class="{ 'rotate-180': dropdownOpen }"
            />
        </button>
        <button
            class="flex h-8 w-8 flex-shrink-0 cursor-pointer items-center justify-center rounded-full text-red-400 transition-colors hover:bg-red-50 hover:text-red-500"
            title="退出登录"
            @click.stop="handleLogout"
        >
            <LogOut class="size-4" />
        </button>
    </div>

    <Teleport to="body">
        <Transition name="dropdown">
            <div
                v-if="dropdownOpen"
                class="fixed z-[9999] overflow-hidden rounded-2xl border border-slate-200 bg-white p-2 shadow-lg"
                :style="{
                    top: dropdownRef
                        ? `${dropdownRef.getBoundingClientRect().bottom + 8}px`
                        : '0px',
                    left: dropdownRef
                        ? `${dropdownRef.getBoundingClientRect().left}px`
                        : '0px',
                    width: dropdownRef
                        ? `${dropdownRef.offsetWidth}px`
                        : 'auto',
                    minWidth: '200px',
                }"
            >
                <div
                    v-for="bot in botStore.botList"
                    :key="bot.self_id || 'unknown'"
                    class="flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 transition-colors hover:bg-slate-100"
                    :style="{
                        width: dropdownRef
                            ? `${dropdownRef.offsetWidth - 16}px`
                            : 'auto',
                    }"
                    :class="{
                        'bg-zx-primary-tint text-zx-primary':
                            botStore.selectedBotId === bot.self_id,
                    }"
                    @click="selectBot(<string>bot.self_id)"
                >
                    <img
                        :src="bot.ava_url || avatar"
                        alt=""
                        class="h-8 w-8 flex-shrink-0 rounded-full object-cover"
                    />
                    <div class="min-w-0 flex-1">
                        <div
                            class="truncate text-sm font-medium"
                        >
                            {{ bot.nickname || bot.self_id }}
                        </div>
                        <div class="truncate text-xs text-slate-400">
                            {{ bot.self_id }}
                        </div>
                    </div>
                    <Check
                        v-if="botStore.selectedBotId === bot.self_id"
                        class="size-4 flex-shrink-0 text-zx-primary"
                    />
                </div>

                <div
                    v-if="botStore.botList.length === 0"
                    class="rounded-xl px-4 py-8 text-center"
                >
                    <p class="text-sm text-slate-400">暂无可用的 Bot</p>
                </div>
            </div>
        </Transition>
    </Teleport>
</template>

<style scoped>
@layer base {
    img {
        max-width: none;
    }
}

/* 下拉菜单动画 */
.dropdown-enter-active,
.dropdown-leave-active {
    transform-origin: top center;
    transition:
        opacity 0.18s ease,
        transform 0.18s ease;
}

.dropdown-enter-from,
.dropdown-leave-to {
    opacity: 0;
    transform: translateY(-6px) scale(0.98);
}
</style>
