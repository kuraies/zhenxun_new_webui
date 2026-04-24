<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { Line } from "vue-chartjs";
import {
    CategoryScale,
    Chart as ChartJS,
    type ChartOptions,
    Filler,
    Legend,
    LinearScale,
    LineElement,
    PointElement,
    Title,
    Tooltip,
} from "chart.js";
import {
    Bell,
    Blocks,
    ChevronDown,
    ChevronLeft,
    ChevronRight,
    Group,
    MessageSquare,
    Search,
    Settings,
    Trash2,
    TrendingUp,
    Users,
    Zap,
} from "lucide-vue-next";
import { ZXMessageBox, ZXNotification } from "@/components";
import { manageApi } from "@/utils/api-next";
import type {
    Friend,
    FriendDetail,
    FriendRequestResult,
    FriendTrend,
    Group as GroupType,
    GroupDetailNew,
    GroupPlugin,
    GroupRequestResult,
    MemberDetail,
} from "@/types/manage.types";
import { useManageStore } from "@/store/manage.ts";
import { storeToRefs } from "pinia";
import { useBotStore } from "@/store/bot.ts";
import { useGlobalStore } from "@/store/global.ts";

// 注册 ChartJS 组件
ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend,
    Filler,
);

const manageStore = useManageStore();
const botStore = useBotStore();
const globalStore = useGlobalStore();
const { selectedBotId } = storeToRefs(botStore);

// 请求列表
const { requestDialogOpen, friendRequests, groupRequests, requestsLoading } =
    storeToRefs(manageStore);
const { loadRequestList } = manageStore;

const isInitLoaded = ref(false);
// 选项卡类型
type TabType = "groups" | "friends";

const loading = ref(false);
const activeTab = ref<TabType>("groups");
const searchQuery = ref("");
const groups = ref<GroupType[]>([]);
const friends = ref<Friend[]>([]);
const sendMessageDialogOpen = ref(false);
const currentFriend = ref<Friend | null>(null);
const messageContent = ref("");

// 移动端侧边栏显示状态
const showSidebar = ref(true);

// 选中项
const selectedGroupId = ref<string | null>(null);
const selectedUserId = ref<string | null>(null);

// 详情数据
const groupDetail = ref<GroupDetailNew | null>(null);
const memberDetail = ref<MemberDetail | null>(null);
const groupMembers = ref<
    Array<{
        user_id: string;
        nickname: string;
        remark: string;
        ava_url: string;
        role: string;
        gold?: number;
        favorability?: number;
        is_banned?: boolean;
    }>
>([]);
const groupPlugins = ref<GroupPlugin[]>([]);

// 好友详情数据
const friendDetail = ref<FriendDetail | null>(null);
const friendTrend = ref<FriendTrend | null>(null);
const friendDetailLoading = ref(false);
const friendTrendLoading = ref(false);

// 详情面板 loading
const detailLoading = ref(false);
const pluginsLoading = ref(false);

// 成员编辑对话框
const memberEditDialogOpen = ref(false);
const currentMember = ref<(typeof groupMembers.value)[number] | null>(null);
const editGold = ref(0);
const editFavorability = ref(0);
const editIsBanned = ref(false);

// 好友编辑对话框
const friendEditDialogOpen = ref(false);
const friendEditField = ref<"gold" | "favorability">("gold");
const friendEditValue = ref(0);
const friendEditSaving = ref(false);

// 插件列表筛选
const showPassivePlugins = ref(true); // true=被动插件，false=普通插件

const activeRequestTab = ref<"friend" | "group">("friend");

// 分页相关 - 群成员列表
const memberCurrentPage = ref(1);
const memberPageSize = ref(15);

// 计算分页后的成员列表
const paginatedMembers = computed(() => {
    const start = (memberCurrentPage.value - 1) * memberPageSize.value;
    const end = start + memberPageSize.value;
    return groupMembers.value.slice(start, end);
});

// 总页数
const memberTotalPages = computed(() =>
    Math.ceil(groupMembers.value.length / memberPageSize.value),
);

// 切换页码
const changeMemberPage = (page: number) => {
    if (page < 1 || page > memberTotalPages.value) return;
    memberCurrentPage.value = page;
};

// 打开请求列表对话框
const openRequestDialog = async () => {
    requestDialogOpen.value = true;
    await loadRequestList();
};

// 处理请求
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
            // 重新加载请求列表
            await loadRequestList();
            await loadData();
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

// 清空请求
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

// 加载数据
const loadData = async () => {
    loading.value = true;

    try {
        // 👉 第一次：两个都加载
        if (!isInitLoaded.value) {
            const [groupRes, friendRes] = await Promise.all([
                manageApi.getGroupList(),
                manageApi.getFriendList(),
            ]);

            // groups
            if (groupRes?.success && groupRes?.data) {
                groups.value = groupRes.data;
            } else {
                ZXNotification({
                    title: "呜呼~",
                    message: "群组列表加载失败了 (っ °Д °;) っ",
                    type: "😭",
                    position: "top-right",
                });
            }

            // friends
            if (friendRes?.success && friendRes?.data) {
                friends.value = friendRes.data;
            } else {
                ZXNotification({
                    title: "呜呼~",
                    message: "好友列表加载失败了 (っ °Д °;) っ",
                    type: "😭",
                    position: "top-right",
                });
            }

            isInitLoaded.value = true;
            return;
        }

        // 👉 后续：只加载当前 tab
        if (activeTab.value === "groups") {
            const res = await manageApi.getGroupList();
            if (res.success && res.data) {
                groups.value = res.data;
            }
        } else {
            const res = await manageApi.getFriendList();
            if (res.success && res.data) {
                friends.value = res.data;
            }
        }
    } catch (error) {
        console.error("加载数据失败:", error);

        ZXNotification({
            title: "呜呼~",
            message: "数据加载失败了 (っ °Д °;) っ",
            type: "😭",
            position: "top-right",
        });
    } finally {
        loading.value = false;
    }
};

// 切换选项卡时加载对应数据
const switchTab = (tab: TabType) => {
    activeTab.value = tab;
    searchQuery.value = "";
    selectedGroupId.value = null;
    selectedUserId.value = null;
    groupDetail.value = null;
    memberDetail.value = null;
    groupMembers.value = [];
    groupPlugins.value = [];
    friendDetail.value = null;
    friendTrend.value = null;
    loadData();
};

// el-tabs 切换回调
const onTabChange = (name: TabType) => {
    switchTab(name);
};

// 选中群组
const selectGroup = async (group: GroupType) => {
    console.log("选中群组:", group.group_id);
    selectedGroupId.value = group.group_id;
    selectedUserId.value = null;
    detailLoading.value = true;
    groupDetail.value = null; // 重置
    groupPlugins.value = []; // 重置插件列表
    memberCurrentPage.value = 1; // 重置分页
    // 移动端选中后隐藏侧边栏
    if (window.innerWidth < 640) {
        showSidebar.value = false;
    }
    try {
        const res = await manageApi.getGroupDetail(group.group_id);
        // console.log("群组详情 API 响应:", res);
        if (res.success && res.data) {
            groupDetail.value = res.data;
            // console.log("群组详情:", groupDetail.value);
        } else {
            // console.error("获取群组详情失败:", res.message);
        }
        // 加载群成员列表
        const membersRes = await manageApi.getGroupMembers(group.group_id);
        if (membersRes.success && membersRes.data) {
            groupMembers.value = membersRes.data;
            console.log("群成员列表:", groupMembers.value.length);
        }
        // 加载群插件列表
        await loadGroupPlugins(group.group_id);
    } catch (error) {
        console.error("加载群组详情失败:", error);
    } finally {
        detailLoading.value = false;
    }
};

// 加载群插件列表
const loadGroupPlugins = async (groupId: string) => {
    pluginsLoading.value = true;
    try {
        const res = await manageApi.getGroupPlugins(groupId);
        if (res.success && res.data) {
            groupPlugins.value = res.data;
            console.log("群插件列表:", groupPlugins.value.length);
        }
    } catch (error) {
        console.error("加载群插件列表失败:", error);
    } finally {
        pluginsLoading.value = false;
    }
};

// 切换插件开关
const togglePlugin = async (plugin: GroupPlugin) => {
    if (!selectedGroupId.value) return;
    try {
        const res = await manageApi.toggleGroupPlugin({
            group_id: selectedGroupId.value,
            module: plugin.module,
            action: plugin.is_blocked ? "unblock" : "block",
            is_task: plugin.is_task,
        });
        console.log(res);
        if (res.success && res.data) {
            // plugin.is_blocked = !plugin.is_blocked;
            ZXNotification({
                title: "成功啦~",
                message: "插件设置更新成功 ♪(´▽｀)",
                type: "🥳",
                position: "top-right",
            });
        }
    } catch (error) {
        console.error("切换插件开关失败:", error);
        ZXNotification({
            title: "对不起",
            message: "设置更新失败了 (´；ω；`)",
            type: "😭",
            position: "top-right",
        });
    }
};

// 打开成员编辑对话框
const openMemberEdit = async (member: (typeof groupMembers.value)[number]) => {
    currentMember.value = member;
    // 使用已有的数据，如果没有则默认为 0
    editGold.value = member.gold ?? 0;
    editFavorability.value = member.favorability ?? 0;
    editIsBanned.value = member.is_banned ?? false;
    memberEditDialogOpen.value = true;

    // 如果还没有加载成员详情，加载一下
    if (
        selectedGroupId.value &&
        (member.gold === undefined ||
            member.favorability === undefined ||
            member.is_banned === undefined)
    ) {
        try {
            const res = await manageApi.getMemberDetail(
                member.user_id,
                selectedGroupId.value,
            );
            if (res.success && res.data) {
                editGold.value = res.data.gold;
                editFavorability.value = res.data.favorability;
                editIsBanned.value = res.data.is_banned;
                // 更新本地数据
                member.gold = res.data.gold;
                member.favorability = res.data.favorability;
                member.is_banned = res.data.is_banned;
            }
        } catch (error) {
            console.error("加载成员详情失败:", error);
        }
    }
};

