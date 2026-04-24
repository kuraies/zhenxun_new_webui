/**
 * WebUI Next API - 管理模块接口
 */

import { api } from "./client";
import type { APIResponse } from "@/types/api-next.types";
import type {
    DeleteFriend,
    Friend,
    FriendDetail,
    FriendTrend,
    Group,
    GroupDetailNew,
    GroupMember,
    GroupPlugin,
    GroupStatistics,
    HandleRequest,
    LeaveGroup,
    MemberDetail,
    ReqResult,
    TogglePluginRequest,
    UpdateFriendRequest,
    UpdateGroupRequest,
    UpdateMemberRequest
} from "@/types/manage.types";

export const manageApi = {
    /**
     * 获取好友列表
     */
    getFriendList(bot_id?: string): Promise<APIResponse<Friend[]>> {
        return api.get('/manage/friend-list', { bot_id })
    },

    /**
     * 获取群组列表
     */
    getGroupList(bot_id?: string): Promise<APIResponse<Group[]>> {
        return api.get('/manage/group-list', { bot_id })
    },

    /**
     * 发送消息
     */
    sendMessage(
        bot_id: string,
        message: string,
        user_id?: string,
        group_id?: string
    ): Promise<APIResponse<boolean>> {
        return api.post('/manage/send-message', { bot_id, user_id, group_id, message })
    },

    /**
     * 退群
     */
    leaveGroup(request: LeaveGroup): Promise<APIResponse<boolean>> {
        return api.post('/manage/leave-group', request)
    },

    /**
     * 移除好友
     */
    deleteFriend(request: DeleteFriend): Promise<APIResponse<boolean>> {
        return api.post('/manage/delete-friend', request)
    },

    /**
     * 获取群组详情
     */
    getGroupDetail(
        group_id: string,
        bot_id?: string
    ): Promise<APIResponse<GroupDetailNew | null>> {
        return api.get('/manage/group-detail', { group_id, bot_id })
    },

    /**
     * 更新群组设置
     */
    updateGroup(request: UpdateGroupRequest): Promise<APIResponse<boolean>> {
        return api.post('/manage/update-group', request)
    },

    /**
     * 获取群成员列表
     */
    getGroupMembers(
        group_id: string,
        bot_id?: string
    ): Promise<APIResponse<GroupMember[]>> {
        return api.get('/manage/group-members', { group_id, bot_id })
    },

    /**
     * 获取成员详情（金币、好感度）
     */
    getMemberDetail(
        user_id: string,
        group_id: string
    ): Promise<APIResponse<MemberDetail | null>> {
        return api.get('/manage/member-detail', { user_id, group_id })
    },

    /**
     * 更新成员数据（金币、好感度）
     */
    updateMember(request: UpdateMemberRequest): Promise<APIResponse<boolean>> {
        return api.post('/manage/update-member', request)
    },

    /**
     * 获取群功能开关列表
     */
    getGroupPlugins(group_id: string): Promise<APIResponse<GroupPlugin[]>> {
        return api.get('/manage/group-plugins', { group_id })
    },

    /**
     * 切换群功能开关
     */
    toggleGroupPlugin(request: TogglePluginRequest): Promise<APIResponse<boolean>> {
        return api.post('/manage/toggle-group-plugin', request)
    },

    /**
     * 获取群数据统计
     */
    getGroupStatistics(
        group_id: string,
        bot_id?: string
    ): Promise<APIResponse<GroupStatistics | null>> {
        return api.get('/manage/group-statistics', { group_id, bot_id })
    },

    /**
     * 获取群黑名单列表
     */
    getBlacklist(group_id: string): Promise<APIResponse<any[]>> {
        return api.get('/manage/blacklist', { group_id })
    },

    /**
     * 添加群成员黑名单
     */
    addBlacklist(
        user_id: string,
        group_id: string,
        reason?: string
    ): Promise<APIResponse<boolean>> {
        return api.post('/manage/add-blacklist', { user_id, group_id, reason })
    },

    /**
     * 移除黑名单
     */
    removeBlacklist(
        user_id: string,
        group_id: string
    ): Promise<APIResponse<boolean>> {
        return api.post('/manage/remove-blacklist', { user_id, group_id })
    },

    /**
     * 获取插件权限配置
     */
    getPluginPermissions(group_id: string): Promise<APIResponse<any[]>> {
        return api.get('/manage/plugin-permissions', { group_id })
    },

    /**
     * 更新插件权限
     */
    updatePluginPermissions(
        group_id: string,
        module: string,
        min_level: number
    ): Promise<APIResponse<boolean>> {
        return api.post('/manage/update-plugin-permissions', {
            group_id,
            module,
            min_level,
        })
    },

    /**
     * 获取请求列表
     */
    getRequestList(bot_id?: string): Promise<APIResponse<ReqResult>> {
        return api.get('/manage/request-list', { bot_id })
    },

    /**
     * 处理请求
     */
    handleRequest(request: HandleRequest): Promise<APIResponse<boolean>> {
        return api.post('/manage/handle-request', request)
    },

    /**
     * 清空请求
     */
    clearRequest(request_type: 'friend' | 'group'): Promise<APIResponse<boolean>> {
        return api.post('/manage/clear-request', { request_type })
    },

    /**
     * 获取好友详情
     */
    getFriendDetail(user_id: string,bot_id:string): Promise<APIResponse<FriendDetail | null>> {
        return api.get('/manage/friend-detail', { user_id,bot_id })
    },

    /**
     * 更新好友数据
     */
    updateFriend(request: UpdateFriendRequest): Promise<APIResponse<boolean>> {
        return api.post('/manage/update-friend', request)
    },

    /**
     * 获取好友趋势数据
     */
    getFriendTrend(user_id: string, days?: number): Promise<APIResponse<FriendTrend>> {
        return api.get('/manage/friend-trend', { user_id, days })
    },
}
