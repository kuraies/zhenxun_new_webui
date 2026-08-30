/**
 * Mock 路由 - 群组/好友管理、聊天（/manage/* 同时覆盖 chatApi 的调用）
 */
import type { MockRoute } from '../types'
import { mockFriends, mockGroups, mockGroupMembers, mockPlugins, now, rand, defaultAva } from '../fixtures'

// 可变的好友/群组状态，增删改在 mock 内真实生效
const friends = mockFriends.map(f => ({ ...f }))
const groups = mockGroups.map(g => ({ ...g }))

const requests = [
    { request_id: 1, request_type: 'friend', user_id: '20000001', nickname: '求加好友', comment: '你好呀，想加个好友~', flag: 'mock_flag_1', time: now() },
    { request_id: 2, request_type: 'group', user_id: '20000002', nickname: '拉群的', group_id: '700999999', group_name: '新群邀请', comment: '来我群里玩吧', flag: 'mock_flag_2', time: now() },
]

const blacklist: { user_id: string; group_id: string | null; reason: string; time: string }[] = [
    { user_id: '30000001', group_id: null, reason: '恶意刷屏', time: '2026-08-01T12:00:00Z' },
]

export const manageRoutes: MockRoute[] = [
    {
        method: 'get',
        url: '/manage/friend-list',
        response: () => friends,
    },
    {
        method: 'get',
        url: '/manage/group-list',
        response: () => groups,
    },
    {
        method: 'post',
        url: '/manage/send-message',
        response: ({ body }) => {
            console.debug('[Mock] 发送消息:', body?.user_id || body?.group_id, body?.message)
            return true
        },
    },
    {
        method: 'post',
        url: '/manage/leave-group',
        response: ({ body }) => {
            const idx = groups.findIndex(g => g.group_id === String(body?.group_id))
            if (idx !== -1) groups.splice(idx, 1)
            return true
        },
    },
    {
        method: 'post',
        url: '/manage/delete-friend',
        response: ({ body }) => {
            const idx = friends.findIndex(f => f.user_id === String(body?.user_id))
            if (idx !== -1) friends.splice(idx, 1)
            return true
        },
    },
    {
        method: 'get',
        url: '/manage/group-detail',
        response: ({ query }) => {
            const group = groups.find(g => g.group_id === String(query.group_id)) || groups[0]
            return {
                ...group,
                group_id: String(query.group_id || group.group_id),
                bot_id: query.bot_id || '2854196310',
                introduction: '这是一个 mock 群组的简介~',
                max_member_count: 500,
                member_count: group.member_count,
                created_at: '2025-06-01T00:00:00Z',
            }
        },
    },
    {
        method: 'post',
        url: '/manage/update-group',
        response: ({ body }) => {
            const group = groups.find(g => g.group_id === String(body?.group_id))
            if (group) Object.assign(group, body)
            return true
        },
    },
    {
        method: 'get',
        url: '/manage/group-members',
        response: ({ query }) => {
            const members = mockGroupMembers.map(m => ({
                ...m,
                group_id: String(query.group_id || ''),
            }))
            return query.user_id
                ? members.filter(m => m.user_id === String(query.user_id))
                : members
        },
    },
    {
        method: 'get',
        url: '/manage/member-detail',
        response: ({ query }) => {
            const member = mockGroupMembers.find(m => m.user_id === String(query.user_id)) || mockGroupMembers[0]
            return {
                ...member,
                user_id: String(query.user_id || member.user_id),
                group_id: String(query.group_id || ''),
                join_time: member.join_time,
                last_sent_time: now(),
                mute_expire: 0,
                in_blacklist: blacklist.some(b => b.user_id === member.user_id),
            }
        },
    },
    {
        method: 'post',
        url: '/manage/update-member',
        response: () => true,
    },
    {
        method: 'get',
        url: '/manage/group-plugins',
        response: () =>
            mockPlugins
                .filter(p => p.plugin_type === 'normal')
                .map(p => ({ module: p.module, name: p.name, enable: p.is_enabled })),
    },
    {
        method: 'post',
        url: '/manage/toggle-group-plugin',
        response: () => true,
    },
    {
        method: 'get',
        url: '/manage/group-statistics',
        response: () => ({
            message_count: rand(800, 5000),
            plugin_call_count: rand(100, 900),
            active_members: rand(10, 80),
            trend: Array.from({ length: 7 }, (_, i) => ({
                date: new Date(Date.now() - (6 - i) * 86400000).toISOString().slice(0, 10),
                count: rand(50, 500),
            })),
        }),
    },
    {
        method: 'get',
        url: '/manage/blacklist',
        response: () => blacklist,
    },
    {
        method: 'post',
        url: '/manage/add-blacklist',
        response: ({ body }) => {
            blacklist.push({
                user_id: String(body?.user_id),
                group_id: body?.group_id ? String(body.group_id) : null,
                reason: body?.reason || '',
                time: now(),
            })
            return true
        },
    },
    {
        method: 'post',
        url: '/manage/remove-blacklist',
        response: ({ body }) => {
            const idx = blacklist.findIndex(b => b.user_id === String(body?.user_id))
            if (idx !== -1) blacklist.splice(idx, 1)
            return true
        },
    },
    {
        method: 'get',
        url: '/manage/plugin-permissions',
        response: ({ query }) =>
            mockPlugins
                .filter(p => p.plugin_type === 'normal')
                .map((p, i) => ({
                    module: p.module,
                    name: p.name,
                    group_id: String(query.group_id || ''),
                    status: (['允许', '询问', '禁止'] as const)[i % 3],
                })),
    },
    {
        method: 'post',
        url: '/manage/update-plugin-permissions',
        response: () => true,
    },
    {
        method: 'get',
        url: '/manage/request-list',
        response: () => requests,
    },
    {
        method: 'post',
        url: '/manage/handle-request',
        response: ({ body }) => {
            const idx = requests.findIndex(r => r.request_id === body?.request_id)
            if (idx !== -1) requests.splice(idx, 1)
            return true
        },
    },
    {
        method: 'post',
        url: '/manage/clear-request',
        response: ({ body }) => {
            for (let i = requests.length - 1; i >= 0; i--) {
                if (!body?.request_type || requests[i].request_type === body.request_type) {
                    requests.splice(i, 1)
                }
            }
            return true
        },
    },
    {
        method: 'get',
        url: '/manage/friend-detail',
        response: ({ query }) => {
            const friend = friends.find(f => f.user_id === String(query.user_id)) || friends[0]
            return {
                ...friend,
                user_id: String(query.user_id || friend.user_id),
                bot_id: query.bot_id || '2854196310',
                gold: rand(0, 9999),
                favorability: rand(0, 500),
                sign_days: rand(0, 365),
                is_blacklisted: blacklist.some(b => b.user_id === friend.user_id),
                created_at: '2025-01-01T00:00:00Z',
            }
        },
    },
    {
        method: 'post',
        url: '/manage/update-friend',
        response: ({ body }) => {
            const friend = friends.find(f => f.user_id === String(body?.user_id))
            if (friend) Object.assign(friend, body)
            return true
        },
    },
    {
        method: 'get',
        url: '/manage/friend-trend',
        response: ({ query }) => {
            const days = Number(query.days || 7)
            return Array.from({ length: days }, (_, i) => ({
                date: new Date(Date.now() - (days - 1 - i) * 86400000).toISOString().slice(0, 10),
                message_count: rand(0, 60),
                plugin_call_count: rand(0, 20),
            }))
        },
    },
    {
        method: 'post',
        url: '/chat/recall-message',
        response: ({ body }) => {
            console.debug('[Mock] 撤回消息:', body?.message_id)
            return true
        },
    },
]

