/**
 * Mock 模式 - 共享种子数据
 * 多个路由模块共用的 bot/好友/群组/插件等基础数据
 */

import avatar from '@/assets/img/avatar.jpg'

// 统一使用项目自带的默认头像，避免假外链裂图
export const defaultAva: string = avatar

export const now = () => new Date().toISOString()

const rand = (min: number, max: number) =>
    Math.floor(Math.random() * (max - min + 1)) + min

export const mockBots = [
    {
        self_id: '2854196310',
        nickname: '小真寻',
        ava_url: defaultAva,
        platform: 'aiocqhttp',
        friend_count: 186,
        group_count: 42,
        received_messages: 58241,
        day_call: 328,
        connect_date: '2026-07-01T08:00:00Z',
        total_call: 25861,
        messages_total: 58241,
        is_running: true,
        uptime: 3974400,
        uptime_formatted: '46天0小时',
        start_time: '2026-07-01T08:00:00Z',
        message_count: 58241,
    },
    {
        self_id: '3725234231',
        nickname: '小绪山',
        ava_url: defaultAva,
        platform: 'aiocqhttp',
        friend_count: 92,
        group_count: 17,
        received_messages: 12045,
        day_call: 87,
        connect_date: '2026-07-21T10:30:00Z',
        total_call: 6841,
        messages_total: 12045,
        is_running: true,
        uptime: 2246400,
        uptime_formatted: '26天0小时',
        start_time: '2026-07-21T10:30:00Z',
        message_count: 12045,
    },
]

export const mockFriends = Array.from({ length: 12 }, (_, i) => ({
    user_id: String(10000000 + i * 137),
    nickname: `好友_${i + 1}号`,
    remark: i % 3 === 0 ? `特别关注${i + 1}` : '',
    ava_url: defaultAva,
    is_online: i % 2 === 0,
    last_message: ['今天也要加油哦', '看看这个', '呜呜', '哈哈哈哈', '晚安'][i % 5],
}))

export const mockGroups = Array.from({ length: 8 }, (_, i) => ({
    group_id: String(700000000 + i * 911),
    group_name: ['真寻交流群', '涩涩不许看', '技术摸鱼群', '游戏开黑群', '睡前故事会', '考研互助', '猫猫可爱捏', '干饭第一名'][i],
    member_count: rand(12, 480),
    ava_img: defaultAva,
    level: ['闲聊', '正常', '活跃', '火爆'][i % 4],
}))

export const mockPlugins = [
    { id: 1, module: 'basic_help', name: '基础帮助', description: '查看真寻的功能列表与帮助', author: 'HibiKier', version: '0.9.3', plugin_type: 'normal', is_enabled: true, allow_switch: true, allow_setting: false, is_builtin: true },
    { id: 2, module: 'chat_ai', name: 'AI聊天', description: '接入大语言模型的智能对话', author: 'HibiKier', version: '1.4.0', plugin_type: 'normal', is_enabled: true, allow_switch: true, allow_setting: true, is_builtin: false },
    { id: 3, module: 'poke', name: '戳一戳', description: '群内戳一戳互动小游戏', author: 'HibiKier', version: '0.5.1', plugin_type: 'normal', is_enabled: true, allow_switch: true, allow_setting: true, is_builtin: false },
    { id: 4, module: 'management', name: '群管', description: '群组管理相关功能', author: 'HibiKier', version: '1.0.0', plugin_type: 'admin', is_enabled: true, allow_switch: true, allow_setting: true, is_builtin: false },
    { id: 5, module: 'black_word', name: '敏感词', description: '敏感词检测与惩罚', author: 'HibiKier', version: '0.8.0', plugin_type: 'admin', is_enabled: false, allow_switch: true, allow_setting: true, is_builtin: false },
    { id: 6, module: 'epic', name: 'Epic喜加一', description: '定时推送 Epic 免费游戏', author: 'HibiKier', version: '0.6.2', plugin_type: 'normal', is_enabled: true, allow_switch: true, allow_setting: true, is_builtin: false },
    { id: 7, module: 'gold_redbag', name: '红包', description: '金币红包小游戏', author: 'HibiKier', version: '1.1.0', plugin_type: 'normal', is_enabled: false, allow_switch: true, allow_setting: false, is_builtin: false },
    { id: 8, module: 'check', name: '签到', description: '每日签到获取金币与好感度', author: 'HibiKier', version: '0.9.0', plugin_type: 'normal', is_enabled: true, allow_switch: true, allow_setting: true, is_builtin: false },
    { id: 9, module: 'bilibili_push', name: 'B站推送', description: 'UP主动态与直播推送', author: ' yuanbisai857', version: '0.3.4', plugin_type: 'normal', is_enabled: true, allow_switch: true, allow_setting: true, is_builtin: false },
    { id: 10, module: 'music', name: '点歌', description: '在线点歌分享', author: 'HibiKier', version: '0.7.0', plugin_type: 'normal', is_enabled: true, allow_switch: true, allow_setting: false, is_builtin: false },
    { id: 11, module: 'models', name: '模型管理', description: 'AI模型切换管理', author: 'HibiKier', version: '1.2.0', plugin_type: 'hidden', is_enabled: true, allow_switch: false, allow_setting: false, is_builtin: false },
    { id: 12, module: 'fortune', name: '今日运势', description: '抽签查看今日运势', author: 'HibiKier', version: '0.4.0', plugin_type: 'normal', is_enabled: true, allow_switch: true, allow_setting: false, is_builtin: false },
]

export const mockGroupMembers = Array.from({ length: 15 }, (_, i) => ({
    user_id: String(10000000 + i * 137),
    nickname: `群员_${i + 1}`,
    card: i % 4 === 0 ? '' : `马甲${i + 1}`,
    ava_url: defaultAva,
    role: i === 0 ? 'owner' : i < 4 ? 'admin' : 'member',
    level: rand(1, 60),
    join_time: `2025-${String(rand(1, 12)).padStart(2, '0')}-${String(rand(1, 28)).padStart(2, '0')}`,
    last_sent_time: now(),
}))

export { rand }
