/**
 * OneBot v11 事件构造器（模拟客户端 -> 框架）
 */
import type { MessageContent, OneBotEvent } from './types'
import { segmentsToText } from './message'

// 事件内使用的自增消息 ID
let messageIdSeq = 100000

export interface PrivateMessageOptions {
    selfId: string
    userId: string
    nickname?: string
    message: MessageContent
    subType?: 'friend' | 'group' | 'group_self' | 'other'
}

export interface GroupMessageOptions {
    selfId: string
    groupId: string
    userId: string
    nickname?: string
    card?: string
    message: MessageContent
    subType?: 'normal' | 'anonymous' | 'notice'
}

const baseFields = (selfId: string) => ({
    time: Math.floor(Date.now() / 1000),
    self_id: Number(selfId),
})

export const buildLifecycleEvent = (selfId: string): OneBotEvent => ({
    post_type: 'meta_event',
    meta_event_type: 'lifecycle',
    sub_type: 'connect',
    ...baseFields(selfId),
})

export const buildHeartbeatEvent = (selfId: string, interval: number): OneBotEvent => ({
    post_type: 'meta_event',
    meta_event_type: 'heartbeat',
    status: { online: true, good: true },
    interval,
    ...baseFields(selfId),
})

export const buildPrivateMessageEvent = (options: PrivateMessageOptions): OneBotEvent => ({
    post_type: 'message',
    message_type: 'private',
    sub_type: options.subType ?? 'friend',
    message_id: ++messageIdSeq,
    user_id: Number(options.userId),
    message: options.message,
    raw_message: segmentsToText(options.message),
    font: 0,
    sender: {
        user_id: Number(options.userId),
        nickname: options.nickname || `用户${options.userId}`,
        sex: 'unknown',
        age: 0,
    },
    ...baseFields(options.selfId),
})

export const buildGroupMessageEvent = (options: GroupMessageOptions): OneBotEvent => ({
    post_type: 'message',
    message_type: 'group',
    sub_type: options.subType ?? 'normal',
    message_id: ++messageIdSeq,
    group_id: Number(options.groupId),
    user_id: Number(options.userId),
    message: options.message,
    raw_message: segmentsToText(options.message),
    font: 0,
    sender: {
        user_id: Number(options.userId),
        nickname: options.nickname || `用户${options.userId}`,
        card: options.card || options.nickname || '',
        sex: 'unknown',
        age: 0,
        area: '',
        role: 'member',
    },
    ...baseFields(options.selfId),
})

export interface FriendRequestOptions {
    selfId: string
    /** 发起申请的用户（模拟的"我"） */
    userId: string
    nickname?: string
    comment?: string
    /** 申请标识，审批动作(set_friend_add_request)会原样带回 */
    flag: string
}

export const buildFriendRequestEvent = (options: FriendRequestOptions): OneBotEvent => ({
    post_type: 'request',
    request_type: 'friend',
    sub_type: 'add',
    user_id: Number(options.userId),
    nickname: options.nickname || `用户${options.userId}`,
    comment: options.comment ?? '',
    flag: options.flag,
    ...baseFields(options.selfId),
})

export interface GroupDecreaseOptions {
    selfId: string
    groupId: string
    /** 减少的成员 */
    userId: string
    /** 操作者，退群时就是本人，被踢时是管理员 */
    operatorId?: string
    subType?: 'leave' | 'kick' | 'kick_me'
}

export const buildGroupDecreaseEvent = (options: GroupDecreaseOptions): OneBotEvent => ({
    post_type: 'notice',
    notice_type: 'group_decrease',
    sub_type: options.subType ?? 'leave',
    group_id: Number(options.groupId),
    user_id: Number(options.userId),
    operator_id: Number(options.operatorId ?? options.userId),
    ...baseFields(options.selfId),
})
