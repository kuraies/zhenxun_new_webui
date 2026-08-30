import { defineStore } from "pinia";
import { ref } from "vue";
import {
    FriendRequestResult,
    GroupRequestResult,
} from "@/types/manage.types.ts";
import { manageApi } from "@/utils/api-next";
import { ZXNotification } from "@/services/ui";
import { useBotStore } from "@/store/bot";

export const useManageStore = defineStore("manage", () => {
    const requestDialogOpen = ref(false);
    const friendRequests = ref<FriendRequestResult[]>([]);
    const groupRequests = ref<GroupRequestResult[]>([]);
    const requestsLoading = ref(false);
    const requestNum = ref(0);
    // 加载请求列表（silent=true 时不亮加载态，供轮询/推送静默刷新）
    const loadRequestList = async (silent = false) => {
        if (!silent) requestsLoading.value = true;
        try {
            // 请求按当前选中的 bot 过滤，多 bot 时互不混淆
            const botId = useBotStore().getSelectedBotId() ?? undefined;
            const res = await manageApi.getRequestList(botId);
            if (res.success && res.data) {
                friendRequests.value = res.data.friend || [];
                groupRequests.value = res.data.group || [];
                requestNum.value =
                    groupRequests.value.length + friendRequests.value.length;
            }
        } catch (error) {
            if (!silent) {
                console.error("加载请求列表失败:", error);
                ZXNotification({
                    title: "呜呼~",
                    message: "请求列表加载失败了 (っ °Д °;) っ",
                    type: "😭",
                    position: "top-right",
                });
            }
        } finally {
            if (!silent) requestsLoading.value = false;
        }
    };

    return {
        requestDialogOpen,
        friendRequests,
        groupRequests,
        requestsLoading,
        requestNum,
        loadRequestList,
    };
});
