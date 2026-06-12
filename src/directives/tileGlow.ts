import type { ObjectDirective } from "vue";

interface TileGlowElement extends HTMLElement {
    _tileGlowCleanup?: () => void;
    _tileGlowEntry?: TileGlowEntry;
}

interface TileGlowEntry {
    el: TileGlowElement;
    reach: number;
}

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

export const vTileGlow: ObjectDirective<TileGlowElement, number | undefined> = {
    mounted(el, binding) {
        const entry: TileGlowEntry = {
            el,
            reach: binding.value ?? DEFAULT_REACH,
        };

        el._tileGlowEntry = entry;
        el.classList.add("zx-tile-glow");
        entries.add(entry);
        ensureGlobalListeners();

        el._tileGlowCleanup = () => {
            entries.delete(entry);
            el.classList.remove("zx-tile-glow");
            el.style.removeProperty("--zx-tile-glow-x");
            el.style.removeProperty("--zx-tile-glow-y");
            el.style.removeProperty("--zx-tile-glow-opacity");
            delete el._tileGlowEntry;
            removeGlobalListeners();
        };
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
