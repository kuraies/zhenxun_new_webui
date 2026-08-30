/**
 * OneBot v11 完整动作应答表
 * 覆盖 OneBot v11 标准 API + go-cqhttp 常用扩展，
 * 数据从模拟世界状态(simState)读取，未覆盖的动作按标准返回 1404
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

let sentIdSeq = 1

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

/** 应答一个动作请求 */
export function handleAction(request: ActionRequest, ctx: ActionContext): ActionResponse {
    const echo = request.echo
    const action = request.action.replace(/_async$/, '').replace(/^_.handle_/, '')
    const p = request.params ?? {}
    const ok = (data: unknown) => okResponse(data, echo)
    const fail = (message: string) => failResponse(message, echo)

    switch (action) {
        // ==================== 消息 ====================
        case 'send_msg':
        case 'send_private_msg':
        case 'send_group_msg': {
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
            return ok({ message_id: messageId })
        }

        case 'send_private_forward_msg':
        case 'send_group_forward_msg': {
            ctx.onBotMessage?.({
                messageType: action === 'send_group_forward_msg' ? 'group' : 'private',
                userId: p.user_id,
                groupId: p.group_id,
                message: '[合并转发消息]',
                text: '[合并转发消息]',
            })
            return ok({ message_id: recordSent(ctx, { message_type: "group", message: p.messages, raw_message: "[合并转发]" }) })
        }

        case 'delete_msg':
            simState.sentMessages.delete(Number(p.message_id))
            return ok(null)

        case 'get_msg': {
            const sent = simState.sentMessages.get(Number(p.message_id))
            if (!sent) return fail(`消息不存在: ${p.message_id}`)
            return ok(sent)
        }

        case 'get_forward_msg':
            return ok({ messages: [] })

        case 'send_like':
            return ok(null)

        case 'mark_msg_as_read':
        case 'set_msg_emoji_like':
            return ok(null)

        // ==================== 群操作 ====================
        case 'set_group_kick':
        case 'set_group_ban':
        case 'set_group_anonymous_ban':
        case 'set_group_whole_ban':
        case 'set_group_admin':
        case 'set_group_anonymous':
        case 'set_group_card':
        case 'set_group_special_title':
        case 'send_group_sign':
            return ok(null)

        case 'set_group_name': {
            const group = findGroup(p.group_id)
            if (!group) return fail(`群不存在: ${p.group_id}`)
            const name = String(p.group_name ?? '').trim()
            if (!name) return fail('群名不能为空')
            group.group_name = name
            return ok(null)
        }

        case 'set_group_leave': {
            const idx = simState.groups.findIndex(g => g.group_id === Number(p.group_id))
            if (idx === -1) return fail(`群不存在: ${p.group_id}`)
            const [removed] = simState.groups.splice(idx, 1)
            delete simState.members[removed.group_id]
            return ok(null)
        }

        case 'get_group_info':
        case 'get_group_info_ex': {
            const group = findGroup(p.group_id)
            if (!group) return fail(`群不存在: ${p.group_id}`)
            return ok(group)
        }

        case 'get_group_list':
            return ok(simState.groups)

        case 'get_group_member_info': {
            const member = findMember(p.group_id, p.user_id)
            if (!member) return fail(`群成员不存在: 群${p.group_id} 用户${p.user_id}`)
            return ok(member)
        }

        case 'get_group_member_list':
            return ok(simState.members[Number(p.group_id)] ?? [])

        case 'get_group_msg_history':
        case 'get_friend_msg_history':
            return ok({ messages: [] })

        case 'get_essence_msg_list':
            return ok([])

        case 'set_essence_msg':
        case 'delete_essence_msg':
            return ok(null)

        // ==================== 好友 / 请求 ====================
        case 'set_friend_add_request': {
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
            return ok(null)
        }

        case 'set_group_add_request':
            return ok(null)

        case 'delete_friend': {
            const idx = simState.friends.findIndex(f => f.user_id === Number(p.user_id))
            if (idx === -1) return fail(`好友不存在: ${p.user_id}`)
            simState.friends.splice(idx, 1)
            return ok(null)
        }

        case 'set_friend_remark': {
            const friend = simState.friends.find(f => f.user_id === Number(p.user_id))
            if (!friend) return fail(`好友不存在: ${p.user_id}`)
            friend.remark = String(p.remark ?? '')
            return ok(null)
        }

        case 'get_stranger_info': {
            const friend = simState.friends.find(f => f.user_id === Number(p.user_id))
            return ok(friend ?? { user_id: Number(p.user_id ?? 0), nickname: `用户${p.user_id ?? ''}`, sex: 'unknown', age: 0 })
        }

        case 'get_friend_list':
            return ok(simState.friends)

        // ==================== 登录 / 版本 / 状态 ====================
        case 'get_login_info':
            return ok({ user_id: simState.bot.user_id, nickname: simState.bot.nickname })

        case 'get_version_info':
        case 'get_version_info_ex':
            return ok({
                app_name: 'zhenxun-webui-simulator',
                app_version: '0.1.0',
                protocol_version: 'v11',
            })

        case 'get_status':
            return ok({
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
            })

        case 'can_send_image':
        case 'can_send_record':
            return ok({ yes: true })

        // ==================== 媒体 / 其它扩展 ====================
        case 'get_image':
            return ok({
                size: 1024,
                filename: 'simulated.png',
                url: 'https://example.com/simulated.png',
            })

        case 'get_record':
            return ok({ file: p.file ?? '', url: '', base64: '' })

        case 'get_online_clients':
        case 'get_word_slices':
            return ok([])

        case 'check_url_safely':
            return ok({ level: 1 })

        case 'set_qq_profile':
        case 'set_diy_online_status':
            return ok(null)

        case 'get_latest_events':
            return ok([])

        case 'ocr_image':
        case '.ocr_image':
            return ok({ texts: [], language: '' })

        default:
            return fail(`模拟客户端不支持的动作: ${action}`)
    }
}
