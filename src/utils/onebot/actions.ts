/**
 * OneBot v11 完整动作应答表（注册表模式）
 *
 * 参考LLBot 的架构：每个动作一个处理器，统一注册进
 * 注册表；handleAction 负责别名规整、echo 回带与错误包装——
 * 处理器只关心业务，抛错即返回 failed。
 *
 * 覆盖 OneBot v11 标准 API + go-cqhttp 常用扩展，
 * 数据从模拟世界状态(simState)读取，未注册的动作按标准返回 1404。
 */
import type { ActionRequest, ActionResponse, MessageSegment } from './types'
import { failResponse, okResponse } from './types'
import { normalizeIncoming, segmentsToText } from './message'
import { simState, type SimSentMessage } from './state'

export interface ActionContext {
    selfId: string
    /** 模拟客户端收到框架的回复消息 */
    onBotMessage?: (info: {
        messageType: 'private' | 'group' | undefined
        userId?: number
        groupId?: number
        message: MessageSegment[] | string
        text: string
    }) => void
}

/** 动作处理器：返回值即响应 data，抛错则响应该错误的 failed */
type ActionHandler = (
    ctx: ActionContext,
    params: Record<string, any>,
) => any

/** 动作注册表：动作名（含别名）→ 处理器 */
const registry = new Map<string, ActionHandler>()

/** 注册动作，支持一个处理器绑定多个别名（如 send_msg 与 send_private_msg） */
const register = (names: string | string[], handler: ActionHandler) => {
    for (const name of Array.isArray(names) ? names : [names]) {
        registry.set(name, handler)
    }
}

let sentIdSeq = 1

// ==================== 模拟世界状态的常用查询 ====================

const findGroup = (groupId: unknown) =>
    simState.groups.find(g => g.group_id === Number(groupId))

const findMember = (groupId: unknown, userId: unknown) =>
    simState.members[Number(groupId)]?.find(m => m.user_id === Number(userId))

const recordSent = (
    ctx: ActionContext,
    info: Partial<SimSentMessage> & { message_type: 'private' | 'group' },
): number => {
    const messageId = sentIdSeq++
    simState.sentMessages.set(messageId, {
        message_id: messageId,
        real_id: messageId,
        time: Math.floor(Date.now() / 1000),
        sender: { user_id: simState.bot.user_id, nickname: simState.bot.nickname },
        raw_message: '',
        ...info,
    } as SimSentMessage)
    return messageId
}

// ==================== 消息 ====================

register(['send_msg', 'send_private_msg', 'send_group_msg'], (ctx, p) => {
    // CQ 码字符串与 base64/file 图片统一规整后再展示
    const normalized = normalizeIncoming(p.message)
    const messageType = (p.message_type ?? (p.group_id ? 'group' : 'private')) as 'private' | 'group'
    ctx.onBotMessage?.({
        messageType,
        userId: p.user_id,
        groupId: p.group_id,
        message: normalized.message,
        text: normalized.text,
    })
    const messageId = recordSent(ctx, {
        message_type: messageType,
        user_id: p.user_id,
        group_id: p.group_id,
        message: normalized.message,
        raw_message: segmentsToText(normalized.message ?? ''),
    })
    return { message_id: messageId }
})

const forwardMsgHandler =
    (messageType: 'private' | 'group') => (ctx: ActionContext, p: Record<string, any>) => {
        ctx.onBotMessage?.({
            messageType,
            userId: p.user_id,
            groupId: p.group_id,
            message: '[合并转发消息]',
            text: '[合并转发消息]',
        })
        return { message_id: recordSent(ctx, { message_type: messageType, message: p.messages, raw_message: "[合并转发]" }) }
    }

register('send_private_forward_msg', forwardMsgHandler('private'))
register('send_group_forward_msg', forwardMsgHandler('group'))

register('delete_msg', (_ctx, p) => {
    simState.sentMessages.delete(Number(p.message_id))
    return null
})

register('get_msg', (_ctx, p) => {
    const sent = simState.sentMessages.get(Number(p.message_id))
    if (!sent) throw new Error(`消息不存在: ${p.message_id}`)
    return sent
})

register('get_forward_msg', () => ({ messages: [] }))

register(['send_like', 'mark_msg_as_read', 'set_msg_emoji_like'], () => null)

// ==================== 群操作 ====================

register(
    [
        'set_group_kick',
        'set_group_ban',
        'set_group_anonymous_ban',
        'set_group_whole_ban',
        'set_group_admin',
        'set_group_anonymous',
        'set_group_card',
        'set_group_special_title',
        'send_group_sign',
    ],
    () => null,
)

register('set_group_name', (_ctx, p) => {
    const group = findGroup(p.group_id)
    if (!group) throw new Error(`群不存在: ${p.group_id}`)
    const name = String(p.group_name ?? '').trim()
    if (!name) throw new Error('群名不能为空')
    group.group_name = name
    return null
})

