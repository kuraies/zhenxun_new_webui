/**
 * OneBot v11 协议类型（模拟客户端用）
 * 参考 https://github.com/botuniverse/onebot-11 协议规范
 */

/** 消息段 */
export interface MessageSegment {
    type: string
    data: Record<string, any>
}

/** 消息内容：消息段数组或纯文本（CQ 码字符串） */
export type MessageContent = MessageSegment[] | string

/** 事件（模拟客户端 -> 框架），按 OneBot v11 标准结构 */
export interface OneBotEvent {
    post_type: string
    time: number
    self_id: number
    [key: string]: any
}

/** 动作请求（框架 -> 模拟客户端） */
export interface ActionRequest {
    action: string
    params: Record<string, any>
    echo?: string
}

/** 动作响应（模拟客户端 -> 框架） */
export interface ActionResponse {
    status: 'ok' | 'failed'
    retcode: number
    data: any
    echo?: string
}

/** 动作响应码，与 OneBot 标准一致 */
export const RETCODE = {
    OK: 0,
    /** Action 不存在或参数错误 */
    FAILED: 1404,
} as const

export const okResponse = (data: any, echo?: string): ActionResponse => ({
    status: 'ok',
    retcode: RETCODE.OK,
    data,
    echo,
})

export const failResponse = (message: string, echo?: string, retcode = RETCODE.FAILED): ActionResponse => ({
    status: 'failed',
    retcode,
    data: null,
    echo,
    message,
} as ActionResponse)
