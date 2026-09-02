import type { ObjectDirective } from "vue";

interface TileGlowElement extends HTMLElement {
    _tileGlowCleanup?: () => void;
    _tileGlowEntry?: TileGlowEntry;
}

interface TileGlowEntry {
    el: TileGlowElement;
    reach: number;
    /** 自动扫描注册的条目：元素脱离文档后由扫描器回收（指令条目有自己的生命周期） */
    auto?: boolean;
}

const GLOW_ATTR = "data-tile-glow";
/** 统一边框的 Tailwind 类名，带上它 + 白底即视为发光表面 */
const AUTO_BORDER_TOKEN = "border-slate-200";

const DEFAULT_REACH = 96;

const entries = new Set<TileGlowEntry>();
let pointerX = 0;
let pointerY = 0;
let frameId = 0;
let isListening = false;

const getDistanceToRect = (x: number, y: number, rect: DOMRect) => {
    const dx = Math.max(rect.left - x, 0, x - rect.right);
    const dy = Math.max(rect.top - y, 0, y - rect.bottom);

    return Math.hypot(dx, dy);
};

const updateGlowPosition = (entry: TileGlowEntry) => {
    const { el, reach } = entry;
    const rect = el.getBoundingClientRect();

    if (rect.width === 0 || rect.height === 0) {
        el.style.setProperty("--zx-tile-glow-opacity", "0");
        return;
    }

    const distance = getDistanceToRect(pointerX, pointerY, rect);

    if (distance > reach) {
        el.style.setProperty("--zx-tile-glow-opacity", "0");
        return;
    }

    // 透明边框的表面不允许亮（如侧边栏未选中/未悬停的菜单按钮）
    const borderColor = getComputedStyle(el).borderTopColor;
    if (borderColor === "transparent" || borderColor === "rgba(0, 0, 0, 0)") {
        el.style.setProperty("--zx-tile-glow-opacity", "0");
        return;
    }

    const opacity = Math.min(1, 0.18 + (1 - distance / reach) * 0.82);

    el.style.setProperty("--zx-tile-glow-x", `${pointerX - rect.left}px`);
    el.style.setProperty("--zx-tile-glow-y", `${pointerY - rect.top}px`);
    el.style.setProperty("--zx-tile-glow-opacity", opacity.toFixed(3));
};

const updateAllGlowPositions = () => {
    frameId = 0;
    entries.forEach(updateGlowPosition);
};

const requestGlowUpdate = () => {
    if (frameId) return;
    frameId = window.requestAnimationFrame(updateAllGlowPositions);
};

const onPointerMove = (event: PointerEvent) => {
    pointerX = event.clientX;
    pointerY = event.clientY;
    requestGlowUpdate();
};

const onPointerLeaveWindow = () => {
    entries.forEach(({ el }) => {
        el.style.setProperty("--zx-tile-glow-opacity", "0");
    });
};

const ensureGlobalListeners = () => {
    if (isListening) return;

    window.addEventListener("pointermove", onPointerMove, { passive: true });
    window.addEventListener("pointerleave", onPointerLeaveWindow, {
        passive: true,
    });
    isListening = true;
};

const removeGlobalListeners = () => {
    if (!isListening || entries.size > 0) return;

    window.removeEventListener("pointermove", onPointerMove);
    window.removeEventListener("pointerleave", onPointerLeaveWindow);
    isListening = false;
};

const registerEntry = (
    el: TileGlowElement,
    reach: number,
    auto = false,
): TileGlowEntry => {
    const existing = el._tileGlowEntry;
    if (existing) {
        existing.reach = reach;
        return existing;
    }

    const entry: TileGlowEntry = { el, reach, auto };
    el._tileGlowEntry = entry;
    // 用 data 属性做 CSS 挂钩：Vue patch 类时会整体重写 class，
    // classList.add 的类会被抹掉，data 属性不受影响
    el.setAttribute(GLOW_ATTR, "");
    entries.add(entry);
    ensureGlobalListeners();
    return entry;
};

const unregisterEntry = (el: TileGlowElement) => {
    const entry = el._tileGlowEntry;
    if (!entry) return;

    entries.delete(entry);
    el.removeAttribute(GLOW_ATTR);
    el.style.removeProperty("--zx-tile-glow-x");
    el.style.removeProperty("--zx-tile-glow-y");
    el.style.removeProperty("--zx-tile-glow-opacity");
    delete el._tileGlowEntry;
    removeGlobalListeners();
};

// ==================== 自动扫描：统一边框表面自动发光 ====================
// 命中条件 = 带 border-slate-200 且底色为标准表面色（bg-white /
// bg-gray-100 / bg-slate-50 及其透明度变体），覆盖卡片、浮层菜单、
// 模态框、通知、头部控件与输入胶囊；无底色的纯边框表面不参与。

let autoObserver: MutationObserver | null = null;

/** 标准发光表面的底色 token 前缀 */
const AUTO_BG_TOKENS = ["bg-white", "bg-gray-100", "bg-slate-50"];

const matchesAutoGlow = (el: Element): boolean => {
    if (el.hasAttribute(GLOW_ATTR)) return false;
    if (!el.classList.contains(AUTO_BORDER_TOKEN)) return false;
    for (const token of el.classList) {
        for (const bg of AUTO_BG_TOKENS) {
            if (token === bg || token.startsWith(`${bg}/`)) return true;
        }
    }
    return false;
};

const scanForAutoGlow = (root: Element) => {
    if (matchesAutoGlow(root)) {
        registerEntry(root as TileGlowElement, DEFAULT_REACH, true);
    }
    root.querySelectorAll(`.${AUTO_BORDER_TOKEN}`).forEach(el => {
        if (matchesAutoGlow(el)) {
            registerEntry(el as TileGlowElement, DEFAULT_REACH, true);
        }
    });
};

const pruneAutoEntries = () => {
    entries.forEach(entry => {
        // 指令条目由自身生命周期清理；自动条目元素脱文档后回收，
        // KeepAlive 重新插回时 MutationObserver 会再次注册
        if (entry.auto && !entry.el.isConnected) {
            unregisterEntry(entry.el);
        }
    });
};

/**
 * 自动发光：扫描并跟踪所有带统一边框（border-slate-200 + 白底）的表面，
 * 动态挂载的弹层 / 通知由 MutationObserver 兜底。在应用入口调用一次即可；
 * 需要自定义感应距离的表面仍可单独使用 v-tile-glow 指令。
 */
export const initTileGlowAuto = (): void => {
    if (autoObserver || typeof document === "undefined") return;

    ensureGlobalListeners();
    scanForAutoGlow(document.body);
    pruneAutoEntries();

    autoObserver = new MutationObserver(mutations => {
        let inserted = false;
        for (const mutation of mutations) {
            mutation.addedNodes.forEach(node => {
                if (node instanceof Element) {
                    scanForAutoGlow(node);
                    inserted = true;
                }
            });
        }
        if (inserted) pruneAutoEntries();
    });
    autoObserver.observe(document.body, { childList: true, subtree: true });
};

export const vTileGlow: ObjectDirective<TileGlowElement, number | undefined> = {
    mounted(el, binding) {
        const entry = registerEntry(el, binding.value ?? DEFAULT_REACH);
        el._tileGlowCleanup = () => unregisterEntry(entry.el);
    },

    updated(el, binding) {
        if (el._tileGlowEntry) {
            el._tileGlowEntry.reach = binding.value ?? DEFAULT_REACH;
        }
    },

    unmounted(el) {
        el._tileGlowCleanup?.();
    },
};
