/**
 * WebUI Next API - 聊天相关接口
 */

import { api } from './client'
import type { Friend, Group, SendMessageParam } from '@/types/chat.types'
import type { APIResponse } from '@/types/api-next.types'

export const chatApi = {
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
    sendMessage(param: SendMessageParam): Promise<APIResponse<boolean>> {
        return api.post('/manage/send-message', param)
    },

    /**
     * 撤回消息
     */
    recallMessage(message_id: number): Promise<APIResponse<boolean>> {
        return api.post('/chat/recall-message', { message_id })
    }
}