register('set_group_leave', (_ctx, p) => {
    const idx = simState.groups.findIndex(g => g.group_id === Number(p.group_id))
    if (idx === -1) throw new Error(`群不存在: ${p.group_id}`)
    const [removed] = simState.groups.splice(idx, 1)
    delete simState.members[removed.group_id]
    return null
})

register(['get_group_info', 'get_group_info_ex'], (_ctx, p) => {
    const group = findGroup(p.group_id)
    if (!group) throw new Error(`群不存在: ${p.group_id}`)
    return group
})

register('get_group_list', () => simState.groups)

register('get_group_member_info', (_ctx, p) => {
    const member = findMember(p.group_id, p.user_id)
    if (!member) throw new Error(`群成员不存在: 群${p.group_id} 用户${p.user_id}`)
    return member
})

register('get_group_member_list', (_ctx, p) => simState.members[Number(p.group_id)] ?? [])

register(['get_group_msg_history', 'get_friend_msg_history'], () => ({ messages: [] }))

register('get_essence_msg_list', () => [])

register(['set_essence_msg', 'delete_essence_msg'], () => null)

// ==================== 好友 / 请求 ====================

register('set_friend_add_request', (_ctx, p) => {
    // 调试端发出的好友申请 flag 形如 "debug_friend_req:<user_id>|<nickname>"，
    // 审批通过时把申请人加入好友列表
    const flag = String(p.flag ?? '')
    if (flag.startsWith('debug_friend_req:')) {
        const [userIdStr, nickname] = flag
            .slice('debug_friend_req:'.length)
            .split('|')
        const userId = Number(userIdStr)
        if (p.approve !== false && userId && !simState.friends.some(f => f.user_id === userId)) {
            simState.friends.push({
                user_id: userId,
                nickname: nickname || `用户${userIdStr}`,
                remark: '',
            })
        }
    }
    return null
})

register('set_group_add_request', () => null)

register('delete_friend', (_ctx, p) => {
    const idx = simState.friends.findIndex(f => f.user_id === Number(p.user_id))
    if (idx === -1) throw new Error(`好友不存在: ${p.user_id}`)
    simState.friends.splice(idx, 1)
    return null
})

register('set_friend_remark', (_ctx, p) => {
    const friend = simState.friends.find(f => f.user_id === Number(p.user_id))
    if (!friend) throw new Error(`好友不存在: ${p.user_id}`)
    friend.remark = String(p.remark ?? '')
    return null
})

register('get_stranger_info', (_ctx, p) => {
    const friend = simState.friends.find(f => f.user_id === Number(p.user_id))
    return friend ?? { user_id: Number(p.user_id ?? 0), nickname: `用户${p.user_id ?? ''}`, sex: 'unknown', age: 0 }
})

register('get_friend_list', () => simState.friends)

// ==================== 登录 / 版本 / 状态 ====================

register('get_login_info', () => ({ user_id: simState.bot.user_id, nickname: simState.bot.nickname }))

register(['get_version_info', 'get_version_info_ex'], () => ({
    app_name: 'zhenxun-webui-simulator',
    app_version: '0.1.0',
    protocol_version: 'v11',
}))

register('get_status', () => ({
    online: true,
    good: true,
    statistics: {
        packet_received: 0,
        packet_sent: 0,
        packet_lost: 0,
        message_received: 0,
        message_sent: 0,
        disconnect_times: 0,
        lost_times: 0,
    },
}))

register(['can_send_image', 'can_send_record'], () => ({ yes: true }))

// ==================== 媒体 / 其它扩展 ====================

register('get_image', () => ({
    size: 1024,
    filename: 'simulated.png',
    url: 'https://example.com/simulated.png',
}))

register('get_record', (_ctx, p) => ({ file: p.file ?? '', url: '', base64: '' }))

register(['get_online_clients', 'get_word_slices'], () => [])

register('check_url_safely', () => ({ level: 1 }))

register(['set_qq_profile', 'set_diy_online_status'], () => null)

register('get_latest_events', () => [])

register(['ocr_image', '.ocr_image'], () => ({ texts: [], language: '' }))

// ==================== 统一入口 ====================

/**
 * 应答一个动作请求：规整别名（xx_async / _handle 前缀）、查注册表，
 * 未注册的动作按 OneBot 标准返回 1404；处理器抛错包装为 failed
 */
export function handleAction(request: ActionRequest, ctx: ActionContext): ActionResponse {
    const echo = request.echo
    const action = request.action.replace(/_async$/, '').replace(/^_.handle_/, '')
    const handler = registry.get(action)
    if (!handler) {
        return failResponse(`模拟客户端不支持的动作: ${action}`, echo)
    }
    try {
        return okResponse(handler(ctx, request.params ?? {}), echo)
    } catch (e) {
        return failResponse((e as Error).message, echo)
    }
}