// 保存成员编辑
const saveMemberEdit = async () => {
    if (!currentMember.value || !selectedGroupId.value) return;

    try {
        const res = await manageApi.updateMember({
            user_id: currentMember.value.user_id,
            group_id: selectedGroupId.value,
            gold: editGold.value,
            favorability: editFavorability.value,
            is_banned: editIsBanned.value,
        });

        if (res.success) {
            // 更新本地数据
            currentMember.value.gold = editGold.value;
            currentMember.value.favorability = editFavorability.value;
            currentMember.value.is_banned = editIsBanned.value;

            ZXNotification({
                title: "成功啦~",
                message: "成员信息更新成功 ♪(´▽｀)",
                type: "🥳",
                position: "top-right",
            });
            memberEditDialogOpen.value = false;
            currentMember.value = null;
        }
    } catch (error) {
        console.error("更新成员信息失败:", error);
        ZXNotification({
            title: "对不起",
            message: "更新失败了 (´；ω；`)",
            type: "😭",
            position: "top-right",
        });
    }
};

// 切换成员封禁状态
const toggleMemberBan = async (member: (typeof groupMembers.value)[number]) => {
    if (!selectedGroupId.value) return;

    const newBanStatus = !(member.is_banned ?? false);
    try {
        const res = await manageApi.updateMember({
            user_id: member.user_id,
            group_id: selectedGroupId.value,
            is_banned: newBanStatus,
        });

        if (res.success) {
            member.is_banned = newBanStatus;
            ZXNotification({
                title: "成功啦~",
                message: newBanStatus ? "已封禁该成员" : "已解封该成员",
                type: "🥳",
                position: "top-right",
            });
        }
    } catch (error) {
        console.error("切换封禁状态失败:", error);
        ZXNotification({
            title: "对不起",
            message: "操作失败了 (´；ω；`)",
            type: "😭",
            position: "top-right",
        });
    }
};

// 选中好友
const selectFriend = async (friend: Friend) => {
    console.log("选中好友:", friend.user_id);
    selectedUserId.value = friend.user_id;
    selectedGroupId.value = null;
    // 移动端选中后隐藏侧边栏
    if (window.innerWidth < 640) {
        showSidebar.value = false;
    }
    // 设置基础信息
    memberDetail.value = {
        user_id: friend.user_id,
        nickname: friend.nickname,
        remark: friend.remark || "",
        ava_url: friend.ava_url,
        gold: 0,
        favorability: 0,
        is_banned: false,
    };

    // 加载好友详情
    friendDetailLoading.value = true;
    friendTrendLoading.value = true;
    friendDetail.value = null;
    friendTrend.value = null;

    try {
        // 并行加载详情和趋势
        const [detailRes, trendRes] = await Promise.all([
            manageApi.getFriendDetail(
                friend.user_id,
                selectedBotId.value as string,
            ),
            manageApi.getFriendTrend(friend.user_id, 7),
        ]);

        if (detailRes.success && detailRes.data) {
            friendDetail.value = detailRes.data;
            // 更新 memberDetail
            console.log(detailRes.data);
            memberDetail.value = {
                user_id: detailRes.data.user_id,
                nickname: detailRes.data.nickname,
                remark: "",
                ava_url: detailRes.data.ava_url,
                gold: detailRes.data.gold,
                favorability: detailRes.data.favorability,
                is_banned: false,
            };
        }

        if (trendRes.success && trendRes.data) {
            friendTrend.value = trendRes.data;
        }
    } catch (error) {
        console.error("加载好友详情失败:", error);
    } finally {
        friendDetailLoading.value = false;
        friendTrendLoading.value = false;
    }
};

// 刷新好友详情
const refreshFriendDetail = async () => {
    if (!selectedUserId.value) return;
    try {
        const res = await manageApi.getFriendDetail(
            selectedUserId.value,
            <string>botStore.selectedBotId,
        );
        if (res.success && res.data) {
            friendDetail.value = res.data;
            if (memberDetail.value) {
                memberDetail.value.gold = res.data.gold;
                memberDetail.value.favorability = res.data.favorability;
            }
        }
    } catch (error) {
        console.error("刷新好友详情失败:", error);
    }
};

// 打开好友编辑对话框
const openFriendEdit = (field: "gold" | "favorability") => {
    if (!friendDetail.value) return;
    friendEditField.value = field;
    friendEditValue.value =
        field === "gold"
            ? friendDetail.value.gold
            : friendDetail.value.favorability;
    friendEditDialogOpen.value = true;
};

// 保存好友编辑
const saveFriendEdit = async () => {
    if (!selectedUserId.value || !friendDetail.value) return;

    friendEditSaving.value = true;
    try {
        const res = await manageApi.updateFriend({
            user_id: selectedUserId.value,
            [friendEditField.value]: friendEditValue.value,
        });

        if (res.success) {
            // 更新本地数据
            if (friendEditField.value === "gold") {
                friendDetail.value.gold = friendEditValue.value;
                if (memberDetail.value)
                    memberDetail.value.gold = friendEditValue.value;
            } else {
                friendDetail.value.favorability = friendEditValue.value;
                if (memberDetail.value)
                    memberDetail.value.favorability = friendEditValue.value;
            }

            ZXNotification({
                title: "成功啦~",
                message: "好友数据更新成功 ♪(´▽｀)",
                type: "🥳",
                position: "top-right",
            });
            friendEditDialogOpen.value = false;
        } else {
            ZXNotification({
                title: "呜呼~",
                message: res.message || "更新失败",
                type: "😭",
                position: "top-right",
            });
        }
    } catch (error) {
        console.error("更新好友数据失败:", error);
        ZXNotification({
            title: "对不起",
            message: "更新失败了 (´；ω；`)",
            type: "😭",
            position: "top-right",
        });
    } finally {
        friendEditSaving.value = false;
    }
};

// 过滤数据
const filteredGroups = computed(() => {
    if (!searchQuery.value) return groups.value;
    const query = searchQuery.value.toLowerCase();
    return groups.value.filter(
        (g) =>
            g.group_name.toLowerCase().includes(query) ||
            g.group_id.toLowerCase().includes(query),
    );
});

const filteredFriends = computed(() => {
    if (!searchQuery.value) return friends.value;
    const query = searchQuery.value.toLowerCase();
    return friends.value.filter(
        (f) =>
            f.nickname.toLowerCase().includes(query) ||
            f.user_id.toLowerCase().includes(query),
    );
});

// 过滤插件列表
const filteredPlugins = computed(() => {
    if (showPassivePlugins.value) {
        return groupPlugins.value.filter((p) => p.is_task);
    } else {
        return groupPlugins.value.filter((p) => !p.is_task);
    }
});

// 统计数据
const groupStats = computed(() => {
    const total = groups.value.length;
    const active = groups.value.filter((g) => g.status).length;
    const totalMembers = groups.value.reduce(
        (sum, g) => sum + (g.member_count || 0),
        0,
    );
    return {
        total,
        active,
        inactive: total - active,
        totalMembers,
    };
});

const friendStats = computed(() => ({
    total: friends.value.length,
}));

// 好友趋势图表数据
const friendTrendChartData = computed(() => {
    if (!friendTrend.value || friendTrend.value.data.length === 0) {
        return null;
    }

    return {
        labels: friendTrend.value.data.map((p) => p.date),
        datasets: [
            {
                label: "聊天次数",
                backgroundColor: "rgba(96, 170, 250, 0.2)",
                borderColor: "rgba(96, 170, 250, 1)",
                fill: true,
                tension: 0.4,
                data: friendTrend.value.data.map((p) => p.chat_count),
                yAxisID: "y",
            },
            {
                label: "调用次数",
                backgroundColor: "rgba(244, 114, 182, 0.2)",
                borderColor: "rgba(244, 114, 182, 1)",
                fill: true,
                tension: 0.4,
                data: friendTrend.value.data.map((p) => p.call_count),
                yAxisID: "y1",
            },
        ],
    };
});

// 图表配置
const friendTrendChartOptions: ChartOptions<"line"> = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
        mode: "index",
        intersect: false,
    },
    plugins: {
        legend: {
            position: "top",
            labels: {
                usePointStyle: true,
                padding: 10,
                font: { size: 11 },
            },
        },
        tooltip: {
            backgroundColor: "rgba(0, 0, 0, 0.8)",
            padding: 10,
            cornerRadius: 6,
        },
    },
    scales: {
        x: {
            grid: { display: false },
            ticks: { font: { size: 10 } },
        },
        y: {
            type: "linear",
            display: true,
            position: "left",
            title: { display: true, text: "聊天", font: { size: 10 } },
            grid: { color: "rgba(0, 0, 0, 0.05)" },
            beginAtZero: true,
        },
        y1: {
            type: "linear",
            display: true,
            position: "right",
            title: { display: true, text: "调用", font: { size: 10 } },
            grid: { drawOnChartArea: false },
            beginAtZero: true,
        },
    },
};