export const analyticsRoutes: MockRoute[] = [
    {
        method: 'get',
        url: '/analytics/trend',
        response: ({ query }) => {
            const granularity = query.granularity || 'day'
            const points = Array.from({ length: 14 }, (_, i) => ({
                timestamp: new Date(Date.now() - (13 - i) * 86400000).toISOString(),
                message_count: rand(200, 1800),
                plugin_call_count: rand(50, 600),
            }))
            return {
                data_points: points,
                total_message_count: points.reduce((s, p) => s + p.message_count, 0),
                total_plugin_call_count: points.reduce((s, p) => s + p.plugin_call_count, 0),
                granularity,
                start_time: points[0].timestamp,
                end_time: points[points.length - 1].timestamp,
            }
        },
    },
    {
        method: 'get',
        url: '/analytics/statistics',
        response: () => ({
            groups: groups.slice(0, 5).map(g => ({
                group_id: g.group_id,
                group_name: g.group_name,
                message_count: rand(100, 5000),
                plugin_call_count: rand(50, 900),
            })),
            friends: friends.slice(0, 5).map(f => ({
                user_id: f.user_id,
                user_name: f.nickname,
                message_count: rand(10, 800),
                plugin_call_count: rand(5, 300),
            })),
            start_time: new Date(Date.now() - 14 * 86400000).toISOString(),
            end_time: now(),
        }),
    },
    {
        method: 'get',
        url: '/analytics/favorability-top10',
        response: () =>
            Array.from({ length: 10 }, (_, i) => ({
                user_id: String(10000000 + i * 137),
                user_name: `好感度大佬_${i + 1}`,
                favorability: 10000 - i * 743,
                ava_url: defaultAva,
            })),
    },
    {
        method: 'get',
        url: '/analytics/gold-top10',
        response: () =>
            Array.from({ length: 10 }, (_, i) => ({
                user_id: String(10000000 + i * 137),
                user_name: `金币土豪_${i + 1}`,
                gold: 999999 - i * 52437,
                ava_url: defaultAva,
            })),
    },
]
