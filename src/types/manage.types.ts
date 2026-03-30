/**
 * 管理相关类型定义
 */

export interface GroupResult {
    group_id: string
    group_name: string
    ava_url: string
}

export interface Group {
    group_id: string
    group_name: string
    ava_url: string
    status?: boolean
    member_count?: number
    max_member_count?: number
}

export interface Friend {
    user_id: string
    nickname: string
    remark: string
    ava_url: string
}

export interface FriendRequestResult {
    bot_id: string
    oid: number
    id: string
    flag: string
    nickname: string | null
    comment: string | null
    ava_url: string
    type: string
}

export interface GroupRequestResult extends FriendRequestResult {
    invite_group: string
    group_name: string | null
}

export interface ReqResult {
    friend: FriendRequestResult[]
    group: GroupRequestResult[]
}

export interface LeaveGroup {
    bot_id: string
    group_id: string
}

export interface DeleteFriend {
    bot_id: string
    user_id: string
}

export interface GroupDetailNew {
    group_id: string
    group_name: string
    ava_url: string
    member_count: number
    max_member_count: number
    level: number
    status: boolean
    is_super: boolean
    block_task: boolean
    block_plugin: boolean
}

export interface SendMessageParam {
    bot_id: string
    user_id?: string | null
    group_id?: string | null
    message: string
}

export interface MessageItem {
    type: string
    msg: string
    time: string
}

// 新增管理模块类型
export interface GroupMember {
    user_id: string
    nickname: string
    remark: string
    ava_url: string
    role: string
    gold?: number
    favorability?: number
    is_banned?: boolean
}

export interface MemberDetail {
    user_id: string
    nickname: string
    remark: string
    ava_url: string
    gold: number
    favorability: number
    is_banned: boolean
}

export interface UpdateGroupRequest {
    group_id: string
    status?: boolean
    level?: number
    block_task?: boolean
    block_plugin?: boolean
    is_super?: boolean
}

export interface UpdateMemberRequest {
    user_id: string
    group_id: string
    gold?: number
    favorability?: number
    is_banned?: boolean
}

export interface TogglePluginRequest {
    group_id: string
    module: string
    action: 'block' | 'unblock'
    is_task: boolean
}

export interface GroupStatistics {
    group_id: string
    group_name: string
    chat_count: number
    call_count: number
    member_count: number
    active_members: number
}

export interface GroupPlugin {
    module: string
    plugin_name: string
    is_blocked: boolean
    is_task: boolean
}

// 联合类型用于成员列表
export type AnyMember = GroupMember | MemberDetail

export interface HandleRequest {
    bot_id?: string
    id: number
    action: 'approve' | 'refused' | 'ignore'
}

export interface ClearRequest {
    request_type: 'friend' | 'group'
}

// 好友详情相关类型
export interface FriendDetail {
    user_id: string
    nickname: string
    ava_url: string
    gold: number
    favorability: number
}

export interface UpdateFriendRequest {
    user_id: string
    gold?: number
    favorability?: number
}

export interface FriendTrendPoint {
    date: string
    chat_count: number
    call_count: number
}

export interface FriendTrend {
    data: FriendTrendPoint[]
    total_chat: number
    total_call: number
}