// 群组操作
const toggleGroupStatus = async (group: GroupType) => {
    try {
        const res = await manageApi.updateGroup({
            group_id: group.group_id,
            status: !group.status,
        });
        if (res.success) {
            group.status = !group.status;
            groupDetail.value!.status = !groupDetail.value!.status;
            ZXNotification({
                title: "成功啦~",
                message: "群组状态更新成功 ♪(´▽｀)",
                type: "🥳",
                position: "top-right",
            });
        }
    } catch (error) {
        console.error("切换群组状态失败:", error);
        ZXNotification({
            title: "对不起",
            message: "群组状态更新失败了 (´；ω；`)",
            type: "😭",
            position: "top-right",
        });
    }
};

const leaveGroup = async (group: GroupType) => {
    try {
        await ZXMessageBox({
            title: "退群确认",
            message: `确定要退出群组"${group.group_name}"吗？此操作不可恢复。`,
            cancelButtonText: "取消",
            confirmButtonText: "确定",
            type: "warning",
            onConfirm: async () => {
                const res = await manageApi.leaveGroup({
                    bot_id: "",
                    group_id: group.group_id,
                });
                if (res.success) {
                    groups.value = groups.value.filter(
                        (g) => g.group_id !== group.group_id,
                    );
                    ZXNotification({
                        title: "成功~",
                        message: "已退出群组",
                        type: "🥳",
                        position: "top-right",
                    });
                }
            },
        });
    } catch {
        return;
    }
};

// 好友操作
const sendMessage = (friend: Friend) => {
    currentFriend.value = friend;
    messageContent.value = "";
    sendMessageDialogOpen.value = true;
};

const confirmSendMessage = async () => {
    if (!currentFriend.value || !messageContent.value.trim()) return;

    try {
        const res = await manageApi.sendMessage(
            "",
            messageContent.value.trim(),
            currentFriend.value.user_id,
            undefined,
        );
        if (res.success) {
            ZXNotification({
                title: "成功啦~",
                message: "消息发送成功 ♪(´▽｀)",
                type: "🥳",
                position: "top-right",
            });
            sendMessageDialogOpen.value = false;
            currentFriend.value = null;
        }
    } catch (error) {
        console.error("发送消息失败:", error);
        ZXNotification({
            title: "呜呼~",
            message: "消息发送失败了 (´；ω；`)",
            type: "😭",
            position: "top-right",
        });
    }
};

const deleteFriend = async (friend: Friend) => {
    try {
        await ZXMessageBox({
            title: "移除好友确认",
            message: `确定要移除好友"${friend.nickname}"吗？此操作不可恢复。`,
            cancelButtonText: "取消",
            confirmButtonText: "确定",
            type: "warning",
            onConfirm: async () => {
                const res = await manageApi.deleteFriend({
                    bot_id: "",
                    user_id: friend.user_id,
                });
                if (res.success) {
                    friends.value = friends.value.filter(
                        (f) => f.user_id !== friend.user_id,
                    );
                    ZXNotification({
                        title: "成功~",
                        message: "已移除好友",
                        type: "🥳",
                        position: "top-right",
                    });
                }
            },
        });
    } catch {
        return;
    }
};

//群聊等级逻辑
const open = ref(false);

