/**
 * 自绘光标组合式函数
 *
 * contenteditable 里行内图片会把行框撑高，原生光标跟着变高；
 * 这里把原生光标藏掉（caret-color: transparent），改由 JS 画一条
 * 恒定一行字高的光标，底边锚在文字底部（QQ 客户端的观感）。
 * 文本排版、选区、输入法仍全部走原生引擎。
 *
 * 测量优先用字符矩形（不动 DOM）：
 * 探针插拔会把光标所在文本节点一分为二，浏览器的选区随后被规范化成
 * "跨节点的零宽选区"（collapsed=false），打字时光标就会莫名消失——
 * 所以探针只用于空容器/元素边界这类不会拆分文本节点的位置。
 *
 * 要求：editorRef 的父元素带定位（relative），编辑器自身是滚动容器。
 */
import { onUnmounted, watch, type Ref } from "vue";

interface CaretPos {
    x: number;
    bottom: number;
}

export function useCustomCaret(editorRef: Ref<HTMLElement | null>) {
    let editor: HTMLElement | null = null;
    let caret: HTMLDivElement | null = null;
    let caretHeight = 20;
    /** 输入法组字期间用回原生光标 */
    let composing = false;
    /** 光标是否可见 */
    let visible = false;
    /** 光标在编辑器内容坐标系里的位置（滚动时只做偏移换算，不重测） */
    let contentLeft = 0;
    let contentBottom = 0;

    const hide = () => {
        visible = false;
        if (caret) caret.style.display = "none";
    };

    const applyPosition = () => {
        if (!caret || !editor || !visible) return;
        caret.style.left = `${contentLeft - editor.scrollLeft}px`;
        caret.style.top = `${contentBottom - caretHeight - editor.scrollTop}px`;
    };

    /** 文本节点内：用相邻字符的矩形定位（无 DOM 改动） */
    const measureInText = (
        node: Text,
        offset: number,
    ): CaretPos | null => {
        const len = node.data?.length ?? 0;
        if (!len) return null;
        const range = document.createRange();
        const rects =
            offset > 0
                ? (range.setStart(node, offset - 1),
                  range.setEnd(node, offset),
                  range.getClientRects())
                : (range.setStart(node, 0),
                  range.setEnd(node, Math.min(1, len)),
                  range.getClientRects());
        const rect = offset > 0 ? rects[rects.length - 1] : rects[0];
        if (!rect) return null;
        return { x: offset > 0 ? rect.right : rect.left, bottom: rect.bottom };
    };

    /** 元素容器内：取相邻兄弟估算（图片/换行/文本开头结尾） */
    const measureAtElement = (
        el: HTMLElement,
        offset: number,
    ): CaretPos | null => {
        const nodes = el.childNodes;
        const prev = offset > 0 ? (nodes[offset - 1] as Node | undefined) : null;
        const next =
            offset < nodes.length ? (nodes[offset] as Node | undefined) : null;
        const target = prev ?? next;
        if (!target) return null;
        const before = target === prev;

        if (target.nodeType === Node.TEXT_NODE) {
            const text = target as Text;
            return measureInText(text, before ? text.data.length : 0);
        }
        const element = target as HTMLElement;
        if (element.tagName === "IMG") {
            const rect = element.getBoundingClientRect();
            return {
                x: before ? rect.right + 2 : rect.left - 2,
                bottom: rect.bottom,
            };
        }
        if (element.tagName === "BR") {
            const rect = element.getBoundingClientRect();
            return { x: rect.left, bottom: rect.bottom };
        }
        return null;
    };

    /** 兜底：零宽探针（只用于不会拆分文本节点的位置） */
    const measureByProbe = (range: Range): CaretPos | null => {
        const probe = document.createElement("span");
        probe.textContent = "\u200B";
        range.insertNode(probe);
        const rect = probe.getBoundingClientRect();
        probe.remove();
        if (!rect || (rect.height === 0 && rect.width === 0)) return null;
        return { x: rect.left, bottom: rect.bottom };
    };

    /** 重新测量光标位置 */
    const update = () => {
        if (!caret || !editor) return;
        const sel = window.getSelection();
        if (
            composing ||
            document.activeElement !== editor ||
            !sel ||
            sel.rangeCount === 0
        ) {
            hide();
            return;
        }
        const range = sel.getRangeAt(0);
        if (
            // 跨节点的零宽选区 collapsed 会是 false，选区文本为空时视为光标
            (!range.collapsed && range.toString() !== "") ||
            !editor.contains(range.startContainer)
        ) {
            // 有真实拖选或光标不在本编辑器里时不画
            hide();
            return;
        }

        let pos: CaretPos | null = null;
        const container = range.startContainer;
        if (container.nodeType === Node.TEXT_NODE) {
            pos = measureInText(container as Text, range.startOffset);
            if (!pos && container.parentElement) {
                const parent = container.parentElement;
                if (editor.contains(parent)) {
                    const index = Array.prototype.indexOf.call(
                        parent.childNodes,
                        container,
                    );
                    pos = measureAtElement(parent, index + 1);
                }
            }
        } else if (container.nodeType === Node.ELEMENT_NODE) {
            pos = measureAtElement(
                container as HTMLElement,
                range.startOffset,
            );
        }
        if (!pos && range.startContainer.nodeType === Node.ELEMENT_NODE) {
            pos = measureByProbe(range);
        }
        if (!pos) {
            hide();
            return;
        }

        const editorRect = editor.getBoundingClientRect();
        contentLeft = pos.x - editorRect.left + editor.scrollLeft;
        contentBottom = pos.bottom - editorRect.top + editor.scrollTop;
        visible = true;
        caret.style.display = "block";
        applyPosition();
    };

    const onCompositionStart = () => {
        composing = true;
        hide();
        if (editor) editor.style.caretColor = "auto";
    };

    const onCompositionEnd = () => {
        composing = false;
        if (editor) editor.style.caretColor = "transparent";
        update();
    };

    const onBlur = () => hide();

    /** 编辑器元素可能随 v-if 出现/销毁，绑定与解绑都走这里 */
    const setup = (el: HTMLElement) => {
        editor = el;
        const parent = el.parentElement;
        if (!parent) return;
        if (getComputedStyle(parent).position === "static") {
            parent.style.position = "relative";
        }
        caretHeight = parseFloat(getComputedStyle(el).lineHeight) || 20;

        caret = document.createElement("div");
        caret.className = "zx-custom-caret";
        caret.style.cssText =
            `position:absolute;height:${caretHeight}px;width:1px;display:none;pointer-events:none;z-index:5;border-radius:1px;` +
            "background:var(--zx-color-primary, #38bdf8);";
        parent.appendChild(caret);
        // 闪烁：亮约一半周期 → 灭
        caret.animate(
            [
                { opacity: 1 },
                { opacity: 1, offset: 0.47 },
                { opacity: 0, offset: 0.47 },
                { opacity: 0 },
            ],
            { duration: 1060, iterations: Infinity },
        );

        document.addEventListener("selectionchange", update);
        window.addEventListener("resize", update);
        el.addEventListener("scroll", applyPosition);
        el.addEventListener("input", update);
        el.addEventListener("focus", update);
        el.addEventListener("blur", onBlur);
        el.addEventListener("compositionstart", onCompositionStart);
        el.addEventListener("compositionend", onCompositionEnd);
    };

    const teardown = () => {
        document.removeEventListener("selectionchange", update);
        window.removeEventListener("resize", update);
        if (editor) {
            editor.removeEventListener("scroll", applyPosition);
            editor.removeEventListener("input", update);
            editor.removeEventListener("focus", update);
            editor.removeEventListener("blur", onBlur);
            editor.removeEventListener(
                "compositionstart",
                onCompositionStart,
            );
            editor.removeEventListener("compositionend", onCompositionEnd);
        }
        caret?.remove();
        caret = null;
        editor = null;
        visible = false;
    };

    watch(
        editorRef,
        (el) => {
            teardown();
            if (el) setup(el);
        },
        { flush: "post" },
    );

    onUnmounted(teardown);
}
