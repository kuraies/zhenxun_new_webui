<script setup lang="ts">
/**
 * 请求处理中心弹窗：好友/群请求的同意、拒绝、忽略与清空。
 * 由顶部通知铃铛（HomeActions）打开；数据在 manage store，
 * 列表随 bot 切换与 30 秒静默轮询保持更新
 */
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { Bell, X } from "lucide-vue-next";
import { storeToRefs } from "pinia";
import { gsap } from "gsap";
import { ZXMessageBox, ZXNotification } from "@/services/ui";
import { useManageStore } from "@/store/manage.ts";
import { useBotStore } from "@/store/bot.ts";
import { useChatStore } from "@/store/chat.ts";
import { manageApi } from "@/utils/api-next";
import { usePolling } from "@/composables/usePolling";
import type {
    FriendRequestResult,
    GroupRequestResult,
} from "@/types/manage.types";

const props = defineProps<{
    /** desktop = 锚在铃铛下（lg+）；compact = 锚在更多按钮下（lg 以下） */
    variant: "desktop" | "compact";
}>();

const manageStore = useManageStore();
const botStore = useBotStore();
const chatStore = useChatStore();
const { requestDialogOpen, friendRequests, groupRequests, requestsLoading } =
    storeToRefs(manageStore);
const { loadRequestList } = manageStore;

// 两个挂载点按断点互斥渲染，保证同一时刻只有一个实例
const isLgQuery =
    typeof window !== "undefined" && window.matchMedia
        ? window.matchMedia("(min-width: 1024px)")
        : null;
const isLg = ref(isLgQuery?.matches ?? true);
const onLgChange = (e: MediaQueryListEvent) => {
    isLg.value = e.matches;
};

const visible = computed(() =>
    props.variant === "desktop" ? isLg.value : !isLg.value,
);

// 与主题面板同款的进出场：淡入 + 下落缩放（gsap 驱动）。
// 快速连点时 enter/leave 会互相打断：先杀掉旧补间、并以令牌保证
// 只有最新一次钩子的 done 生效，否则 Vue 会等不到结束信号而卡死
const onEnter = (el: Element, done: () => void) => {
    gsap.killTweensOf(el);
    const state = el as Element & { _tipDone?: () => void };
    state._tipDone = done;
    gsap.fromTo(
        el,
        { autoAlpha: 0, y: -8, scale: 0.96 },
        {
            autoAlpha: 1,
            y: 0,
            scale: 1,
            duration: 0.18,
            ease: "power2.out",
            onComplete: () => state._tipDone?.(),
        },
    );
};

const onLeave = (el: Element, done: () => void) => {
    gsap.killTweensOf(el);
    const state = el as Element & { _tipDone?: () => void };
    state._tipDone = done;
    gsap.to(el, {
        autoAlpha: 0,
        y: -6,
        scale: 0.96,
        duration: 0.15,
        ease: "power2.in",
        onComplete: () => state._tipDone?.(),
    });
};

const activeRequestTab = ref<"friend" | "group">("friend");

const hideBrokenAvatar = (e: Event) => {
    (e.target as HTMLImageElement).style.visibility = "hidden";
};

const handleRequest = async (
    request: FriendRequestResult | GroupRequestResult,
    action: "approve" | "refused" | "ignore",
) => {
    try {
        const res = await manageApi.handleRequest({
            bot_id: request.bot_id,
            id: request.oid,
            action,
        });

        if (res.success) {
            ZXNotification({
                title: "成功啦~",
                message:
                    action === "approve"
                        ? "已同意请求 ♪(´▽｀)"
                        : action === "refused"
                          ? "已拒绝请求"
                          : "已忽略请求",
                type: "🥳",
                position: "top-right",
            });
            // 同意好友申请后联系人列表需要重载，新朋友才会出现
            if (action === "approve") {
                await chatStore.loadContacts();
            }
            await loadRequestList();
        }
    } catch (error) {
        console.error("处理请求失败:", error);
        ZXNotification({
            title: "对不起",
            message: "处理请求失败了 (´；ω；`)",
            type: "😭",
            position: "top-right",
        });
    }
};

