/**
 * Mock 路由 - 系统状态
 */
import type { MockRoute } from '../types'
import { now, rand, defaultAva } from '../fixtures'

export const systemRoutes: MockRoute[] = [
    {
        method: 'get',
        url: '/system/status',
        response: () => ({
            cpu: rand(5, 45),
            memory: rand(30, 70),
            disk: rand(20, 60),
            check_time: now(),
        }),
    },
    {
        method: 'get',
        url: '/system/health',
        response: () => ({
            status: 'healthy',
            cpu_status: 'normal',
            memory_status: 'normal',
            disk_status: 'normal',
            recommendations: ['一切正常，小真寻正在努力工作中~'],
        }),
    },
    {
        method: 'get',
        url: '/system/bot-status',
        response: () => ({
            self_id: '2854196310',
            nickname: '小真寻',
            ava_url: defaultAva,
            is_running: true,
            uptime: 3974400,
            uptime_formatted: '46天0小时',
            group_count: 42,
            friend_count: 186,
            message_count: 58241,
            start_time: '2026-07-01T08:00:00Z',
        }),
    },
    {
        method: 'get',
        url: '/system/network',
        response: () => ({ baidu: true, google: false }),
    },
    {
        method: 'get',
        url: '/system/ping',
        delay: 50,
        response: () => ({ pong: true }),
    },
    {
        method: 'get',
        url: '/system/info',
        response: () => ({
            version: '0.9.3-mock',
            system: 'Linux',
            arch: 'amd64',
            cpu_brand: 'AMD Ryzen 9 5900X 12-Core Processor',
            cpu_cores: 12,
            cpu_freq_mhz: 3700,
            memory_total: 34359738368,
            disk_total: 512110190592,
            nickname: '小真寻',
        }),
    },
    {
        method: 'post',
        url: '/system/restart',
        delay: 600,
        response: () => true,
    },
]
