<template>
    <div class="zx-editor-container" :class="themeClass">
        <div v-if="!hideToolbar" class="editor-toolbar">
            <div class="toolbar-left">
                <select
                    v-model="selectedLanguage"
                    class="toolbar-select"
                    :disabled="readonly"
                    title="语言"
                >
                    <option
                        v-for="lang in languages"
                        :key="lang.value"
                        :value="lang.value"
                    >
                        {{ lang.label }}
                    </option>
                </select>

                <button class="dropdown-link" type="button" @click="toggleTheme">
                    <component :is="themeIcon" class="icon" />
                    <span>{{ currentThemeLabel }}</span>
                </button>

                <button class="dropdown-link" type="button" @click="changeEOL">
                    <WrapText class="icon" />
                    <span>{{ currentEolLabel }}</span>
                </button>

                <button
                    class="dropdown-link"
                    type="button"
                    @click="toggleWordWrap"
                >
                    <Settings class="icon" />
                    <span>{{ wordWrap ? "自动换行" : "不换行" }}</span>
                </button>
            </div>

            <div class="toolbar-right">
                <button
                    class="dropdown-link"
                    type="button"
                    :disabled="!isDirty || readonly"
                    @click="handleReset"
                >
                    <RefreshCw class="icon" />
                    <span>重置</span>
                </button>
                <button
                    class="dropdown-link dropdown-link-primary"
                    type="button"
                    :disabled="readonly"
                    @click="handleSave"
                >
                    <Save class="icon" />
                    <span>保存</span>
                </button>
            </div>
        </div>

        <div class="editor-wrapper">
            <div class="line-number-gutter" aria-hidden="true">
                <span v-for="line in lineCount" :key="line">{{ line }}</span>
            </div>
            <textarea
                ref="textareaRef"
                v-model="content"
                class="editor-textarea"
                :class="{ 'whitespace-pre': !wordWrap }"
                :readonly="readonly"
                :spellcheck="false"
                @input="handleInput"
                @keydown="handleKeydown"
                @scroll="syncGutterScroll"
            />

            <div v-if="loading" class="loading-overlay">
                <div class="loading-content">
                    <Loader2 class="loading-icon" />
                    <p>加载中...</p>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { computed, nextTick, ref, watch } from "vue";
import {
    Loader2,
    Monitor,
    Moon,
    RefreshCw,
    Save,
    Settings,
    Sun,
    WrapText,
} from "lucide-vue-next";

interface Props {
    modelValue?: string;
    language?: string;
    path?: string;
    readonly?: boolean;
    loading?: boolean;
    hideToolbar?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
    modelValue: "",
    language: "plaintext",
    path: "",
    readonly: false,
    loading: false,
    hideToolbar: false,
});

const emit = defineEmits<{
    "update:modelValue": [value: string];
    save: [content: string];
}>();

const languages = [
    { label: "自动检测", value: "auto" },
    { label: "Plain Text", value: "plaintext" },
    { label: "JavaScript", value: "javascript" },
    { label: "TypeScript", value: "typescript" },
    { label: "Python", value: "python" },
    { label: "JSON", value: "json" },
    { label: "YAML", value: "yaml" },
    { label: "HTML", value: "html" },
    { label: "CSS", value: "css" },
    { label: "Markdown", value: "markdown" },
    { label: "SQL", value: "sql" },
    { label: "Shell", value: "shell" },
];

const themes = [
    { label: "浅色", value: "light", icon: Sun },
    { label: "深色", value: "dark", icon: Moon },
    { label: "高对比", value: "contrast", icon: Monitor },
];

const detectLanguage = () => {
    if (props.language && props.language !== "auto") return props.language;

    const ext = props.path.split(".").pop()?.toLowerCase();
    const langMap: Record<string, string> = {
        c: "plaintext",
        css: "css",
        html: "html",
        js: "javascript",
        json: "json",
        md: "markdown",
        py: "python",
        scss: "css",
        sh: "shell",
        sql: "sql",
        ts: "typescript",
        yaml: "yaml",
        yml: "yaml",
    };

    return langMap[ext || ""] || "plaintext";
};

