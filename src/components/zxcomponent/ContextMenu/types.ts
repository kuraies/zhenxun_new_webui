import type { Component } from "vue";

export interface ZXContextMenuItem {
    /** 菜单项文字 */
    label: string;
    /** 可选图标（lucide 组件） */
    icon?: Component;
    /** 危险操作样式（红色） */
    danger?: boolean;
    disabled?: boolean;
    /** 点击回调，菜单会先关闭再执行 */
    action?: () => void;
}

export interface ZXContextMenuOptions {
    /** 打开位置（视口坐标，通常用鼠标事件 clientX/clientY） */
    x: number;
    y: number;
    items: ZXContextMenuItem[];
}
