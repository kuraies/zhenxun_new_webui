/**
 * 菜单配置
 * 集中管理侧边栏菜单项配置
 */

import { reactive } from "vue";
import type { Component } from "vue";
import {
    Blocks,
    ChartBar,
    Database,
    FlaskConical,
    Folder,
    LayoutPanelLeft,
    MessageSquareMore,
    Sparkles,
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
 *
 * 使用 reactive 包裹，便于运行时动态注册菜单（如插件注册二级菜单）
 */
export const mainMenus = reactive<MenuItem[]>([
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
    {
        name: "扩展",
        key: "extensions",
        icon: FlaskConical,
        children: [
            {
                name: "测试按钮",
                key: "ext-test",
                icon: Sparkles,
                path: "/ext/test",
            },
        ],
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
]);

/**
 * 获取菜单项通过 key（含二级菜单）
 */
export function getMenuByKey(key: string): MenuItem | undefined {
    for (const menu of mainMenus) {
        if (menu.key === key) return menu;
        const child = menu.children?.find((item) => item.key === key);
        if (child) return child;
    }
    return undefined;
}

/**
 * 运行时注册菜单项（供插件注册二级菜单使用）
 *
 * @param item 要注册的菜单项
 * @param parentKey 传入时挂载为该一级菜单的二级菜单，否则作为一级菜单追加
 * @returns 是否注册成功（key 重复或找不到父级时失败）
 */
export function registerMenuItem(item: MenuItem, parentKey?: string): boolean {
    if (getMenuByKey(item.key)) return false;

    if (!parentKey) {
        mainMenus.push(item);
        return true;
    }

    const parent = mainMenus.find((menu) => menu.key === parentKey);
    if (!parent) return false;

    (parent.children ??= []).push(item);
    return true;
}