const textareaRef = ref<HTMLTextAreaElement | null>(null);
const content = ref(props.modelValue);
const initialValue = ref(props.modelValue);
const selectedLanguage = ref(detectLanguage());
const currentTheme = ref(localStorage.getItem("zx-editor-theme") || "dark");
const currentEOL = ref<"lf" | "crlf">("lf");
const wordWrap = ref(localStorage.getItem("zx-editor-wordwrap") !== "false");

const isDirty = computed(() => content.value !== initialValue.value);
const lineCount = computed(() => Math.max(content.value.split("\n").length, 1));
const currentEolLabel = computed(() =>
    currentEOL.value === "lf" ? "LF" : "CRLF",
);
const currentThemeConfig = computed(
    () => themes.find((theme) => theme.value === currentTheme.value) || themes[1],
);
const currentThemeLabel = computed(() => currentThemeConfig.value.label);
const themeIcon = computed(() => currentThemeConfig.value.icon);
const themeClass = computed(() => `theme-${currentTheme.value}`);

const normalizeEOL = (value: string) =>
    currentEOL.value === "crlf"
        ? value.replace(/\r?\n/g, "\r\n")
        : value.replace(/\r\n/g, "\n");

const handleInput = () => {
    emit("update:modelValue", content.value);
};

const handleSave = () => {
    emit("save", normalizeEOL(content.value));
    initialValue.value = content.value;
};

const handleReset = () => {
    if (!isDirty.value) return;
    content.value = initialValue.value;
    emit("update:modelValue", content.value);
};

const toggleTheme = () => {
    const currentIndex = themes.findIndex(
        (theme) => theme.value === currentTheme.value,
    );
    const nextTheme = themes[(currentIndex + 1) % themes.length];
    currentTheme.value = nextTheme.value;
    localStorage.setItem("zx-editor-theme", nextTheme.value);
};

const changeEOL = () => {
    currentEOL.value = currentEOL.value === "lf" ? "crlf" : "lf";
};

const toggleWordWrap = () => {
    wordWrap.value = !wordWrap.value;
    localStorage.setItem("zx-editor-wordwrap", String(wordWrap.value));
};

const handleKeydown = (event: KeyboardEvent) => {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "s") {
        event.preventDefault();
        handleSave();
        return;
    }

    if (event.key === "Tab") {
        event.preventDefault();
        insertAtCursor("    ");
    }
};

const insertAtCursor = (text: string) => {
    const textarea = textareaRef.value;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    content.value =
        content.value.slice(0, start) + text + content.value.slice(end);
    emit("update:modelValue", content.value);

    nextTick(() => {
        textarea.selectionStart = textarea.selectionEnd = start + text.length;
    });
};

const syncGutterScroll = () => {
    const textarea = textareaRef.value;
    const gutter = textarea?.previousElementSibling as HTMLElement | null;
    if (!textarea || !gutter) return;

    gutter.scrollTop = textarea.scrollTop;
};

watch(
    () => props.modelValue,
    (newValue) => {
        if (newValue === content.value) return;
        content.value = newValue || "";
        initialValue.value = newValue || "";
    },
);

watch(
    () => [props.language, props.path],
    () => {
        selectedLanguage.value = detectLanguage();
    },
);

defineExpose({
    getContent: () => content.value,
    setValue: (value: string) => {
        content.value = value;
        initialValue.value = value;
        emit("update:modelValue", value);
    },
    getEditor: () => textareaRef.value,
});
</script>

<style scoped>
.zx-editor-container {
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    border-radius: 0.5rem;
    background-color: var(--zx-color-surface);
}

.editor-toolbar {
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.5rem;
    overflow-x: auto;
    border-bottom: 1px solid var(--zx-color-border);
    background-color: var(--zx-color-surface-muted);
    padding: 0.5rem 0.75rem;
}

.toolbar-left,
.toolbar-right {
    display: flex;
    flex-shrink: 0;
    align-items: center;
    gap: 0.25rem;
}

.dropdown-link,
.toolbar-select {
    display: inline-flex;
    height: 2rem;
    align-items: center;
    gap: 0.25rem;
    border: 0;
    border-radius: 0.375rem;
    background-color: transparent;
    padding: 0 0.5rem;
    color: var(--zx-color-text-muted);
    font-size: 0.75rem;
    line-height: 1;
    white-space: nowrap;
    transition: background-color 0.15s;
}

.dropdown-link {
    cursor: pointer;
}

