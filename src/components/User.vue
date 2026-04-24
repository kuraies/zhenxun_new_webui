<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from "vue";
import { useBotStore } from "@/store/bot";
import { Check, ChevronDown } from "lucide-vue-next";
import { useGlobalStore } from "@/store/global";
import avatar from "@/assets/img/avatar.jpg";
import { auth } from "@/utils/auth.ts";
import { whiteScreen } from "components/zxcomponent/WhiteScreen";

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
    // 1. 获取列表
    await botStore.getBotList();
    console.log(botStore.botList);

    if (botStore.botList[0].self_id == null) {
        auth.logout();
        await whiteScreen.error();
    }

    // 2. 如果当前没有选中任何 Bot，且列表不为空，则默认选中第一个
    if (!botStore.selectedBotId && botStore.botList.length > 0) {
        const firstBotId = botStore.botList[0].self_id;
        if (firstBotId) {
            botStore.setSelectedBot(firstBotId);
        }
    }

    document.addEventListener("click", handleClickOutside);
});

onBeforeUnmount(() => {
    document.removeEventListener("click", handleClickOutside);
});
</script>

<template>
    <div
        ref="dropdownRef"
        class="relative flex h-15 w-full min-w-0 items-center gap-2 rounded-full bg-white p-1 pr-2 shadow-sm outline-1 outline-slate-200 sm:w-72 sm:gap-3 sm:pr-3"
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
            class="flex h-7 w-7 flex-shrink-0 cursor-pointer items-center justify-center rounded-full bg-slate-100 transition-colors hover:bg-slate-200 sm:h-8 sm:w-8"
            @click="toggleDropdown"
        >
            <ChevronDown
                class="size-3.5 text-slate-600 transition-transform duration-200 sm:size-4"
                :class="{ 'rotate-180': dropdownOpen }"
            />
        </button>
    </div>

    <Teleport to="body">
        <Transition name="dropdown">
            <div
                v-if="dropdownOpen"
                class="fixed z-[9999] overflow-hidden rounded-2xl bg-white shadow-xl outline-1 outline-slate-200"
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
                    class="flex cursor-pointer items-center gap-3 px-4 py-3 transition-colors hover:bg-sky-200"
                    :style="{
                        width: dropdownRef
                            ? `${dropdownRef.offsetWidth}px`
                            : 'auto',
                    }"
                    :class="{
                        'bg-sky-100': botStore.selectedBotId === bot.self_id,
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
                            class="truncate text-sm font-medium text-slate-700"
                        >
                            {{ bot.nickname || bot.self_id }}
                        </div>
                        <div class="truncate text-xs text-slate-400">
                            {{ bot.self_id }}
                        </div>
                    </div>
                    <Check
                        v-if="botStore.selectedBotId === bot.self_id"
                        class="size-4 flex-shrink-0 text-blue-500"
                    />
                </div>

                <div
                    v-if="botStore.botList.length === 0"
                    class="px-4 py-8 text-center"
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
    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

.dropdown-enter-from,
.dropdown-leave-to {
    opacity: 0;
    transform: translateY(-8px);
}
</style>
