/**
 * 麦克风录音组合式函数
 *
 * MediaRecorder 录制麦克风，stop 后返回 base64 音频负载，
 * 主站与模拟端的语音输入共用。
 */
import { onUnmounted, ref } from "vue";

export interface VoiceRecording {
    /** data:audio/xxx;base64,... 形式的预览地址 */
    dataUrl: string;
    /** 纯 base64 负载 */
    base64: string;
    /** 录制时长（秒） */
    duration: number;
}

/** 录音最长秒数，到点自动停 */
export const VOICE_MAX_DURATION = 60;

export function useVoiceRecorder() {
    const recording = ref(false);
    /** 正在申请麦克风权限 */
    const starting = ref(false);
    const duration = ref(0);

    let recorder: MediaRecorder | null = null;
    let stream: MediaStream | null = null;
    let chunks: Blob[] = [];
    let timer: number | null = null;
    let stopResolve: ((result: VoiceRecording | null) => void) | null = null;

    const stopTimer = () => {
        if (timer !== null) {
            clearInterval(timer);
            timer = null;
        }
    };

    const releaseStream = () => {
        stream?.getTracks().forEach((track) => track.stop());
        stream = null;
    };

    /**
     * 开始录音；麦克风不可用/被拒绝时返回 false
     */
    const start = async (): Promise<boolean> => {
        if (recording.value || starting.value) return false;
        if (!navigator.mediaDevices?.getUserMedia) return false;
        starting.value = true;
        try {
            stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        } catch {
            starting.value = false;
            return false;
        }
        starting.value = false;

        chunks = [];
        const mimeType = MediaRecorder.isTypeSupported("audio/webm")
            ? "audio/webm"
            : undefined;
        try {
            recorder = mimeType
                ? new MediaRecorder(stream, { mimeType })
                : new MediaRecorder(stream);
        } catch {
            releaseStream();
            return false;
        }
        recorder.ondataavailable = (e) => {
            if (e.data.size > 0) chunks.push(e.data);
        };
        recorder.onstop = () => {
            const blob = new Blob(chunks, {
                type: recorder?.mimeType || "audio/webm",
            });
            const reader = new FileReader();
            reader.onload = () => {
                const dataUrl = String(reader.result || "");
                stopResolve?.({
                    dataUrl,
                    base64: dataUrl.split(",")[1] ?? "",
                    duration: duration.value,
                });
                stopResolve = null;
            };
            reader.onerror = () => {
                stopResolve?.(null);
                stopResolve = null;
            };
            reader.readAsDataURL(blob);
            releaseStream();
        };
        recorder.start();
        duration.value = 0;
        timer = window.setInterval(() => {
            duration.value += 1;
            if (duration.value >= VOICE_MAX_DURATION) {
                void stop();
            }
        }, 1000);
        recording.value = true;
        return true;
    };

    /** 停止录音并取回结果（未在录音时返回 null） */
    const stop = (): Promise<VoiceRecording | null> => {
        if (!recording.value || !recorder) return Promise.resolve(null);
        stopTimer();
        recording.value = false;
        return new Promise((resolve) => {
            stopResolve = resolve;
            if (recorder && recorder.state !== "inactive") {
                recorder.stop();
            } else {
                resolve(null);
                stopResolve = null;
            }
        });
    };

    onUnmounted(() => {
        stopTimer();
        if (recorder && recorder.state !== "inactive") {
            recorder.onstop = null;
            recorder.stop();
        }
        releaseStream();
    });

    return { recording, starting, duration, start, stop };
}
