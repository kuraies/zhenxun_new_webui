/**
 * 菜单配置
 * 集中管理侧边栏菜单项配置
 */

import type { Component } from "vue";
import {
    Blocks,
    ChartBar,
    Database,
    Folder,
    LayoutPanelLeft,
    MessageSquareMore,
} from "lucide-vue-next";

export interface MenuItem {
    /** 菜单名称 */
    name: string;
    /** 菜单唯一标识（用于路由匹配） */
    key: string;
    /** 菜单图标 */
    icon?: Component;
    /** 路由路径 */
    path?: string;
    /** 子菜单 */
    children?: MenuItem[];
    /** 是否隐藏 */
    hidden?: boolean;
}

/**
 * 主菜单配置
 */
export const mainMenus: MenuItem[] = [
    {
        name: "首页",
        key: "dashboard",
        icon: LayoutPanelLeft,
        path: "/dashboard",
    },
    {
        name: "联系人",
        key: "chat",
        icon: MessageSquareMore,
        path: "/chat",
    },
    {
        name: "插件",
        key: "plugin",
        icon: Blocks,
        path: "/plugin",
    },
    {
        name: "文件",
        key: "files",
        icon: Folder,
        path: "/files",
    },
    {
        name: "数据库",
        key: "database",
        icon: Database,
        path: "/database",
    },
    {
        name: "数据统计",
        key: "analytics",
        icon: ChartBar,
        path: "/analytics",
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
];

/**
 * 获取菜单项通过 key
 */
export function getMenuByKey(key: string): MenuItem | undefined {
    return mainMenus.find((menu) => menu.key === key);
}
