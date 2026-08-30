/**
 * Mock 路由 - 系统配置 / 数据库
 */
import type { MockRoute } from '../types'
import { rand } from '../fixtures'

const envFiles = new Map<string, string>([
    ['.env.dev', 'DB_URL=sqlite+aiosqlite:///data/zhenxun.db\nLOG_LEVEL=INFO\nSUPERUSERS=["123456789"]\n'],
    ['.env.prod', 'DB_URL=postgresql+asyncpg://zhenxun:zhenxun@localhost:5432/zhenxun\nLOG_LEVEL=WARNING\n'],
])

let yamlContent = '# 真寻配置文件 (mock)\nself: \n  nickname: 小真寻\n  fallback_nicknames: \n    - 小寻\ncommand_start: \n  - ""\n'

export const configRoutes: MockRoute[] = [
    {
        method: 'get',
        url: '/config/env',
        response: ({ query }) => ({
            name: query.name || '.env.dev',
            content: envFiles.get(query.name || '.env.dev') ?? '# 空的环境文件\n',
        }),
    },
    {
        method: 'post',
        url: '/config/env',
        response: ({ body }) => {
            envFiles.set(body?.name, body?.content ?? '')
            return true
        },
    },
    {
        method: 'get',
        url: '/config/yaml',
        response: () => ({ file_path: 'config.yaml', content: yamlContent }),
    },
    {
        method: 'post',
        url: '/config/yaml',
        response: ({ body }) => {
            yamlContent = body?.content ?? ''
            return true
        },
    },
    {
        method: 'get',
        url: '/config/value',
        response: ({ query }) => {
            const store: Record<string, Record<string, string>> = {
                self: { nickname: '小真寻' },
                command_start: { value: '[""]' },
                scheduling: { enable: 'true' },
            }
            return store[query.module]?.[query.key] ?? null
        },
    },
    {
        method: 'post',
        url: '/config/value',
        response: () => true,
    },
]

const tables = [
    { name: 'chat_history', columns: ['id', 'user_id', 'group_id', 'message', 'created_at'] },
    { name: 'users', columns: ['user_id', 'user_name', 'gold', 'favorability', 'created_at'] },
    { name: 'group_info', columns: ['group_id', 'group_name', 'member_count', 'level'] },
    { name: 'plugin_info', columns: ['id', 'module', 'name', 'is_enabled'] },
    { name: 'sign_log', columns: ['id', 'user_id', 'sign_date', 'impression'] },
]

export const databaseRoutes: MockRoute[] = [
    {
        method: 'get',
        url: '/database/tables',
        response: () => tables.map(t => t.name),
    },
    {
        method: 'get',
        url: '/database/tables/:table/columns',
        response: ({ params }) => {
            const table = tables.find(t => t.name === params.table)
            if (!table) {
                return { success: false, message: `表不存在: ${params.table}`, code: 404, data: null }
            }
            return table.columns.map((name, i) => ({
                name,
                type: ['INTEGER', 'VARCHAR(255)', 'TEXT', 'DATETIME', 'BOOLEAN'][i % 5],
                nullable: i > 0,
                primary_key: i === 0,
            }))
        },
    },
    {
        method: 'get',
        url: '/database/tables/:table/data',
        response: ({ params, query }) => {
            const table = tables.find(t => t.name === params.table)
            if (!table) {
                return { success: false, message: `表不存在: ${params.table}`, code: 404, data: null }
            }
            const page = Number(query.page || 1)
            const pageSize = Number(query.page_size || 10)
            const total = 57
            const items = Array.from({ length: Math.min(pageSize, total - (page - 1) * pageSize) }, (_, i) => {
                const row: Record<string, any> = {}
                table.columns.forEach((col, j) => {
                    if (col === 'id') row[col] = (page - 1) * pageSize + i + 1
                    else if (col.endsWith('_id')) row[col] = String(rand(10000, 99999))
                    else if (col.includes('count') || col === 'gold' || col === 'level') row[col] = rand(0, 500)
                    else if (col.startsWith('is_') || col === 'nullable') row[col] = i % 2 === 0
                    else if (col.includes('date') || col.includes('_at')) row[col] = new Date().toISOString()
                    else row[col] = `${col}_${i + 1}的样例数据`
                })
                return { id: row.id ?? i, data: row }
            })
            return { items, total, page, page_size: pageSize, has_next: page * pageSize < total, has_prev: page > 1 }
        },
    },
    {
        method: 'post',
        url: '/database/execute',
        response: ({ body }) => {
            const sql = (body?.sql || '').trim()
            if (/^select/i.test(sql)) {
                const data = Array.from({ length: 5 }, (_, i) => ({
                    id: i + 1,
                    value: rand(1, 100),
                }))
                return { success: true, message: `查询成功，返回 ${data.length} 行 (mock)`, data, rows_affected: data.length }
            }
            return { success: true, message: `执行成功，影响 ${rand(1, 12)} 行 (mock)`, rows_affected: rand(1, 12) }
        },
    },
]
