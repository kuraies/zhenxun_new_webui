/**
 * 模拟客户端的世界状态
 * 好友/群/成员/消息记录，action 应答从这里取数，页面也可以编辑它
 */

import { reactive } from 'vue'

export interface SimFriend {
    user_id: number
    nickname: string
    remark?: string
    sex?: string
    age?: number
}

export interface SimGroup {
    group_id: number
    group_name: string
    member_count: number
    max_member_count: number
}

export interface SimMember {
    user_id: number
    nickname: string
    card?: string
    sex?: string
    age?: number
    area?: string
    join_time?: number
    last_sent_time?: number
    level?: string
    role: 'owner' | 'admin' | 'member'
    title?: string
}

export interface SimSentMessage {
    message_id: number
    real_id: number
    time: number
    message_type: 'private' | 'group'
    user_id?: number
    group_id?: number
    sender: { user_id: number; nickname: string }
    message: unknown
    raw_message: string
}

const now = () => Math.floor(Date.now() / 1000)

export const simState = reactive({
    /** 模拟的机器人身份（get_login_info 应答使用，页面可编辑） */
    bot: {
        user_id: 10086,
        nickname: '小真寻',
    } as { user_id: number; nickname: string },

    /** 可切换的"我的身份"列表，群聊/私聊里扮演谁 */
    users: [
        { user_id: 10000, nickname: '调试用户' },
        { user_id: 10001, nickname: '管理员小号' },
    ] as { user_id: number; nickname: string }[],

    /** 机器人的好友列表（get_friend_list 应答），默认为空——
     *  通过"添加好友"申请流程或真实交互来充实 */
    friends: [] as SimFriend[],

    groups: [] as SimGroup[],

    /** group_id -> 成员列表 */
    members: {} as Record<number, SimMember[]>,

    /** 模拟客户端发出去的消息（send_msg 应答后记录，供 get_msg 查询） */
    sentMessages: new Map<number, SimSentMessage>(),

    clear() {
        simState.friends = []
        simState.groups = []
        simState.members = {}
        simState.sentMessages.clear()
    },
})