const clearRequests = async (requestType: "friend" | "group") => {
    try {
        await ZXMessageBox({
            title: "清空请求确认",
            message: `确定要清空所有${requestType === "friend" ? "好友" : "群组"}请求吗？此操作不可恢复。`,
            cancelButtonText: "取消",
            confirmButtonText: "确定",
            type: "warning",
            onConfirm: async () => {
                const res = await manageApi.clearRequest(requestType);

                if (res.success) {
                    ZXNotification({
                        title: "成功~",
                        message: "已清空过期请求",
                        type: "🥳",
                        position: "top-right",
                    });
                    await loadRequestList();
                }
            },
        });
    } catch {
        return;
    }
};

// WS 推送之外的兜底：30 秒静默轮询一次请求列表
const { start: startRequestPolling, stop: stopRequestPolling } = usePolling(
    () => loadRequestList(true),
    30000,
    { autoStart: false },
);

// 顶栏切换 bot 后，请求列表跟着刷新
watch(
    () => botStore.selectedBotId,
    (newBotId, oldBotId) => {
        if (newBotId && newBotId !== oldBotId) loadRequestList();
    },
);

onMounted(() => {
    isLgQuery?.addEventListener("change", onLgChange);
    loadRequestList(true);
    startRequestPolling();
});

onBeforeUnmount(() => {
    isLgQuery?.removeEventListener("change", onLgChange);
    stopRequestPolling();
});
</script>

