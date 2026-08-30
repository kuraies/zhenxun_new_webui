/**
 * Mock 路由 - 主页 / 仪表盘
 */
import type { MockRoute } from '../types'
import { mockBots, mockPlugins, rand, defaultAva } from '../fixtures'

export const mainRoutes: MockRoute[] = [
    {
        method: 'get',
        url: '/main/bot-status',
        response: ({ query }) => {
            const bot = mockBots.find(b => b.self_id === query.bot_id) || mockBots[0]
            return bot
        },
    },
    {
        method: 'get',
        url: '/main/bot-list',
        response: () => mockBots,
    },
    {
        method: 'get',
        url: '/main/chat-statistics',
        // 近 7 天聊天量
        response: () => {
            const result: Record<string, number> = {}
            for (let i = 6; i >= 0; i--) {
                const d = new Date()
                d.setDate(d.getDate() - i)
                const key = d.toISOString().slice(0, 10)
                result[key] = rand(400, 1800)
            }
            return result
        },
    },
    {
        method: 'get',
        url: '/main/plugin-statistics',
        response: () => {
            const result: Record<string, number> = {}
            mockPlugins.forEach(p => {
                result[p.name] = rand(5, 800)
            })
            return result
        },
    },
    {
        method: 'get',
        url: '/main/active-groups',
        response: () =>
            [
                { group_id: '700000000', name: '真寻交流群', chat_num: rand(200, 900), ava_img: defaultAva },
                { group_id: '700000911', name: '技术摸鱼群', chat_num: rand(200, 900), ava_img: defaultAva },
                { group_id: '700001822', name: '游戏开黑群', chat_num: rand(200, 900), ava_img: defaultAva },
                { group_id: '700002733', name: '猫猫可爱捏', chat_num: rand(200, 900), ava_img: defaultAva },
                { group_id: '700003644', name: '干饭第一名', chat_num: rand(200, 900), ava_img: defaultAva },
            ].sort((a, b) => b.chat_num - a.chat_num),
    },
    {
        method: 'get',
        url: '/main/hot-plugins',
        response: () =>
            [
                { plugin_name: 'AI聊天', call_count: rand(100, 900) },
                { plugin_name: '签到', call_count: rand(100, 900) },
                { plugin_name: '今日运势', call_count: rand(100, 900) },
                { plugin_name: '戳一戳', call_count: rand(100, 900) },
                { plugin_name: '点歌', call_count: rand(100, 900) },
                { plugin_name: 'Epic喜加一', call_count: rand(100, 900) },
            ].sort((a, b) => b.call_count - a.call_count),
    },
]

export const dashboardRoutes: MockRoute[] = [
    {
        method: 'get',
        url: '/dashboard',
        response: () => ({
            overview: {
                bot_status: 'online',
                uptime: 3974400,
                uptime_formatted: '46天0小时',
                group_count: 42,
                friend_count: 186,
                message_count_today: 1284,
                plugin_count: mockPlugins.length,
                enabled_plugin_count: mockPlugins.filter(p => p.is_enabled).length,
            },
            stats: {
                message_stats: { label: '今日消息', value: 1284, trend: 'up', change: 12.5 },
                user_stats: { label: '活跃用户', value: 326, trend: 'up', change: 4.2 },
                group_stats: { label: '活跃群组', value: 38, trend: 'stable', change: 0 },
                error_stats: { label: '今日错误', value: 3, trend: 'down', change: -40 },
            },
            quick_actions: [
                { name: '插件管理', description: '管理真寻的插件开关与配置', icon: 'plugin', action_type: 'plugin' },
                { name: '系统信息', description: '查看系统运行状态', icon: 'system', action_type: 'system' },
                { name: '数据库', description: '查询与管理数据库', icon: 'database', action_type: 'database' },
                { name: '文件管理', description: '浏览服务器文件', icon: 'file', action_type: 'file' },
            ],
            system_health: 'healthy',
        }),
    },
    {
        method: 'get',
        url: '/dashboard/statistics',
        response: () => ({
            groups: [
                { group_id: '700000000', group_name: '真寻交流群', message_count: 5821, plugin_call_count: 1284 },
                { group_id: '700000911', group_name: '技术摸鱼群', message_count: 4120, plugin_call_count: 987 },
                { group_id: '700001822', group_name: '游戏开黑群', message_count: 3856, plugin_call_count: 845 },
                { group_id: '700002733', group_name: '猫猫可爱捏', message_count: 2410, plugin_call_count: 532 },
            ],
            friends: [
                { user_id: '10000000', user_name: '好友_1号', message_count: 812, plugin_call_count: 245 },
                { user_id: '10000137', user_name: '好友_2号', message_count: 654, plugin_call_count: 187 },
                { user_id: '10000274', user_name: '好友_3号', message_count: 523, plugin_call_count: 156 },
                { user_id: '10000411', user_name: '好友_4号', message_count: 388, plugin_call_count: 98 },
            ],
        }),
    },
    {
        method: 'get',
        url: '/dashboard/commits',
        response: () => [
            { sha: 'a1b2c3d', message: 'fix: 修复好感度统计偶发为负的问题', author: 'HibiKier', date: '2026-08-15T10:00:00Z' },
            { sha: 'e4f5g6h', message: 'feat: 新增插件商店更新提醒', author: 'yuanbisai857', date: '2026-08-14T18:30:00Z' },
            { sha: 'i7j8k9l', message: 'perf: 优化数据库批量写入', author: 'HibiKier', date: '2026-08-13T09:12:00Z' },
            { sha: 'm0n1o2p', message: 'docs: 更新部署文档', author: 'contributor', date: '2026-08-12T14:45:00Z' },
        ],
    },
]
