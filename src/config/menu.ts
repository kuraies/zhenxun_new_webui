/**
 * 菜单配置
 * 集中管理侧边栏菜单项配置
 */

import type { Component } from "vue";
import {
    Blocks,
    ChartBar,
    Database,
    FileText,
    Folder,
    LayoutPanelLeft,
    LogOut,
    MessageSquareMore,
    Package,
    Shield
} from "lucide-vue-next";

export interface MenuItem {
    /** 菜单名称 */
    name: string
    /** 菜单唯一标识（用于路由匹配） */
    key: string
    /** 菜单图标 */
    icon?: Component
    /** 路由路径 */
    path?: string
    /** 子菜单 */
    children?: MenuItem[]
    /** 是否隐藏 */
    hidden?: boolean
}

/**
 * 主菜单配置
 */
export const mainMenus: MenuItem[] = [
    {
        name: '首页',
        key: 'dashboard',
        icon: LayoutPanelLeft,
        path: '/dashboard'
    },
    {
        name: '数据统计',
        key: 'analytics',
        icon: ChartBar,
        path: '/analytics'
    },
    {
        name: '管理',
        key: 'manage',
        icon: Shield,
        path: '/manage'
    },
    {
        name: '聊天',
        key: 'chat',
        icon: MessageSquareMore,
        path: '/chat'
    },
    {
        name: '插件列表',
        key: 'plugin',
        icon: Blocks,
        path: '/plugin'
    },
    {
        name: '插件市场',
        key: 'store',
        icon: Package,
        path: '/store'
    },
    {
        name: '文件',
        key: 'files',
        icon: Folder,
        path: '/files'
    },
    {
        name: '数据库',
        key: 'database',
        icon: Database,
        path: '/database'
    },
    {
        name: '实时日志',
        key: 'logs',
        icon: FileText,
        path: '/logs'
    },
    // {
    //     name: '设置',
    //     key: 'settings',
    //     icon: Settings,
    //     path: '/settings'
    // },
    // {
    //     name: '关于',
    //     key: 'about',
    //     icon: Info,
    //     path: '/about'
    // }
]

/**
 * 底部菜单配置
 */
export const bottomMenus: MenuItem[] = [
    {
        name: '退出登录',
        key: 'logout',
        icon: LogOut,
        path: '/login'
    }
]

/**
 * 获取菜单项通过 key
 */
export function getMenuByKey(key: string): MenuItem | undefined {
    return [...mainMenus, ...bottomMenus].find(menu => menu.key === key)
}