<template>
    <Transition :css="false" @enter="onEnter" @leave="onLeave">
        <div
            v-if="requestDialogOpen && visible"
            class="absolute right-0 top-full z-40 mt-2 flex max-h-[70vh] w-96 max-w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-2xl border border-[var(--zx-color-border)] bg-[var(--zx-color-surface)] shadow-lg"
        >
                    <!-- 头部：标题 + 关闭 -->
                    <div
                        class="flex items-center justify-between gap-2 px-5 pt-4 pb-2.5"
                    >
                        <p class="text-base font-medium text-[var(--zx-color-text)]">
                            请求处理
                        </p>
                        <button
                            class="flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-full text-[var(--zx-color-text-muted)] transition-colors hover:bg-[var(--zx-color-surface-muted)] hover:text-[var(--zx-color-text)]"
                            type="button"
                            @click="requestDialogOpen = false"
                        >
                            <X class="h-4.5 w-4.5" />
                        </button>
                    </div>
                    <div class="mx-5 border-t border-[var(--zx-color-border-soft)]"></div>

                    <!-- 分段式标签切换 -->
                    <div class="px-5 pt-3">
                        <div
                            class="grid h-9 grid-cols-2 rounded-2xl bg-[var(--zx-color-surface-muted)] p-1"
                        >
                            <button
                                :class="[
                                    'flex min-w-0 cursor-pointer items-center justify-center gap-1.5 rounded-xl px-3 text-sm font-medium transition-all',
                                    activeRequestTab === 'friend'
                                        ? 'bg-[var(--zx-color-surface)] text-zx-primary shadow-sm'
                                        : 'text-[var(--zx-color-text-muted)] hover:text-[var(--zx-color-text)]',
                                ]"
                                type="button"
                                @click="activeRequestTab = 'friend'"
                            >
                                <span class="truncate">好友请求</span>
                                <span
                                    :class="[
                                        'min-w-5 rounded-full px-1.5 py-0.5 text-center text-[10px] leading-none',
                                        activeRequestTab === 'friend'
                                            ? 'bg-zx-primary-soft text-zx-primary'
                                            : 'bg-[var(--zx-color-surface)] text-[var(--zx-color-text-subtle)]',
                                    ]"
                                >
                                    {{ friendRequests.length }}
                                </span>
                            </button>
                            <button
                                :class="[
                                    'flex min-w-0 cursor-pointer items-center justify-center gap-1.5 rounded-xl px-3 text-sm font-medium transition-all',
                                    activeRequestTab === 'group'
                                        ? 'bg-[var(--zx-color-surface)] text-zx-primary shadow-sm'
                                        : 'text-[var(--zx-color-text-muted)] hover:text-[var(--zx-color-text)]',
                                ]"
                                type="button"
                                @click="activeRequestTab = 'group'"
                            >
                                <span class="truncate">群组请求</span>
                                <span
                                    :class="[
                                        'min-w-5 rounded-full px-1.5 py-0.5 text-center text-[10px] leading-none',
                                        activeRequestTab === 'group'
                                            ? 'bg-zx-primary-soft text-zx-primary'
                                            : 'bg-[var(--zx-color-surface)] text-[var(--zx-color-text-subtle)]',
                                    ]"
                                >
                                    {{ groupRequests.length }}
                                </span>
                            </button>
                        </div>
                    </div>

                    <!-- 列表 -->
                    <div class="min-h-0 flex-1 overflow-y-auto px-5 py-3">
                        <div
                            v-if="requestsLoading"
                            class="flex items-center justify-center py-12"
                        >
                            <div class="text-center text-gray-400">
                                <div
                                    class="mx-auto mb-2 h-8 w-8 animate-pulse rounded-full border-2 border-zx-primary border-t-transparent"
                                />
                                <p class="text-sm">加载中...</p>
                            </div>
                        </div>

                        <template v-else>
                            <!-- 空状态 -->
                            <div
                                v-if="
                                    (activeRequestTab === 'friend' &&
                                        friendRequests.length === 0) ||
                                    (activeRequestTab === 'group' &&
                                        groupRequests.length === 0)
                                "
                                class="py-14 text-center"
                            >
                                <Bell
                                    class="mx-auto mb-3 h-12 w-12 text-slate-200"
                                />
                                <p class="text-sm text-slate-400">
                                    {{
                                        activeRequestTab === "friend"
                                            ? "暂无好友请求"
                                            : "暂无群组请求"
                                    }}
                                </p>
                            </div>

                            <!-- 好友请求列表 -->
                            <div
                                v-else-if="activeRequestTab === 'friend'"
                                class="space-y-2"
                            >
                                <div
                                    v-for="req in friendRequests"
                                    :key="req.oid"
                                    class="group flex items-center gap-3 rounded-2xl bg-slate-50 p-2.5 transition-colors hover:bg-slate-100"
                                >
                                    <div
                                        class="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full bg-zx-primary-soft text-sm font-bold text-zx-primary"
                                    >
                                        <img
                                            :src="req.ava_url"
                                            referrerpolicy="no-referrer"
                                            class="h-full w-full object-cover"
                                            @error="hideBrokenAvatar"
                                        />
                                    </div>
                                    <div class="min-w-0 flex-1">
                                        <p
                                            class="truncate text-sm font-medium text-slate-700"
                                        >
                                            {{ req.nickname || "未知" }}
                                        </p>
                                        <p
                                            class="truncate text-xs text-slate-400"
                                        >
                                            ID: {{ req.id }}
                                            <span
                                                v-if="req.comment"
                                                class="ml-1"
                                            >
                                                · {{ req.comment }}</span
                                            >
                                        </p>
                                    </div>
                                    <div class="flex shrink-0 gap-1.5">
                                        <button
                                            class="cursor-pointer select-none rounded-full bg-green-50 px-3 py-1 text-[11px] font-semibold text-green-600 hover:bg-green-100"
                                            type="button"
                                            @click="handleRequest(req, 'approve')"
                                        >
                                            同意
                                        </button>
                                        <button
                                            class="cursor-pointer select-none rounded-full bg-red-50 px-3 py-1 text-[11px] font-semibold text-red-600 hover:bg-red-100"
                                            type="button"
                                            @click="handleRequest(req, 'refused')"
                                        >
                                            拒绝
                                        </button>
                                        <button
                                            class="cursor-pointer select-none rounded-full bg-slate-200/70 px-3 py-1 text-[11px] font-semibold text-slate-500 hover:bg-slate-200"
                                            type="button"
                                            @click="handleRequest(req, 'ignore')"
                                        >
                                            忽略
                                        </button>
                                    </div>
                                </div>
                            </div>

                            <!-- 群组请求列表 -->
                            <div
                                v-else-if="activeRequestTab === 'group'"
                                class="space-y-2"
                            >
                                <div
                                    v-for="req in groupRequests"
                                    :key="req.oid"
                                    class="group flex items-center gap-3 rounded-2xl bg-slate-50 p-2.5 transition-colors hover:bg-slate-100"
                                >
                                    <div
                                        class="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full bg-zx-primary-soft text-sm font-bold text-zx-primary"
                                    >
                                        <img
                                            :src="req.ava_url"
                                            referrerpolicy="no-referrer"
                                            class="h-full w-full object-cover"
                                            @error="hideBrokenAvatar"
                                        />
                                    </div>
                                    <div class="min-w-0 flex-1">
                                        <p
                                            class="truncate text-sm font-medium text-slate-700"
                                        >
                                            {{ req.nickname || "未知" }}
                                        </p>
                                        <p
                                            class="truncate text-xs text-slate-400"
                                        >
                                            ID: {{ req.id }} · 邀请群：{{
                                                req.invite_group
                                            }}
                                            <span
                                                v-if="req.comment"
                                                class="ml-1"
                                            >
                                                · {{ req.comment }}</span
                                            >
                                        </p>
                                    </div>
                                    <div class="flex shrink-0 gap-1.5">
                                        <button
                                            class="cursor-pointer select-none rounded-full bg-green-50 px-3 py-1 text-[11px] font-semibold text-green-600 hover:bg-green-100"
                                            type="button"
                                            @click="handleRequest(req, 'approve')"
                                        >
                                            同意
                                        </button>
                                        <button
                                            class="cursor-pointer select-none rounded-full bg-red-50 px-3 py-1 text-[11px] font-semibold text-red-600 hover:bg-red-100"
                                            type="button"
                                            @click="handleRequest(req, 'refused')"
                                        >
                                            拒绝
                                        </button>
                                        <button
                                            class="cursor-pointer select-none rounded-full bg-slate-200/70 px-3 py-1 text-[11px] font-semibold text-slate-500 hover:bg-slate-200"
                                            type="button"
                                            @click="handleRequest(req, 'ignore')"
                                        >
                                            忽略
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </template>
                    </div>

                    <!-- 底部：统计 + 清空 -->
                    <div
                        class="flex items-center justify-between border-t border-[var(--zx-color-border-soft)] px-5 py-3"
                    >
                        <p class="text-xs text-[var(--zx-color-text-subtle)]">
                            好友 {{ friendRequests.length }} · 群组
                            {{ groupRequests.length }}
                        </p>
                        <div class="flex gap-2">
                            <button
                                :disabled="friendRequests.length === 0"
                                class="cursor-pointer rounded-full border border-[var(--zx-color-border)] px-3 py-1.5 text-[11px] font-semibold text-[var(--zx-color-text-muted)] transition-colors hover:text-[var(--zx-color-text)] disabled:pointer-events-none disabled:opacity-40"
                                type="button"
                                @click="clearRequests('friend')"
                            >
                                清空好友请求
                            </button>
                            <button
                                :disabled="groupRequests.length === 0"
                                class="cursor-pointer rounded-full border border-[var(--zx-color-border)] px-3 py-1.5 text-[11px] font-semibold text-[var(--zx-color-text-muted)] transition-colors hover:text-[var(--zx-color-text)] disabled:pointer-events-none disabled:opacity-40"
                                type="button"
                                @click="clearRequests('group')"
                            >
                                清空群组请求
                            </button>
                        </div>
                    </div>
        </div>
    </Transition>
</template>