const levels = [-1, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

const selectedLevel = computed(() => groupDetail.value!.level);

const chooseLevel = async (level: number, group: GroupType) => {
    try {
        const res = await manageApi.updateGroup({
            group_id: group.group_id,
            level: level,
        });
        if (res.success) {
            group.status = !group.status;
            groupDetail.value!.level = level;
            ZXNotification({
                title: "成功啦~",
                message: "群等级更新成功 ♪(´▽｀)",
                type: "🥳",
                position: "top-right",
            });
        }
    } catch (error) {
        console.error("群等级更新失败:", error);
        ZXNotification({
            title: "对不起",
            message: "群等级更新失败了 (´；ω；`)",
            type: "😭",
            position: "top-right",
        });
    }

    open.value = false;
};

onMounted(() => {
    loadData();
});
</script>

<template>
    <div class="flex h-full w-full flex-col">
        <!-- 左右双栏布局 -->
        <div class="relative flex min-h-0 flex-1 gap-4">
            <!-- 左侧边栏 - 移动端可隐藏，响应式宽度 -->
            <div
                :class="[
                    'flex w-full min-w-0 flex-shrink-0 flex-col overflow-hidden rounded-4xl border-1 border-slate-200 bg-white p-4 pt-4 shadow-sm transition-all duration-300 sm:w-56 md:w-64 lg:w-72',
                    // 移动端：固定定位，覆盖在右侧内容上
                    showSidebar
                        ? 'absolute inset-0 z-20 sm:relative sm:inset-auto sm:z-auto'
                        : 'hidden sm:flex',
                ]"
            >
                <!-- 标签页切换 -->
                <el-tabs
                    v-model="activeTab"
                    class="manage-tabs"
                    @tab-change="onTabChange"
                >
                    <el-tab-pane name="groups">
                        <template #label>
                            <span class="tab-label">
                                <Group class="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                                <span class="text-xs sm:text-sm">群组</span>
                                <span class="tab-count">{{
                                    groupStats.total
                                }}</span>
                            </span>
                        </template>
                    </el-tab-pane>
                    <el-tab-pane name="friends">
                        <template #label>
                            <span class="tab-label">
                                <Users class="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                                <span class="text-xs sm:text-sm">好友</span>
                                <span class="tab-count">{{
                                    friendStats.total
                                }}</span>
                            </span>
                        </template>
                    </el-tab-pane>
                </el-tabs>

                <!-- 搜索栏 -->
                <div class="border-b border-gray-100 p-1.5 sm:p-2">
                    <div class="relative">
                        <Search
                            class="absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2 transform text-gray-400 sm:left-3 sm:h-4 sm:w-4"
                        />
                        <input
                            v-model="searchQuery"
                            type="text"
                            :placeholder="
                                activeTab === 'groups'
                                    ? '搜索群组...'
                                    : '搜索好友...'
                            "
                            class="w-full rounded-full border border-gray-200 py-1.5 pr-2.5 pl-8 text-xs transition-all focus:outline-none sm:py-2 sm:pr-3 sm:pl-9 sm:text-sm"
                        />
                    </div>
                </div>

                <!-- 列表内容 -->
                <div
                    class="min-h-0 flex-1 space-y-0.5 overflow-y-auto p-1.5 sm:space-y-1 sm:p-2"
                >
                    <div
                        v-if="loading"
                        class="flex items-center justify-center py-8"
                    >
                        <div class="text-center text-gray-400">
                            <div
                                class="mx-auto mb-2 h-6 w-6 animate-pulse rounded-full border-2 border-blue-500 border-t-transparent sm:h-8 sm:w-8"
                            />
                            <p class="text-xs sm:text-sm">加载中...</p>
                        </div>
                    </div>

                    <div
                        v-else-if="
                            (activeTab === 'groups' &&
                                filteredGroups.length === 0) ||
                            (activeTab === 'friends' &&
                                filteredFriends.length === 0)
                        "
                        class="flex items-center justify-center py-8"
                    >
                        <div class="text-center text-gray-400">
                            <Group
                                v-if="activeTab === 'groups'"
                                class="mx-auto mb-2 h-10 w-10 opacity-50 sm:h-12 sm:w-12"
                            />
                            <Users
                                v-else
                                class="mx-auto mb-2 h-10 w-10 opacity-50 sm:h-12 sm:w-12"
                            />
                            <p class="text-xs sm:text-sm">暂无数据</p>
                        </div>
                    </div>

                    <!-- 群组列表 -->
                    <template v-else-if="activeTab === 'groups'">
                        <div
                            v-for="group in filteredGroups"
                            :key="group.group_id"
                            @click="selectGroup(group)"
                            :class="[
                                'btn-touch flex cursor-pointer items-center gap-2 rounded-2xl p-1.5 transition-colors sm:gap-3 sm:p-2',
                                selectedGroupId === group.group_id
                                    ? 'bg-blue-50'
                                    : 'hover:bg-gray-50',
                            ]"
                        >
                            <img
                                v-if="group.ava_url"
                                :src="group.ava_url"
                                referrerpolicy="no-referrer"
                                class="h-8 w-8 flex-shrink-0 rounded-2xl object-cover sm:h-10 sm:w-10"
                                @error="group.ava_url = ''"
                            />
                            <div
                                v-else
                                class="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-2xl bg-blue-100 text-xs font-bold text-blue-600 sm:h-10 sm:w-10 sm:text-sm"
                            >
                                {{ (group.group_name || "群").charAt(0) }}
                            </div>
                            <div class="min-w-0 flex-1">
                                <div
                                    class="truncate text-xs text-gray-700 sm:text-sm"
                                >
                                    {{ group.group_name }}
                                </div>
                                <div
                                    class="truncate text-[10px] text-gray-400 sm:text-xs"
                                >
                                    {{ group.group_id }}
                                </div>
                            </div>
                        </div>
                    </template>

                    <!-- 好友列表 -->
                    <template v-else>
                        <div
                            v-for="friend in filteredFriends"
                            :key="friend.user_id"
                            @click="selectFriend(friend)"
                            :class="[
                                'btn-touch flex cursor-pointer items-center gap-2 rounded-2xl p-1.5 transition-colors sm:gap-3 sm:p-2',
                                selectedUserId === friend.user_id
                                    ? 'bg-blue-50'
                                    : 'hover:bg-gray-50',
                            ]"
                        >
                            <img
                                v-if="friend.ava_url"
                                :src="friend.ava_url"
                                referrerpolicy="no-referrer"
                                class="h-7 w-7 flex-shrink-0 rounded-full object-cover sm:h-8 sm:w-8"
                                @error="friend.ava_url = ''"
                            />
                            <div
                                v-else
                                class="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-pink-100 text-xs font-bold text-pink-600 sm:h-8 sm:w-8 sm:text-sm"
                            >
                                {{ (friend.nickname || "友").charAt(0) }}
                            </div>
                            <span
                                class="min-w-0 flex-1 truncate text-xs text-gray-700 sm:text-sm"
                                >{{ friend.nickname }}</span
                            >
                        </div>
                    </template>
                </div>

                <!-- 底部操作栏 -->
                <div
                    class="flex-shrink-0 border-t border-gray-100 p-1.5 sm:p-2"
                    v-if="!globalStore.isDesktopMode"
                >
                    <button
                        @click="openRequestDialog"
                        class="flex w-full cursor-pointer items-center justify-center gap-1.5 rounded-2xl bg-orange-50 px-2.5 py-1.5 text-xs font-medium text-orange-600 transition-all hover:bg-orange-100 sm:gap-2 sm:px-3 sm:py-2 sm:text-sm"
                    >
                        <Bell class="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                        <span>请求处理</span>
                        <span
                            v-if="
                                friendRequests.length + groupRequests.length > 0
                            "
                            class="ml-1 rounded-full bg-orange-500 px-1.5 py-0.5 text-[10px] text-white"
                        >
                            {{ friendRequests.length + groupRequests.length }}
                        </span>
                    </button>
                </div>
            </div>

            <!-- 右侧详情区域 -->
            <div
                class="flex min-w-0 flex-1 flex-col overflow-hidden rounded-4xl border-1 border-slate-200 bg-white shadow-sm"
            >
                <!-- 群组详情 -->
                <template v-if="activeTab === 'groups'">
                    <div
                        v-if="!selectedGroupId"
                        class="flex h-full items-center justify-center"
                    >
                        <div class="text-center text-gray-400">
                            <Group class="mx-auto mb-4 h-16 w-16 opacity-20" />
                            <p class="text-gray-500">请选择一个群组查看详情</p>
                        </div>
                    </div>

                    <div
                        v-else-if="detailLoading"
                        class="flex h-full items-center justify-center"
                    >
                        <div class="text-center text-gray-400">
                            <div
                                class="mx-auto mb-4 h-10 w-10 animate-pulse rounded-full border-3 border-blue-500 border-t-transparent"
                            />
                            <p>加载中...</p>
                        </div>
                    </div>

                    <div
                        v-else-if="groupDetail"
                        class="flex h-full flex-col overflow-hidden"
                    >
                        <!-- 详情头部 -->
                        <div class="border-b border-gray-100 p-6 pb-4">
                            <div class="flex items-center gap-2 sm:gap-4">
                                <!-- 移动端返回按钮 -->
                                <button
                                    @click="showSidebar = true"
                                    class="flex-shrink-0 rounded-2xl p-2 transition-colors hover:bg-white/50 sm:hidden"
                                >
                                    <ChevronLeft
                                        class="h-5 w-5 text-gray-600"
                                    />
                                </button>
                                <img
                                    :src="groupDetail.ava_url"
                                    class="h-18 w-18 flex-shrink-0 rounded-full object-cover shadow-md"
                                />
                                <div class="min-w-0 flex-1">
                                    <h2
                                        class="truncate text-base font-bold text-gray-800 sm:text-xl"
                                    >
                                        {{ groupDetail.group_name }}
                                    </h2>
                                    <p
                                        class="mt-0.5 truncate text-xs text-gray-500 sm:mt-1 sm:text-sm"
                                    >
                                        {{ groupDetail.group_id }}
                                    </p>
                                    <div
                                        class="mt-1.5 flex flex-wrap items-center gap-2 sm:mt-2"
                                    >
                                        <span
                                            :class="[
                                                'rounded-full px-3 py-1 text-sm',
                                                groupDetail.status
                                                    ? 'bg-blue-100 text-blue-600'
                                                    : 'bg-gray-100 text-gray-500',
                                            ]"
                                        >
                                            {{
                                                groupDetail.status
                                                    ? "已启用"
                                                    : "已禁用"
                                            }}
                                        </span>
                                        <span
                                            v-if="groupDetail.is_super"
                                            class="rounded-full bg-purple-100 px-2 py-0.5 text-[10px] text-purple-600 sm:py-1 sm:text-xs"
                                        >
                                            超级群
                                        </span>
                                    </div>
                                </div>
                                <div
                                    class="flex flex-shrink-0 gap-1.5 sm:gap-2"
                                >
                                    <button
                                        @click="
                                            toggleGroupStatus(
                                                groups.find(
                                                    (g) =>
                                                        g.group_id ===
                                                        selectedGroupId,
                                                )!,
                                            )
                                        "
                                        :class="[
                                            'cursor-pointer rounded-full px-5 py-1.5 text-xs font-medium transition-all sm:text-sm',
                                            groupDetail.status
                                                ? 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                                : 'bg-blue-500 text-white hover:bg-blue-600',
                                        ]"
                                    >
                                        {{
                                            groupDetail.status ? "禁用" : "启用"
                                        }}
                                    </button>
                                    <button
                                        @click="
                                            leaveGroup(
                                                groups.find(
                                                    (g) =>
                                                        g.group_id ===
                                                        selectedGroupId,
                                                )!,
                                            )
                                        "
                                        class="cursor-pointer rounded-2xl bg-red-50 px-5 py-1.5 text-xs font-medium text-red-600 transition-all hover:bg-red-100 sm:text-sm"
                                    >
                                        退出
                                    </button>
                                </div>
                            </div>
                        </div>

                        <!-- 详情内容 -->
                        <div class="flex-1 overflow-y-auto p-2 sm:p-4">
                            <!-- 统计卡片 -->
                            <!--                            <div-->
                            <!--                                class="mb-3 grid grid-cols-2 gap-2 sm:mb-4 sm:gap-3"-->
                            <!--                            >-->
                            <!--                                <div-->
                            <!--                                    class="rounded-2xl bg-gradient-to-br from-blue-50 to-blue-100 p-2 text-center sm:p-3"-->
                            <!--                                >-->
                            <!--                                    <div-->
                            <!--                                        class="text-lg font-bold text-blue-600 sm:text-xl"-->
                            <!--                                    >-->
                            <!--                                        {{ groupMembers.length }}-->
                            <!--                                    </div>-->
                            <!--                                    <div-->
                            <!--                                        class="mt-0.5 text-[10px] text-gray-600 sm:mt-1 sm:text-xs"-->
                            <!--                                    >-->
                            <!--                                        总人数-->
                            <!--                                    </div>-->
                            <!--                                </div>-->
                            <!--                                <div-->
                            <!--                                    class="rounded-2xl bg-gradient-to-br from-purple-50 to-purple-100 p-2 text-center sm:p-3"-->
                            <!--                                >-->
                            <!--                                    <div-->
                            <!--                                        class="text-lg font-bold text-purple-600 sm:text-xl"-->
                            <!--                                    >-->
                            <!--                                        {{ groupDetail.level }}-->
                            <!--                                    </div>-->
                            <!--                                    <div-->
                            <!--                                        class="mt-0.5 text-[10px] text-gray-600 sm:mt-1 sm:text-xs"-->
                            <!--                                    >-->
                            <!--                                        群等级-->
                            <!--                                    </div>-->
                            <!--                                </div>-->
                            <!--                            </div>-->

                            <div class="mb-3 sm:mb-4">
                                <div
                                    class="mb-2 flex flex-wrap items-center justify-between gap-2"
                                >
                                    <h3
                                        class="flex items-center gap-1 text-xs font-semibold text-gray-700 sm:gap-2 sm:text-sm"
                                    >
                                        <Settings
                                            class="h-3 w-3 sm:h-4 sm:w-4"
                                        />
                                        群聊设置
                                    </h3>
                                </div>
                                <div class="p-3 select-none">
                                    <div
                                        class="relative flex w-fit items-center justify-center gap-2 rounded-full border border-slate-200 px-4 py-1.5 shadow-sm"
                                    >
                                        <div class="text-sm">群等级</div>
                                        <div
                                            class="h-3.5 w-[1px] bg-black/30"
                                        ></div>
                                        <div
                                            @click="open = !open"
                                            class="flex cursor-pointer items-center space-x-1 font-medium text-blue-500"
                                        >
                                            <span>{{ selectedLevel }}</span>

                                            <ChevronDown
                                                class="h-3 w-3 transition"
                                                :class="open && 'rotate-180'"
                                            />
                                        </div>
                                        <!-- 展开选择器 -->
                                        <transition
                                            enter-active-class="transition duration-200"
                                            leave-active-class="transition duration-150"
                                            enter-from-class="opacity-0 scale-95 -translate-y-2"
                                            leave-to-class="opacity-0 scale-95 -translate-y-2"
                                        >
                                            <div
                                                v-show="open"
                                                class="absolute top-full right-0 z-50 mt-1 min-w-12 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl"
                                            >
                                                <button
                                                    v-for="level in levels"
                                                    :key="level"
                                                    @click="
                                                        chooseLevel(
                                                            level,
                                                            groups.find(
                                                                (g) =>
                                                                    g.group_id ===
                                                                    selectedGroupId,
                                                            )!,
                                                        )
                                                    "
                                                    class="flex w-full items-center justify-between justify-center py-1 text-center text-sm transition hover:bg-slate-100"
                                                    :class="
                                                        selectedLevel ===
                                                            level &&
                                                        'bg-blue-50 text-blue-500'
                                                    "
                                                >
                                                    <span>{{ level }}</span>
                                                </button>
                                            </div>
                                        </transition>
                                    </div>
                                </div>
                            </div>

                            <!-- 插件列表 -->
                            <div class="mb-3 sm:mb-4">
                                <div
                                    class="mb-2 flex flex-wrap items-center justify-between gap-2"
                                >
                                    <h3
                                        class="flex items-center gap-1 text-xs font-semibold text-gray-700 sm:gap-2 sm:text-sm"
                                    >
                                        <Blocks class="h-3 w-3 sm:h-4 sm:w-4" />
                                        插件列表
                                    </h3>
                                    <div
                                        class="flex items-center gap-1 sm:gap-2"
                                    >
                                        <div
                                            class="flex rounded-2xl bg-gray-100 p-0.5 sm:p-1"
                                        >
                                            <button
                                                @click="
                                                    showPassivePlugins = true
                                                "
                                                :class="[
                                                    'cursor-pointer rounded-2xl px-2 py-0.5 text-[10px] font-medium transition-all sm:px-3 sm:py-1 sm:text-xs',
                                                    showPassivePlugins
                                                        ? 'bg-white text-blue-600 shadow-sm'
                                                        : 'text-gray-500 hover:text-gray-700',
                                                ]"
                                            >
                                                被动 ({{
                                                    groupPlugins.filter(
                                                        (p) => p.is_task,
                                                    ).length
                                                }})
                                            </button>
                                            <button
                                                @click="
                                                    showPassivePlugins = false
                                                "
                                                :class="[
                                                    'cursor-pointer rounded-2xl px-2 py-0.5 text-[10px] font-medium transition-all sm:px-3 sm:py-1 sm:text-xs',
                                                    !showPassivePlugins
                                                        ? 'bg-white text-blue-600 shadow-sm'
                                                        : 'text-gray-500 hover:text-gray-700',
                                                ]"
                                            >
                                                普通 ({{
                                                    groupPlugins.filter(
                                                        (p) => !p.is_task,
                                                    ).length
                                                }})
                                            </button>
                                        </div>
                                    </div>
                                </div>
                                <div
                                    v-if="pluginsLoading"
                                    class="max-h-64 overflow-y-auto rounded-2xl bg-gray-50 p-2 sm:p-3"
                                >
                                    <div
                                        class="flex items-center justify-center py-8"
                                    >
                                        <div class="text-sm text-gray-400">
                                            加载中...
                                        </div>
                                    </div>
                                </div>
                                <div
                                    v-else-if="filteredPlugins.length === 0"
                                    class="max-h-64 overflow-y-auto rounded-2xl bg-gray-50 p-2 sm:p-3"
                                >
                                    <div
                                        class="flex items-center justify-center py-8"
                                    >
                                        <div class="text-center text-gray-400">
                                            <Blocks
                                                class="mx-auto mb-2 h-10 w-10 opacity-20 sm:h-12 sm:w-12"
                                            />
                                            <p class="text-xs sm:text-sm">
                                                暂无插件数据
                                            </p>
                                        </div>
                                    </div>
                                </div>
                                <div
                                    v-else
                                    class="max-h-64 overflow-y-auto rounded-2xl bg-gray-50 p-2 sm:p-3"
                                >
                                    <div
                                        class="grid grid-cols-2 gap-1.5 min-[950px]:grid-cols-3 min-[1150px]:grid-cols-4 sm:gap-2"
                                    >
                                        <div
                                            v-for="plugin in filteredPlugins"
                                            :key="plugin.module"
                                            class="flex flex-col justify-center rounded-2xl border border-gray-100 bg-white p-1.5 transition-all hover:border-blue-200 sm:p-2"
                                        >
                                            <div
                                                class="flex min-w-0 items-center gap-1 sm:gap-2"
                                            >
                                                <Blocks
                                                    :class="[
                                                        'h-3 w-3 flex-shrink-0 sm:h-4 sm:w-4',
                                                        plugin.is_task
                                                            ? 'text-orange-500'
                                                            : 'text-blue-500',
                                                    ]"
                                                />
                                                <div class="min-w-0 flex-1">
                                                    <div
                                                        class="truncate text-[10px] font-medium text-gray-800 sm:text-sm"
                                                    >
                                                        {{ plugin.plugin_name }}
                                                    </div>
                                                </div>
                                            </div>
                                            <div
                                                class="mt-1 flex items-center justify-end"
                                            >
                                                <el-switch
                                                    :model-value="
                                                        !plugin.is_blocked
                                                    "
                                                    @update:model-value="
                                                        (val: any) => {
                                                            plugin.is_blocked =
                                                                !val;
                                                            togglePlugin(
                                                                plugin,
                                                            );
                                                        }
                                                    "
                                                    size="small"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <!-- 成员列表 -->
                            <div class="overflow-x-auto">
                                <h3
                                    class="mb-2 flex items-center gap-1 text-xs font-semibold text-gray-700 sm:gap-2 sm:text-sm"
                                >
                                    <Users class="h-3 w-3 sm:h-4 sm:w-4" />
                                    群成员列表 ({{ groupMembers.length }})
                                </h3>
                                <div
                                    class="min-w-[800px] overflow-hidden rounded-2xl bg-gray-50"
                                >
                                    <table class="w-full">
                                        <thead class="bg-gray-100">
                                            <tr>
                                                <th
                                                    class="px-4 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase"
                                                >
                                                    成员
                                                </th>
                                                <th
                                                    class="px-4 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase"
                                                >
                                                    角色
                                                </th>
                                                <th
                                                    class="px-4 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase"
                                                >
                                                    金币
                                                </th>
                                                <th
                                                    class="px-4 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase"
                                                >
                                                    好感度
                                                </th>
                                                <th
                                                    class="px-4 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase"
                                                >
                                                    状态
                                                </th>
                                                <th
                                                    class="px-4 py-3 text-right text-xs font-medium tracking-wider text-gray-500 uppercase"
                                                >
                                                    操作
                                                </th>
                                            </tr>
                                        </thead>
                                        <tbody
                                            class="divide-y divide-gray-100 bg-white"
                                        >
                                            <tr
                                                v-for="member in paginatedMembers"
                                                :key="member.user_id"
                                                class="transition-colors hover:bg-gray-50"
                                            >
                                                <td class="px-4 py-3">
                                                    <div
                                                        class="flex items-center gap-3"
                                                    >
                                                        <img
                                                            :src="
                                                                member.ava_url
                                                            "
                                                            class="h-10 w-10 rounded-full"
                                                        />
                                                        <div>
                                                            <div
                                                                class="text-sm font-medium text-gray-800"
                                                            >
                                                                {{
                                                                    member.remark ||
                                                                    member.nickname
                                                                }}
                                                            </div>
                                                            <div
                                                                class="text-xs text-gray-400"
                                                            >
                                                                {{
                                                                    member.user_id
                                                                }}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td class="px-4 py-3">
                                                    <span
                                                        :class="[
                                                            'rounded-full px-4 py-1 text-xs',
                                                            member.role ===
                                                            'owner'
                                                                ? 'bg-red-100 text-red-600'
                                                                : member.role ===
                                                                    'administrator'
                                                                  ? 'bg-blue-100 text-blue-600'
                                                                  : 'bg-gray-100 text-gray-500',
                                                        ]"
                                                    >
                                                        {{
                                                            member.role ===
                                                            "owner"
                                                                ? "群主"
                                                                : member.role ===
                                                                    "administrator"
                                                                  ? "管理员"
                                                                  : "成员"
                                                        }}
                                                    </span>
                                                </td>
                                                <td class="px-4 py-3">
                                                    <div
                                                        class="flex items-center gap-1 text-sm text-gray-600"
                                                    >
                                                        <span>{{
                                                            member.gold ?? 0
                                                        }}</span>
                                                    </div>
                                                </td>
                                                <td class="px-4 py-3">
                                                    <div
                                                        class="flex items-center gap-1 text-sm text-gray-600"
                                                    >
                                                        <span>{{
                                                            member.favorability ??
                                                            0
                                                        }}</span>
                                                    </div>
                                                </td>
                                                <td class="px-4 py-3">
                                                    <span
                                                        v-if="member.is_banned"
                                                        class="rounded-full bg-red-100 px-4 py-1 text-xs text-red-600"
                                                    >
                                                        已封禁
                                                    </span>
                                                    <span
                                                        v-else
                                                        class="rounded-full bg-green-100 px-4 py-1 text-xs text-green-600"
                                                    >
                                                        正常
                                                    </span>
                                                </td>
                                                <td
                                                    class="px-4 py-3 text-right"
                                                >
                                                    <div
                                                        class="flex items-center justify-end gap-2"
                                                    >
                                                        <!--                                                        大饼状态-->
                                                        <!--                                                        <button-->
                                                        <!--                                                            @click="-->
                                                        <!--                                                                toggleMemberBan(-->
                                                        <!--                                                                    member,-->
                                                        <!--                                                                )-->
                                                        <!--                                                            "-->
                                                        <!--                                                            :class="[-->
                                                        <!--                                                                'cursor-pointer rounded-2xl px-4 py-1 text-xs',-->
                                                        <!--                                                                member.is_banned-->
                                                        <!--                                                                    ? 'bg-green-50 text-green-600 hover:bg-green-100'-->
                                                        <!--                                                                    : 'bg-red-50 text-red-600 hover:bg-red-100',-->
                                                        <!--                                                            ]"-->
                                                        <!--                                                        >-->
                                                        <!--                                                            {{-->
                                                        <!--                                                                member.is_banned-->
                                                        <!--                                                                    ? "解封"-->
                                                        <!--                                                                    : "封禁"-->
                                                        <!--                                                            }}-->
                                                        <!--                                                        </button>-->
                                                        <button
                                                            @click="
                                                                openMemberEdit(
                                                                    member,
                                                                )
                                                            "
                                                            class="cursor-pointer rounded-2xl bg-blue-50 px-4 py-1 text-xs text-blue-600 hover:bg-blue-100"
                                                        >
                                                            编辑
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>
                                <!-- 分页控件 -->
                                <div
                                    v-if="memberTotalPages > 1"
                                    class="mt-3 flex items-center justify-between px-2"
                                >
                                    <span class="text-sm text-gray-500">
                                        第 {{ memberCurrentPage }} 页，共
                                        {{ memberTotalPages }} 页，总计
                                        {{ groupMembers.length }} 人
                                    </span>
                                    <div class="flex items-center gap-2">
                                        <el-button
                                            size="small"
                                            :disabled="memberCurrentPage === 1"
                                            @click="
                                                changeMemberPage(
                                                    memberCurrentPage - 1,
                                                )
                                            "
                                            class="flex items-center gap-1"
                                        >
                                            <ChevronLeft class="h-4 w-4" />
                                            上一页
                                        </el-button>
                                        <el-button
                                            size="small"
                                            :disabled="
                                                memberCurrentPage ===
                                                memberTotalPages
                                            "
                                            @click="
                                                changeMemberPage(
                                                    memberCurrentPage + 1,
                                                )
                                            "
                                            class="flex items-center gap-1"
                                        >
                                            下一页
                                            <ChevronRight class="h-4 w-4" />
                                        </el-button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div v-else class="flex h-full items-center justify-center">
                        <div class="text-center text-gray-400">
                            <Group class="mx-auto mb-4 h-16 w-16 opacity-20" />
                            <p class="text-gray-500">暂无详情数据</p>
                            <p class="mt-2 text-xs text-gray-400">
                                selectedGroupId: {{ selectedGroupId }}
                            </p>
                        </div>
                    </div>
                </template>

                <!-- 好友详情 -->
                <template v-else>
                    <div
                        v-if="!selectedUserId"
                        class="flex h-full items-center justify-center"
                    >
                        <div class="text-center text-gray-400">
                            <Users class="mx-auto mb-4 h-16 w-16 opacity-20" />
                            <p class="text-gray-500">请选择一个好友查看详情</p>
                        </div>
                    </div>

                    <div v-else-if="memberDetail" class="flex h-full flex-col">
                        <!-- 详情头部 -->
                        <div class="border-b border-gray-100 p-6">
                            <div class="flex items-center gap-2 sm:gap-4">
                                <!-- 移动端返回按钮 -->
                                <button
                                    @click="showSidebar = true"
                                    class="flex-shrink-0 rounded-2xl p-2 transition-colors hover:bg-white/50 sm:hidden"
                                >
                                    <ChevronLeft
                                        class="h-5 w-5 text-gray-600"
                                    />
                                </button>
                                <img
                                    :src="
                                        'ava_url' in memberDetail
                                            ? memberDetail.ava_url
                                            : ''
                                    "
                                    class="h-12 w-12 flex-shrink-0 rounded-full object-cover shadow-md sm:h-16 sm:w-16"
                                />
                                <div class="min-w-0 flex-1">
                                    <h2
                                        class="truncate text-base font-bold text-gray-800 sm:text-xl"
                                    >
                                        {{
                                            "nickname" in memberDetail
                                                ? memberDetail.nickname
                                                : ""
                                        }}
                                    </h2>
                                    <p
                                        class="mt-0.5 text-xs text-gray-500 sm:mt-1 sm:text-sm"
                                    >
                                        {{
                                            "user_id" in memberDetail
                                                ? memberDetail.user_id
                                                : ""
                                        }}
                                    </p>
                                </div>
                                <div
                                    class="flex flex-shrink-0 gap-1.5 sm:gap-2"
                                >
                                    <!--                                    <button-->
                                    <!--                                        @click="-->
                                    <!--                                            sendMessage(memberDetail as any)-->
                                    <!--                                        "-->
                                    <!--                                        class="flex items-center gap-1.5 rounded-2xl bg-blue-500 px-2 py-1.5 text-xs font-medium text-white transition-all hover:bg-blue-600 sm:gap-2 sm:px-4 sm:py-2 sm:text-sm"-->
                                    <!--                                    >-->
                                    <!--                                        <MessageSquare class="h-4 w-4" />-->
                                    <!--                                        <span class="hidden sm:inline"-->
                                    <!--                                            >发消息</span-->
                                    <!--                                        >-->
                                    <!--                                        <span class="sm:hidden">消息</span>-->
                                    <!--                                    </button>-->
                                    <button
                                        @click="
                                            deleteFriend(memberDetail as any)
                                        "
                                        class="flex items-center gap-1.5 rounded-2xl bg-red-50 px-2 py-1.5 text-xs font-medium text-red-600 transition-all hover:bg-red-100 sm:gap-2 sm:px-4 sm:py-2 sm:text-sm"
                                    >
                                        <Trash2 class="h-4 w-4" />
                                        <span class="hidden sm:inline"
                                            >删除</span
                                        >
                                    </button>
                                </div>
                            </div>
                        </div>

                        <!-- 好友详情内容 -->
                        <div class="flex-1 space-y-4 overflow-y-auto p-4">
                            <!-- 加载状态 -->
                            <div
                                v-if="friendDetailLoading"
                                class="flex items-center justify-center py-12"
                            >
                                <div
                                    class="h-8 w-8 animate-spin rounded-full border-b-2 border-blue-500"
                                ></div>
                            </div>

                            <!-- 详情内容 -->
                            <template v-else-if="friendDetail">
                                <!-- 金币和好感度卡片 -->
                                <!--                                <div class="grid grid-cols-2 gap-3">-->
                                <!--                                    &lt;!&ndash; 金币 &ndash;&gt;-->
                                <!--                                    <div-->
                                <!--                                        class="rounded-2xl border-1 border-amber-200 bg-gradient-to-br from-amber-50 to-orange-50 p-4"-->
                                <!--                                    >-->
                                <!--                                        <div-->
                                <!--                                            class="mb-2 flex items-center gap-2"-->
                                <!--                                        >-->
                                <!--                                            <Coins-->
                                <!--                                                class="h-4 w-4 text-amber-600"-->
                                <!--                                            />-->
                                <!--                                            <span-->
                                <!--                                                class="text-sm font-medium text-gray-600"-->
                                <!--                                                >金币</span-->
                                <!--                                            >-->
                                <!--                                        </div>-->
                                <!--                                        <div-->
                                <!--                                            class="flex items-center justify-between"-->
                                <!--                                        >-->
                                <!--                                            <span-->
                                <!--                                                class="text-2xl font-bold text-amber-600"-->
                                <!--                                            >-->
                                <!--                                                {{-->
                                <!--                                                    friendDetail.gold.toLocaleString()-->
                                <!--                                                }}-->
                                <!--                                            </span>-->
                                <!--                                            <button-->
                                <!--                                                @click="openFriendEdit('gold')"-->
                                <!--                                                class="rounded-lg p-1.5 transition-colors hover:bg-amber-100"-->
                                <!--                                            >-->
                                <!--                                                <Pencil-->
                                <!--                                                    class="h-3.5 w-3.5 text-amber-600"-->
                                <!--                                                />-->
                                <!--                                            </button>-->
                                <!--                                        </div>-->
                                <!--                                    </div>-->

                                <!--                                    &lt;!&ndash; 好感度 &ndash;&gt;-->
                                <!--                                    <div-->
                                <!--                                        class="rounded-2xl border-1 border-pink-200 bg-gradient-to-br from-pink-50 to-rose-50 p-4"-->
                                <!--                                    >-->
                                <!--                                        <div-->
                                <!--                                            class="mb-2 flex items-center gap-2"-->
                                <!--                                        >-->
                                <!--                                            <Heart-->
                                <!--                                                class="h-4 w-4 text-pink-600"-->
                                <!--                                            />-->
                                <!--                                            <span-->
                                <!--                                                class="text-sm font-medium text-gray-600"-->
                                <!--                                                >好感度</span-->
                                <!--                                            >-->
                                <!--                                        </div>-->
                                <!--                                        <div-->
                                <!--                                            class="flex items-center justify-between"-->
                                <!--                                        >-->
                                <!--                                            <span-->
                                <!--                                                class="text-2xl font-bold text-pink-600"-->
                                <!--                                            >-->
                                <!--                                                {{-->
                                <!--                                                    friendDetail.favorability.toFixed(-->
                                <!--                                                        1,-->
                                <!--                                                    )-->
                                <!--                                                }}-->
                                <!--                                            </span>-->
                                <!--                                            <button-->
                                <!--                                                @click="-->
                                <!--                                                    openFriendEdit(-->
                                <!--                                                        'favorability',-->
                                <!--                                                    )-->
                                <!--                                                "-->
                                <!--                                                class="rounded-lg p-1.5 transition-colors hover:bg-pink-100"-->
                                <!--                                            >-->
                                <!--                                                <Pencil-->
                                <!--                                                    class="h-3.5 w-3.5 text-pink-600"-->
                                <!--                                                />-->
                                <!--                                            </button>-->
                                <!--                                        </div>-->
                                <!--                                    </div>-->
                                <!--                                </div>-->

                                <!-- 互动趋势 -->
                                <div
                                    class="rounded-2xl border-1 border-slate-200 bg-white p-4"
                                >
                                    <div
                                        class="mb-3 flex items-center justify-between"
                                    >
                                        <div class="flex items-center gap-2">
                                            <TrendingUp
                                                class="h-4 w-4 text-blue-500"
                                            />
                                            <span
                                                class="text-sm font-semibold text-gray-700"
                                                >近7天互动趋势</span
                                            >
                                        </div>
                                        <div
                                            v-if="friendTrend"
                                            class="flex items-center gap-3 text-xs text-gray-500"
                                        >
                                            <span
                                                class="flex items-center gap-1"
                                            >
                                                <MessageSquare
                                                    class="h-3 w-3"
                                                />
                                                {{ friendTrend.total_chat }}
                                            </span>
                                            <span
                                                class="flex items-center gap-1"
                                            >
                                                <Zap class="h-3 w-3" />
                                                {{ friendTrend.total_call }}
                                            </span>
                                        </div>
                                    </div>

                                    <!-- 趋势加载 -->
                                    <div
                                        v-if="friendTrendLoading"
                                        class="flex h-40 items-center justify-center"
                                    >
                                        <div
                                            class="h-6 w-6 animate-spin rounded-full border-b-2 border-blue-500"
                                        ></div>
                                    </div>

                                    <!-- 折线图 -->
                                    <div
                                        v-else-if="
                                            friendTrendChartData &&
                                            friendTrendChartData.datasets[0]
                                                .data.length > 0
                                        "
                                        class="h-40"
                                    >
                                        <Line
                                            :data="friendTrendChartData"
                                            :options="friendTrendChartOptions"
                                        />
                                    </div>

                                    <div
                                        v-else
                                        class="flex h-40 items-center justify-center text-gray-400"
                                    >
                                        <span class="text-sm">暂无数据</span>
                                    </div>
                                </div>
                                <div
                                    class="flex h-96 items-center justify-center"
                                >
                                    <div class="text-center text-gray-400">
                                        <Users
                                            class="mx-auto mb-4 h-16 w-16 opacity-20"
                                        />
                                        <p class="text-gray-500">施工中</p>
                                    </div>
                                </div>
                            </template>

                            <!-- 无数据 -->
                            <div v-else class="py-12 text-center text-gray-400">
                                <Users
                                    class="mx-auto mb-4 h-16 w-16 opacity-20"
                                />
                                <p>暂无好友数据</p>
                            </div>
                        </div>
                    </div>
                </template>
            </div>
        </div>

        <!-- 发送消息对话框 -->
        <Teleport to="body">
            <Transition
                name="modal-jelly"
                :duration="{ enter: 500, leave: 250 }"
            >
                <div
                    v-if="sendMessageDialogOpen"
                    class="fixed inset-0 z-50 flex items-center justify-center p-4"
                >
                    <div
                        class="glass-overlay fixed inset-0"
                        @click="sendMessageDialogOpen = false"
                    ></div>
                    <div
                        class="modal-content relative flex max-h-[85vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
                    >
                        <div
                            class="flex items-center justify-between border-b border-blue-100 bg-gradient-to-r from-blue-50 to-indigo-50 px-6 py-4"
                        >
                            <h3 class="text-lg font-semibold text-gray-800">
                                发送消息
                            </h3>
                            <button
                                @click="sendMessageDialogOpen = false"
                                class="rounded-2xl p-1 transition-colors hover:bg-white/50"
                            >
                                <svg
                                    class="h-5 w-5 text-gray-500"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                >
                                    <path
                                        stroke-linecap="round"
                                        stroke-linejoin="round"
                                        stroke-width="2"
                                        d="M6 18L18 6M6 6l12 12"
                                    />
                                </svg>
                            </button>
                        </div>
                        <div class="flex-1 overflow-y-auto p-6">
                            <div v-if="currentFriend" class="send-message-form">
                                <div class="message-target">
                                    <img
                                        :src="currentFriend.ava_url"
                                        class="message-target-avatar"
                                    />
                                    <div class="message-target-info">
                                        <span class="message-target-name">{{
                                            currentFriend.nickname
                                        }}</span>
                                        <span class="message-target-id">{{
                                            currentFriend.user_id
                                        }}</span>
                                    </div>
                                </div>
                                <el-input
                                    v-model="messageContent"
                                    type="textarea"
                                    placeholder="输入消息内容..."
                                    :rows="6"
                                    resize="vertical"
                                    class="message-input"
                                />
                                <div class="dialog-actions">
                                    <el-button
                                        @click="sendMessageDialogOpen = false"
                                        round
                                        >取消</el-button
                                    >
                                    <el-button
                                        @click="confirmSendMessage"
                                        type="primary"
                                        round
                                        >发送</el-button
                                    >
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </Transition>

            <!-- 成员编辑对话框 -->
            <Transition
                name="modal-jelly"
                :duration="{ enter: 500, leave: 250 }"
            >
                <div
                    v-if="memberEditDialogOpen"
                    class="fixed inset-0 z-50 flex items-center justify-center p-4"
                >
                    <div
                        class="glass-overlay fixed inset-0"
                        @click="memberEditDialogOpen = false"
                    ></div>
                    <div
                        class="modal-content relative flex max-h-[85vh] w-full max-w-md flex-col overflow-hidden rounded-4xl bg-white shadow-2xl"
                    >
                        <div
                            class="flex items-center justify-between border-b border-blue-100 px-6 py-6 pb-4"
                        >
                            <h3 class="text-lg font-semibold text-gray-800">
                                编辑成员信息
                            </h3>
                            <button
                                @click="memberEditDialogOpen = false"
                                class="rounded-2xl p-1 transition-colors hover:bg-white/50"
                            >
                                <svg
                                    class="h-5 w-5 text-gray-500"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                >
                                    <path
                                        stroke-linecap="round"
                                        stroke-linejoin="round"
                                        stroke-width="2"
                                        d="M6 18L18 6M6 6l12 12"
                                    />
                                </svg>
                            </button>
                        </div>
                        <div class="flex-1 overflow-y-auto p-6">
                            <div v-if="currentMember" class="edit-member-form">
                                <!-- 成员信息 -->
                                <div
                                    class="mb-6 flex items-center gap-3 rounded-2xl bg-blue-50 p-3"
                                >
                                    <img
                                        :src="currentMember.ava_url"
                                        class="h-12 w-12 rounded-full"
                                    />
                                    <div class="flex-1">
                                        <div class="font-medium text-gray-800">
                                            {{
                                                currentMember.remark ||
                                                currentMember.nickname
                                            }}
                                        </div>
                                        <div class="text-xs text-gray-500">
                                            {{ currentMember.user_id }}
                                        </div>
                                    </div>
                                </div>

                                <!-- 金币输入 -->
                                <div class="mb-4">
                                    <label
                                        class="mb-2 block text-sm font-medium text-gray-700"
                                        >金币数量</label
                                    >
                                    <el-input-number
                                        v-model="editGold"
                                        :min="0"
                                        :max="999999"
                                        :step="100"
                                        class="w-full"
                                        controls-position="right"
                                    />
                                </div>

                                <!-- 好感度输入 -->
                                <div class="mb-4">
                                    <label
                                        class="mb-2 block text-sm font-medium text-gray-700"
                                        >好感度</label
                                    >
                                    <el-input-number
                                        v-model="editFavorability"
                                        :min="0"
                                        :max="99999"
                                        :step="10"
                                        class="w-full"
                                        controls-position="right"
                                    />
                                </div>

                                <!-- 封禁开关 -->
                                <!--                                <div class="mb-4">-->
                                <!--                                    <label-->
                                <!--                                        class="flex cursor-pointer items-center justify-between rounded-2xl bg-red-50 p-3"-->
                                <!--                                    >-->
                                <!--                                        <div class="flex items-center gap-2">-->
                                <!--                                            <span-->
                                <!--                                                class="text-sm font-medium text-gray-700"-->
                                <!--                                                >封禁状态</span-->
                                <!--                                            >-->
                                <!--                                        </div>-->
                                <!--                                        <el-switch-->
                                <!--                                            v-model="editIsBanned"-->
                                <!--                                            size="large"-->
                                <!--                                            :active-text="-->
                                <!--                                                editIsBanned ? '已封禁' : '正常'-->
                                <!--                                            "-->
                                <!--                                        />-->
                                <!--                                    </label>-->
                                <!--                                </div>-->
                            </div>
                        </div>
                        <div
                            class="border-t border-gray-100 bg-gray-50 px-6 py-4"
                        >
                            <div class="flex justify-end gap-2">
                                <el-button
                                    @click="memberEditDialogOpen = false"
                                    round
                                    >取消</el-button
                                >
                                <el-button
                                    @click="saveMemberEdit"
                                    type="primary"
                                    round
                                    >保存</el-button
                                >
                            </div>
                        </div>
                    </div>
                </div>
            </Transition>

            <!-- 好友编辑对话框 -->
            <Transition
                name="modal-jelly"
                :duration="{ enter: 500, leave: 250 }"
            >
                <div
                    v-if="friendEditDialogOpen"
                    class="fixed inset-0 z-50 flex items-center justify-center p-4"
                >
                    <div
                        class="glass-overlay fixed inset-0"
                        @click="friendEditDialogOpen = false"
                    ></div>
                    <div
                        class="modal-content relative flex max-h-[85vh] w-full max-w-sm flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
                    >
                        <div
                            class="flex items-center justify-between border-b border-pink-100 bg-gradient-to-r from-pink-50 to-rose-50 px-6 py-4"
                        >
                            <h3 class="text-lg font-semibold text-gray-800">
                                编辑{{
                                    friendEditField === "gold"
                                        ? "金币"
                                        : "好感度"
                                }}
                            </h3>
                            <button
                                @click="friendEditDialogOpen = false"
                                class="rounded-2xl p-1 transition-colors hover:bg-white/50"
                            >
                                <svg
                                    class="h-5 w-5 text-gray-500"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                >
                                    <path
                                        stroke-linecap="round"
                                        stroke-linejoin="round"
                                        stroke-width="2"
                                        d="M6 18L18 6M6 6l12 12"
                                    />
                                </svg>
                            </button>
                        </div>
                        <div class="flex-1 overflow-y-auto p-6">
                            <div class="mb-4">
                                <label
                                    class="mb-2 block text-sm font-medium text-gray-700"
                                >
                                    {{
                                        friendEditField === "gold"
                                            ? "金币数量"
                                            : "好感度"
                                    }}
                                </label>
                                <el-input-number
                                    v-model="friendEditValue"
                                    :min="0"
                                    :max="
                                        friendEditField === 'gold'
                                            ? 999999
                                            : 9999
                                    "
                                    :step="friendEditField === 'gold' ? 100 : 1"
                                    :precision="
                                        friendEditField === 'favorability'
                                            ? 1
                                            : 0
                                    "
                                    class="w-full"
                                    controls-position="right"
                                />
                            </div>
                            <div class="flex justify-end gap-2">
                                <el-button
                                    @click="friendEditDialogOpen = false"
                                    round
                                    >取消</el-button
                                >
                                <el-button
                                    @click="saveFriendEdit"
                                    type="primary"
                                    :loading="friendEditSaving"
                                    round
                                    >保存</el-button
                                >
                            </div>
                        </div>
                    </div>
                </div>
            </Transition>

            <!-- 请求处理对话框 -->
            <Transition
                name="modal-jelly"
                :duration="{ enter: 500, leave: 250 }"
            >
                <div
                    v-if="requestDialogOpen"
                    class="fixed inset-0 z-50 flex items-center justify-center p-4"
                >
                    <div
                        class="glass-overlay fixed inset-0"
                        @click="requestDialogOpen = false"
                    ></div>
                    <div
                        class="modal-content relative flex max-h-[85vh] w-full max-w-2xl flex-col overflow-hidden rounded-4xl bg-white pt-3 shadow-2xl"
                    >
                        <div
                            class="flex items-center justify-between px-6 py-4"
                        >
                            <div class="flex items-center gap-3">
                                <Bell class="h-6 w-6 text-orange-600" />
                                <h3 class="text-lg font-semibold text-gray-800">
                                    请求处理
                                </h3>
                            </div>
                            <button
                                @click="requestDialogOpen = false"
                                class="cursor-pointer rounded-2xl p-1 transition-colors hover:bg-white/50"
                            >
                                <svg
                                    class="h-5 w-5 text-gray-500"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                >
                                    <path
                                        stroke-linecap="round"
                                        stroke-linejoin="round"
                                        stroke-width="2"
                                        d="M6 18L18 6M6 6l12 12"
                                    />
                                </svg>
                            </button>
                        </div>

                        <!-- 请求类型选项卡 -->
                        <div class="flex border-b border-gray-100">
                            <button
                                @click="activeRequestTab = 'friend'"
                                :class="[
                                    'flex-1 cursor-pointer px-4 py-3 text-sm font-medium transition-all',
                                    activeRequestTab === 'friend'
                                        ? 'border-blue-600 bg-blue-50 text-blue-600'
                                        : 'text-gray-500 hover:bg-gray-50',
                                ]"
                            >
                                好友请求 ({{ friendRequests.length }})
                            </button>
                            <button
                                @click="activeRequestTab = 'group'"
                                :class="[
                                    'flex-1 cursor-pointer px-4 py-3 text-sm font-medium transition-all',
                                    activeRequestTab === 'group'
                                        ? 'border-purple-600 bg-purple-50 text-purple-600'
                                        : 'text-gray-500 hover:bg-gray-50',
                                ]"
                            >
                                群组请求 ({{ groupRequests.length }})
                            </button>
                        </div>

                        <!-- 请求列表 -->
                        <div class="flex-1 overflow-y-auto p-4">
                            <div
                                v-if="requestsLoading"
                                class="flex items-center justify-center py-12"
                            >
                                <div class="text-center text-gray-400">
                                    <div
                                        class="mx-auto mb-2 h-8 w-8 animate-pulse rounded-full border-2 border-blue-500 border-t-transparent"
                                    />
                                    <p class="text-sm">加载中...</p>
                                </div>
                            </div>

                            <!-- 好友请求 -->
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
                                            @click="
                                                handleRequest(req, 'approve')
                                            "
                                            class="rounded-2xl bg-green-50 px-3 py-1.5 text-xs font-medium text-green-600 hover:bg-green-100"
                                        >
                                            同意
                                        </button>
                                        <button
                                            @click="
                                                handleRequest(req, 'refused')
                                            "
                                            class="rounded-2xl bg-red-50 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-100"
                                        >
                                            拒绝
                                        </button>
                                        <button
                                            @click="
                                                handleRequest(req, 'ignore')
                                            "
                                            class="rounded-2xl bg-gray-100 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-200"
                                        >
                                            忽略
                                        </button>
                                    </div>
                                </div>
                            </div>

                            <!-- 群组请求 -->
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
                                            @click="
                                                handleRequest(req, 'approve')
                                            "
                                            class="rounded-2xl bg-green-50 px-3 py-1.5 text-xs font-medium text-green-600 hover:bg-green-100"
                                        >
                                            同意
                                        </button>
                                        <button
                                            @click="
                                                handleRequest(req, 'refused')
                                            "
                                            class="rounded-2xl bg-red-50 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-100"
                                        >
                                            拒绝
                                        </button>
                                        <button
                                            @click="
                                                handleRequest(req, 'ignore')
                                            "
                                            class="rounded-2xl bg-gray-100 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-200"
                                        >
                                            忽略
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- 底部操作 -->
                        <div
                            class="flex items-center justify-between border-t border-gray-100 px-6 py-4"
                        >
                            <div class="space-x-4 text-xs text-gray-500">
                                <span
                                    >好友请求：{{ friendRequests.length }}</span
                                >
                                <span
                                    >群组请求：{{ groupRequests.length }}</span
                                >
                            </div>
                            <div class="flex gap-2">
                                <el-button
                                    @click="clearRequests('friend')"
                                    size="small"
                                    round
                                    :disabled="friendRequests.length === 0"
                                >
                                    清空好友请求
                                </el-button>
                                <el-button
                                    @click="clearRequests('group')"
                                    size="small"
                                    round
                                    :disabled="groupRequests.length === 0"
                                >
                                    清空群组请求
                                </el-button>
                            </div>
                        </div>
                    </div>
                </div>
            </Transition>
        </Teleport>
    </div>