.dropdown-link:hover,
.toolbar-select:hover {
    background-color: var(--zx-gray-100);
}

.dropdown-link:disabled {
    cursor: not-allowed;
    opacity: 0.5;
}

.dropdown-link-primary {
    background-color: var(--zx-color-primary);
    color: var(--zx-color-on-accent);
}

.dropdown-link-primary:hover {
    background-color: var(--zx-color-primary-hover);
}

.icon {
    width: 1rem;
    height: 1rem;
}

.editor-wrapper {
    position: relative;
    display: grid;
    min-height: 250px;
    flex: 1;
    grid-template-columns: auto minmax(0, 1fr);
    overflow: hidden;
}

.line-number-gutter {
    min-width: 3.5rem;
    overflow: hidden;
    border-right: 1px solid var(--zx-color-border);
    background-color: var(--zx-color-surface-muted);
    padding: 0.75rem 0.75rem 0.75rem 0.5rem;
    color: var(--zx-color-text-subtle);
    font-family: "JetBrains Mono", "Cascadia Mono", Consolas, monospace;
    font-size: 0.875rem;
    line-height: 1.55rem;
    text-align: right;
    user-select: none;
}

.line-number-gutter span {
    display: block;
}

.editor-textarea {
    width: 100%;
    height: 100%;
    resize: none;
    overflow: auto;
    border: 0;
    background-color: var(--zx-color-surface);
    padding: 0.75rem 1rem;
    color: var(--zx-color-text-strong);
    font-family: "JetBrains Mono", "Cascadia Mono", Consolas, monospace;
    font-size: 0.875rem;
    line-height: 1.55rem;
    outline: none;
    tab-size: 4;
}

.editor-textarea:not(.whitespace-pre) {
    white-space: pre-wrap;
    overflow-wrap: anywhere;
}

.loading-overlay {
    position: absolute;
    inset: 0;
    z-index: 10;
    display: flex;
    align-items: center;
    justify-content: center;
    background-color: color-mix(in srgb, var(--zx-color-surface) 82%, transparent);
}

.loading-content {
    text-align: center;
}

.loading-icon {
    margin: 0 auto;
    width: 2.5rem;
    height: 2.5rem;
    color: var(--zx-color-primary);
    animation: spin 1s linear infinite;
}

.loading-content p {
    margin-top: 0.5rem;
    color: var(--zx-color-text-muted);
    font-size: 0.875rem;
}

.theme-dark .editor-toolbar {
    border-color: var(--zx-color-border);
    background-color: var(--zx-color-surface);
}

.theme-dark .dropdown-link,
.theme-dark .toolbar-select {
    color: var(--zx-color-text-muted);
}

.theme-dark .dropdown-link:hover,
.theme-dark .toolbar-select:hover {
    background-color: var(--zx-color-surface-muted);
}

.theme-dark .line-number-gutter {
    border-color: var(--zx-color-border);
    background-color: var(--zx-color-surface);
    color: var(--zx-color-text-subtle);
}

.theme-dark .editor-textarea {
    background-color: var(--zx-color-surface-muted);
    color: var(--zx-color-text);
}

.theme-contrast .editor-toolbar,
.theme-contrast .line-number-gutter {
    border-color: var(--zx-slate-300);
    background-color: var(--zx-slate-50);
}

.theme-contrast .dropdown-link,
.theme-contrast .toolbar-select {
    color: var(--zx-slate-900);
}

.theme-contrast .dropdown-link:hover,
.theme-contrast .toolbar-select:hover {
    background-color: var(--zx-slate-100);
}

.theme-contrast .line-number-gutter {
    color: var(--zx-yellow-500);
}

.theme-contrast .editor-textarea {
    background-color: var(--zx-slate-50);
    color: var(--zx-slate-900);
}

@media (min-width: 640px) {
    .editor-toolbar {
        padding: 0.5rem 1rem;
    }

    .toolbar-left,
    .toolbar-right {
        gap: 0.5rem;
    }

    .dropdown-link,
    .toolbar-select {
        padding: 0 0.75rem;
        font-size: 0.875rem;
    }

    .editor-wrapper {
        min-height: 400px;
    }
}

@keyframes spin {
    from {
        transform: rotate(0deg);
    }
    to {
        transform: rotate(360deg);
    }
}
</style>
