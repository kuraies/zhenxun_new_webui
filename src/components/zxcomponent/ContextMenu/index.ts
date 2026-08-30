/**
 * ZXContextMenu - 全局右键菜单（单例）
 *
 * 用法：
 *   import { ZXContextMenu } from "@/components/zxcomponent/ContextMenu";
 *   ZXContextMenu.show({
 *       x: e.clientX,
 *       y: e.clientY,
 *       items: [
 *           { label: "重命名", icon: Pencil, action: () => {} },
 *           { label: "删除", danger: true, action: () => {} },
 *       ],
 *   });
 *
 * 在模板元素上需要 @contextmenu.prevent="..." 触发。
 */
import { createVNode, reactive, render } from "vue";
import { Copy } from "lucide-vue-next";
import ContextMenu from "./ContextMenu.vue";
import type { ZXContextMenuItem, ZXContextMenuOptions } from "./types";

export type { ZXContextMenuItem, ZXContextMenuOptions };

export interface ZXContextMenuState {
    visible: boolean;
    x: number;
    y: number;
    items: ZXContextMenuItem[];
}

const state = reactive<ZXContextMenuState>({
    visible: false,
    x: 0,
    y: 0,
    items: [],
});

let container: HTMLElement | null = null;

function ensureMounted() {
    if (container) return;
    container = document.createElement("div");
    document.body.appendChild(container);
    render(createVNode(ContextMenu, { state }), container);
}

/** 复制文本：优先剪贴板 API（需安全上下文），http 环境降级 execCommand */
const copyText = async (text: string): Promise<boolean> => {
    try {
        if (navigator.clipboard?.writeText) {
            await navigator.clipboard.writeText(text);
            return true;
        }
    } catch {
        /* 降级到 execCommand */
    }
    try {
        const textarea = document.createElement("textarea");
        textarea.value = text;
        textarea.style.cssText =
            "position:fixed;top:0;left:0;opacity:0;pointer-events:none";
        document.body.appendChild(textarea);
        textarea.select();
        const ok = document.execCommand("copy");
        textarea.remove();
        return ok;
    } catch {
        return false;
    }
};

export const ZXContextMenu = {
    /** 打开菜单（重复调用会以新内容覆盖当前菜单） */
    show(options: ZXContextMenuOptions) {
        ensureMounted();
        state.items = options.items;
        state.x = options.x;
        state.y = options.y;
        state.visible = true;
    },

    hide() {
        state.visible = false;
    },

    /** 供组件内部绑定的响应式状态 */
    state,
};

/**
 * 页面级右键通用入口：
 * - 始终 preventDefault 接管原生菜单
 * - 当前有选中文本时，自动在菜单顶部附加"复制"项
 * - 无选中且无自定义项时不弹菜单
 * 用法：元素上绑定 @contextmenu="openContextMenu"
 */
export const openContextMenu = (
    e: MouseEvent,
    items: ZXContextMenuItem[] = [],
) => {
    e.preventDefault();
    const selection = String(window.getSelection() ?? "").trim();
    if (!selection && items.length === 0) return;

    const menuItems: ZXContextMenuItem[] = [];
    if (selection) {
        menuItems.push({
            label: "复制",
            icon: Copy,
            action: async () => {
                const ok = await copyText(selection);
                // 通知组件按需异步加载，失败时静默（复制本身已生效/失败）
                import("@/components/zxcomponent/Notification").then(
                    ({ default: ZXNotification }) => {
                        ZXNotification({
                            title: ok ? "已复制" : "复制失败",
                            message: ok
                                ? selection.length > 20
                                    ? `${selection.slice(0, 20)}…`
                                    : selection
                                : "剪贴板不可用",
                            type: ok ? "success" : "error",
                        });
                    },
                );
            },
        });
    }
    menuItems.push(...items);
    ZXContextMenu.show({ x: e.clientX, y: e.clientY, items: menuItems });
};

export default ZXContextMenu;