</template>

<style scoped>
.message-target {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px;
    background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%);
    border-radius: 12px;
    margin-bottom: 16px;
}

.message-target-avatar {
    width: 48px;
    height: 48px;
    border-radius: 50%;
    box-shadow: 0 2px 8px rgba(59, 130, 246, 0.2);
}

.message-target-name {
    font-weight: 600;
    color: #1f2937;
    font-size: 14px;
}

.message-target-id {
    font-size: 12px;
    color: #6b7280;
    font-family: monospace;
}

.message-input :deep(.el-textarea__inner) {
    border-radius: 12px;
    border-color: #e5e7eb;
}

.message-input :deep(.el-textarea__inner:focus) {
    border-color: #3b82f6;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.dialog-actions {
    display: flex;
    justify-content: flex-end;
    gap: 8px;
    margin-top: 16px;
}

/* 标签页样式 */
.manage-tabs :deep(.el-tabs__header) {
    margin: 0;
    padding: 0 8px;
    border-bottom: 1px solid #f1f5f9;
}

@media (min-width: 640px) {
    .manage-tabs :deep(.el-tabs__header) {
        padding: 0 12px;
    }
}

.manage-tabs :deep(.el-tabs__nav) {
    display: flex;
    width: 100%;
}

.manage-tabs :deep(.el-tabs__item) {
    flex: 1;
    text-align: center;
    padding: 10px 6px !important;
    font-size: 12px;
    font-weight: 500;
    color: #64748b;
    transition: all 0.2s;
}

@media (min-width: 640px) {
    .manage-tabs :deep(.el-tabs__item) {
        padding: 12px 8px !important;
        font-size: 13px;
    }
}

.manage-tabs :deep(.el-tabs__item:hover) {
    color: #3b82f6;
}

.manage-tabs :deep(.el-tabs__item.is-active) {
    color: #3b82f6;
    font-weight: 600;
}

.manage-tabs :deep(.el-tabs__active-bar) {
    background: linear-gradient(90deg, #3b82f6, #60a5fa);
    height: 3px;
    border-radius: 3px 3px 0 0;
}

.tab-label {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 4px;
}

@media (min-width: 640px) {
    .tab-label {
        gap: 6px;
    }
}

.tab-count {
    font-size: 9px;
    color: #94a3b8;
    background: #f1f5f9;
    padding: 1px 4px;
    border-radius: 8px;
    font-weight: 500;
}

@media (min-width: 640px) {
    .tab-count {
        font-size: 10px;
        padding: 1px 6px;
        border-radius: 10px;
    }
}

.is-active .tab-count {
    background: #dbeafe;
    color: #3b82f6;
}
</style>
