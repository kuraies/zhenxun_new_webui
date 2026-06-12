import { nextTick, onBeforeUnmount, ref, type Ref } from "vue";

const CLOSE_ANIMATION_MS = 280;
const MIN_PANEL_HEIGHT = 240;

export const useLogFullscreen = (cardRoot: Ref<HTMLElement | null>) => {
    const isFullscreen = ref(false);
    const isClosing = ref(false);
    const fullscreenFrame = ref<Record<string, string>>({});

    let closeTimer: number | undefined;

    const removeFrameListeners = () => {
        window.removeEventListener("resize", updateFullscreenFrame);
        window.removeEventListener("scroll", updateFullscreenFrame, true);
    };

    const addFrameListeners = () => {
        window.addEventListener("resize", updateFullscreenFrame);
        window.addEventListener("scroll", updateFullscreenFrame, true);
    };

    function updateFullscreenFrame() {
        const scrollHost = cardRoot.value?.closest(
            ".right",
        ) as HTMLElement | null;

        if (!scrollHost) return;

        const rect = scrollHost.getBoundingClientRect();
        const styles = window.getComputedStyle(scrollHost);
        const paddingLeft = parseFloat(styles.paddingLeft) || 0;
        const paddingRight = parseFloat(styles.paddingRight) || 0;
        const paddingBottom = parseFloat(styles.paddingBottom) || 0;

        const top = Math.max(rect.top, 0);
        const left = Math.max(rect.left + paddingLeft, 0);
        const right = Math.min(rect.right - paddingRight, window.innerWidth);
        const bottom = Math.min(
            rect.bottom - paddingBottom,
            window.innerHeight,
        );

        fullscreenFrame.value = {
            top: `${top}px`,
            left: `${left}px`,
            width: `${Math.max(right - left, 0)}px`,
            height: `${Math.max(bottom - top, MIN_PANEL_HEIGHT)}px`,
        };
    }

    const openFullscreen = async () => {
        if (isFullscreen.value) return;

        if (closeTimer) {
            window.clearTimeout(closeTimer);
            closeTimer = undefined;
        }

        updateFullscreenFrame();
        addFrameListeners();
        isClosing.value = false;
        isFullscreen.value = true;
        await nextTick();
        updateFullscreenFrame();
    };

    const closeFullscreen = () => {
        if (!isFullscreen.value || isClosing.value) return;

        isClosing.value = true;
        closeTimer = window.setTimeout(() => {
            isFullscreen.value = false;
            isClosing.value = false;
            closeTimer = undefined;
            removeFrameListeners();
        }, CLOSE_ANIMATION_MS);
    };

    onBeforeUnmount(() => {
        removeFrameListeners();

        if (closeTimer) {
            window.clearTimeout(closeTimer);
        }
    });

    return {
        isFullscreen,
        isClosing,
        fullscreenFrame,
        openFullscreen,
        closeFullscreen,
    };
};
