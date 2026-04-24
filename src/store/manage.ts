import { defineStore } from "pinia";
import { ref } from "vue";
import {
    FriendRequestResult,
    GroupRequestResult,
} from "@/types/manage.types.ts";
import { manageApi } from "@/utils/api-next";
import { ZXNotification } from "@/components";

export const useManageStore = defineStore("manage", () => {
    const requestDialogOpen = ref(false);
    const friendRequests = ref<FriendRequestResult[]>([]);
    const groupRequests = ref<GroupRequestResult[]>([]);
    const requestsLoading = ref(false);
    const requestNum = ref(0);
    // 加载请求列表
    const loadRequestList = async () => {
        requestsLoading.value = true;
        try {
            const res = await manageApi.getRequestList();
            if (res.success && res.data) {
                friendRequests.value = res.data.friend || [];
                groupRequests.value = res.data.group || [];
                requestNum.value =
                    groupRequests.value.length + friendRequests.value.length;
            }
        } catch (error) {
            console.error("加载请求列表失败:", error);
            ZXNotification({
                title: "呜呼~",
                message: "请求列表加载失败了 (っ °Д °;) っ",
                type: "😭",
                position: "top-right",
            });
        } finally {
            requestsLoading.value = false;
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
