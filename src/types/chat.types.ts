/**
 * 消息类型
 */
export type MessageType = 'text' | 'image' | 'face' | 'record' | 'video' | 'at' | 'reply'

/**
 * 聊天消息类型
 */
export interface ChatMessage {
    id: number
    user_id: string
    user_name?: string
    avatar?: string
    message: string
    message_type: MessageType
    timestamp: string
    is_self: boolean
    group_id?: string
    group_name?: string
}

/**
 * 发送消息参数
 */
export interface SendMessageParam {
    bot_id: string
    user_id?: string | null
    group_id?: string | null
    message: string
}

/**
 * 消息项类型（用于 WebSocket 实时消息）
 */
export interface MessageItem {
    type: string
    msg: string
    time: string
}

/**
 * WebSocket 聊天消息类型（用于接收后端推送的实时消息）
 */
export interface ChatWebSocketMessage {
    object_id: string
    user_id: string
    group_id?: string | null
    message: MessageItem[]
    name: string
    ava_url: string
}

/**
 * 好友类型
 */
export interface Friend {
    user_id: string
    nickname: string
    remark?: string
    ava_url: string
}

/**
 * 群组类型
 */
export interface Group {
    group_id: string
    group_name: string
    ava_url: string
}
