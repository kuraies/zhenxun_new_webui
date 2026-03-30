/**
 * Main 模块类型定义
 */

export interface BaseInfo {
    self_id: string
    nickname: string
    ava_url: string
    friend_count: number
    group_count: number
    received_messages: number
    connect_time: number
    connect_date: string | null
    connect_count: number
    status: boolean
    is_select: boolean
    day_call: number
    version: string
}

export interface QueryCount {
    num: number
    day: number
    week: number
    month: number
    year: number
}

export interface ActiveGroup {
    group_id: string
    name: string
    chat_num: number
    ava_img: string
}

export interface HotPlugin {
    plugin_name: string
    call_count: number
    module?: string
    name?: string
    count?: number
}

export interface BotBlockModule {
    bot_id: string
    block_plugins: string[]
    block_tasks: string[]
    all_plugins: Array<{ name: string; module: string }>
    all_tasks: Array<{ name: string; module: string }>
}

export interface BotManageUpdateParam {
    bot_id: string
    block_plugins: string[]
    block_tasks: string[]
}
