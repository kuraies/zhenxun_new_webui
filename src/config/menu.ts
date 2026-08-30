/**
 * 菜单配置
 * 集中管理侧边栏菜单项配置
 */

import { reactive } from "vue";
import type { Component } from "vue";
import {
    Blocks,
    Bug,
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
    /** 外部链接：点击时新窗口打开而不走路由（如独立调试客户端） */
    external?: boolean;
    /** 以命名 popup 独立窗口打开（无标签栏，应用窗口感），值为窗口名 */
    externalWindow?: string;
    /** 子菜单 */
    children?: MenuItem[];
    /** 是否隐藏 */
    hidden?: boolean;
}

/** 独立调试客户端 PWA 地址（随主站部署；dev 下主站 dev server 直接可访问） */
export const DEBUG_PWA_URL = `${import.meta.env.BASE_URL}debug/index.html`;

/**
 * 以独立应用窗口（popup，无标签栏/地址栏）打开外部页面，
 * 使用命名窗口，重复点击会复用并聚焦同一个窗口。
 * 尺寸跟随主站窗口的比例（90%），并相对主站窗口居中
 */
export const openExternalWindow = (url: string, windowName: string) => {
    const width = Math.max(480, Math.round(window.innerWidth * 0.9));
    const height = Math.max(600, Math.round(window.innerHeight * 0.9));
    const left = Math.max(0, window.screenX + (window.innerWidth - width) / 2);
    const top = Math.max(0, window.screenY + (window.innerHeight - height) / 2);
    window.open(
        url,
        windowName,
        `noopener,popup=yes,width=${width},height=${height},left=${left},top=${top}`,
    );
};

/** 打开独立 OneBot 调试客户端；已打开过则直接聚焦原窗口（不会重载页面、连接不断） */
export const openDebugClient = () => {
    // 以空地址按窗口名探测：同名窗口已存在时返回其引用且不触发导航，
    // about:blank 则说明窗口不存在，关掉探针后正常新开
    const probe = window.open("", "zhenxun-debug-client");
    if (probe) {
        try {
            if (probe.location.href !== "about:blank") {
                probe.focus();
                return;
            }
        } catch {
            // 跨域窗口视为已存在，直接聚焦
            probe.focus();
            return;
        }
        probe.close();
    }

    const width = Math.max(480, Math.round(window.innerWidth * 0.9));
    const height = Math.max(600, Math.round(window.innerHeight * 0.9));
    const left = Math.max(0, window.screenX + (window.innerWidth - width) / 2);
    const top = Math.max(0, window.screenY + (window.innerHeight - height) / 2);
    window.open(
        DEBUG_PWA_URL,
        "zhenxun-debug-client",
        `noopener,popup=yes,width=${width},height=${height},left=${left},top=${top}`,
    );
};

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
        name: "调试",
        key: "debug",
        icon: Bug,
        // 独立 OneBot 调试客户端 PWA，以独立应用窗口打开
        path: DEBUG_PWA_URL,
        external: true,
        externalWindow: "zhenxun-debug-client",
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

/** 所有菜单 key 按侧边栏视觉顺序（父项在前、子项随后）映射为序号 */
export function getMenuOrderMap(): Record<string, number> {
    const orderMap: Record<string, number> = {};
    let index = 0;
    for (const menu of mainMenus) {
        orderMap[menu.key] = index++;
        for (const child of menu.children ?? []) {
            orderMap[child.key] = index++;
        }
    }
    return orderMap;
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
