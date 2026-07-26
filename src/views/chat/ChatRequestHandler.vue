<script setup lang="ts">
import { onMounted, ref } from "vue";
import { Bell, X } from "lucide-vue-next";
import { storeToRefs } from "pinia";
import { ZXMessageBox, ZXNotification } from "@/services/ui";
import { useManageStore } from "@/store/manage.ts";
import { manageApi } from "@/utils/api-next";
import type {
    FriendRequestResult,
    GroupRequestResult,
} from "@/types/manage.types";

const manageStore = useManageStore();
const { requestDialogOpen, friendRequests, groupRequests, requestsLoading } =
    storeToRefs(manageStore);
const { loadRequestList } = manageStore;

const activeRequestTab = ref<"friend" | "group">("friend");

const openRequestDialog = async () => {
    requestDialogOpen.value = true;
    await loadRequestList();
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

onMounted(() => {
    loadRequestList();
});
</script>

<template>
    <div class="flex-shrink-0 border-t border-gray-100 p-2">
        <button
            class="flex w-full cursor-pointer items-center justify-center gap-2 rounded-2xl bg-slate-100 px-3 py-2 text-sm font-medium text-slate-600 transition-all hover:bg-slate-200"
            @click="openRequestDialog"
        >
            <Bell class="h-4 w-4" />
            <span>请求处理</span>
            <span
                v-if="friendRequests.length + groupRequests.length > 0"
                class="rounded-full bg-zx-primary px-1.5 py-0.5 text-[10px] text-white"
            >
                {{ friendRequests.length + groupRequests.length }}
            </span>
        </button>
    </div>

    <Teleport to="body">
        <Transition name="modal-jelly" :duration="{ enter: 500, leave: 250 }">
            <div
                v-if="requestDialogOpen"
                class="fixed inset-0 z-50 flex items-center justify-center p-4"
            >
                <div
                    class="glass-overlay fixed inset-0"
                    @click="requestDialogOpen = false"
                />
                <div
                    class="modal-content relative flex max-h-[85vh] w-full max-w-2xl flex-col overflow-hidden rounded-3xl bg-white pt-3 shadow-2xl"
                >
                    <div class="flex items-center justify-between px-6 py-4">
                        <div class="flex items-center gap-3">
                            <Bell class="h-6 w-6 text-zx-primary" />
                            <h3 class="text-lg font-semibold text-gray-800">
                                请求处理
                            </h3>
                        </div>
                        <button
                            class="cursor-pointer rounded-2xl p-1 transition-colors hover:bg-white/50"
                            @click="requestDialogOpen = false"
                        >
                            <X class="h-5 w-5 text-gray-500" />
                        </button>
                    </div>

                    <div class="flex border-b border-gray-100">
                        <button
                            :class="[
                                'flex-1 cursor-pointer px-4 py-3 text-sm font-medium transition-all',
                                activeRequestTab === 'friend'
                                    ? 'border-zx-primary bg-zx-primary-tint text-zx-primary'
                                    : 'text-gray-500 hover:bg-gray-50',
                            ]"
                            @click="activeRequestTab = 'friend'"
                        >
                            好友请求 ({{ friendRequests.length }})
                        </button>
                        <button
                            :class="[
                                'flex-1 cursor-pointer px-4 py-3 text-sm font-medium transition-all',
                                activeRequestTab === 'group'
                                    ? 'border-zx-primary bg-zx-primary-tint text-zx-primary'
                                    : 'text-gray-500 hover:bg-gray-50',
                            ]"
                            @click="activeRequestTab = 'group'"
                        >
                            群组请求 ({{ groupRequests.length }})
                        </button>
                    </div>

                    <div class="flex-1 overflow-y-auto p-4">
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

                        <div
                            v-else-if="activeRequestTab === 'friend'"
                            class="space-y-3"
                        >
                            <div
                                v-if="friendRequests.length === 0"
                                class="py-12 text-center text-gray-400"
                            >
                                <Bell
                                    class="mx-auto mb-2 h-12 w-12 opacity-20"
                                />
                                <p class="text-sm">暂无好友请求</p>
                            </div>
                            <div
                                v-for="req in friendRequests"
                                :key="req.oid"
                                class="flex items-center gap-3 rounded-2xl border border-gray-100 bg-gray-50 p-3"
                            >
                                <img
                                    :src="req.ava_url"
                                    class="h-12 w-12 rounded-full"
                                />
                                <div class="min-w-0 flex-1">
                                    <div class="font-medium text-gray-800">
                                        {{ req.nickname || "未知" }}
                                    </div>
                                    <div class="text-xs text-gray-500">
                                        ID: {{ req.id }}
                                    </div>
                                    <div
                                        v-if="req.comment"
                                        class="mt-1 text-xs text-gray-400"
                                    >
                                        备注：{{ req.comment }}
                                    </div>
                                </div>
                                <div class="flex gap-2">
                                    <button
                                        class="rounded-2xl bg-green-50 px-3 py-1.5 text-xs font-medium text-green-600 hover:bg-green-100"
                                        @click="handleRequest(req, 'approve')"
                                    >
                                        同意
                                    </button>
                                    <button
                                        class="rounded-2xl bg-red-50 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-100"
                                        @click="handleRequest(req, 'refused')"
                                    >
                                        拒绝
                                    </button>
                                    <button
                                        class="rounded-2xl bg-gray-100 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-200"
                                        @click="handleRequest(req, 'ignore')"
                                    >
                                        忽略
                                    </button>
                                </div>
                            </div>
                        </div>

                        <div
                            v-else-if="activeRequestTab === 'group'"
                            class="space-y-3"
                        >
                            <div
                                v-if="groupRequests.length === 0"
                                class="py-12 text-center text-gray-400"
                            >
                                <Bell
                                    class="mx-auto mb-2 h-12 w-12 opacity-20"
                                />
                                <p class="text-sm">暂无群组请求</p>
                            </div>
                            <div
                                v-for="req in groupRequests"
                                :key="req.oid"
                                class="flex items-center gap-3 rounded-2xl border border-gray-100 bg-gray-50 p-3"
                            >
                                <img
                                    :src="req.ava_url"
                                    class="h-12 w-12 rounded-full"
                                />
                                <div class="min-w-0 flex-1">
                                    <div class="font-medium text-gray-800">
                                        {{ req.nickname || "未知" }}
                                    </div>
                                    <div class="text-xs text-gray-500">
                                        ID: {{ req.id }}
                                    </div>
                                    <div class="mt-1 text-xs text-gray-400">
                                        邀请群：{{ req.invite_group }}
                                    </div>
                                    <div
                                        v-if="req.comment"
                                        class="mt-1 text-xs text-gray-400"
                                    >
                                        备注：{{ req.comment }}
                                    </div>
                                </div>
                                <div class="flex gap-2">
                                    <button
                                        class="rounded-2xl bg-green-50 px-3 py-1.5 text-xs font-medium text-green-600 hover:bg-green-100"
                                        @click="handleRequest(req, 'approve')"
                                    >
                                        同意
                                    </button>
                                    <button
                                        class="rounded-2xl bg-red-50 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-100"
                                        @click="handleRequest(req, 'refused')"
                                    >
                                        拒绝
                                    </button>
                                    <button
                                        class="rounded-2xl bg-gray-100 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-200"
                                        @click="handleRequest(req, 'ignore')"
                                    >
                                        忽略
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div
                        class="flex items-center justify-between border-t border-gray-100 px-6 py-4"
                    >
                        <div class="space-x-4 text-xs text-gray-500">
                            <span>好友请求：{{ friendRequests.length }}</span>
                            <span>群组请求：{{ groupRequests.length }}</span>
                        </div>
                        <div class="flex gap-2">
                            <el-button
                                :disabled="friendRequests.length === 0"
                                round
                                size="small"
                                @click="clearRequests('friend')"
                            >
                                清空好友请求
                            </el-button>
                            <el-button
                                :disabled="groupRequests.length === 0"
                                round
                                size="small"
                                @click="clearRequests('group')"
                            >
                                清空群组请求
                            </el-button>
                        </div>
                    </div>
                </div>
            </div>
        </Transition>
    </Teleport>
</template>
