<template>
    <div class="monaco-editor-container">
        <!-- 工具栏 -->
        <div v-if="!hideToolbar" class="editor-toolbar">
            <div class="toolbar-left">
                <!-- 语言选择 -->
                <el-dropdown trigger="click" placement="bottom-start" teleported persistent>
                    <span class="dropdown-link">
                        <FileText class="icon" />
                        <span>{{ currentLanguage }}</span>
                    </span>
                    <template #dropdown>
                        <el-dropdown-menu class="custom-dropdown-menu">
                            <el-dropdown-item
                                v-for="lang in languages"
                                :key="lang.value"
                                @click="changeLanguage(lang.value)"
                            >
                                <div class="dropdown-item-content">
                                    {{ lang.label }}
                                    <el-icon v-if="currentLanguage === lang.label"><Check /></el-icon>
                                </div>
                            </el-dropdown-item>
                        </el-dropdown-menu>
                    </template>
                </el-dropdown>

                <!-- 主题选择 -->
                <el-dropdown trigger="click" placement="bottom-start" teleported persistent>
                    <span class="dropdown-link">
                        <component :is="themeIcon" class="icon" />
                        <span>{{ currentThemeLabel }}</span>
                    </span>
                    <template #dropdown>
                        <el-dropdown-menu class="custom-dropdown-menu">
                            <el-dropdown-item
                                v-for="theme in themes"
                                :key="theme.value"
                                @click="changeTheme(theme.value)"
                            >
                                <div class="dropdown-item-content">
                                    {{ theme.label }}
                                    <el-icon v-if="currentTheme === theme.value"><Check /></el-icon>
                                </div>
                            </el-dropdown-item>
                        </el-dropdown-menu>
                    </template>
                </el-dropdown>

                <!-- 行尾符 -->
                <el-dropdown trigger="click" placement="bottom-start" teleported persistent>
                    <span class="dropdown-link">
                        <WrapText class="icon" />
                        <span>{{ currentEolLabel }}</span>
                    </span>
                    <template #dropdown>
                        <el-dropdown-menu class="custom-dropdown-menu">
                            <el-dropdown-item
                                v-for="eol in eols"
                                :key="eol.value"
                                @click="changeEOL(eol.value)"
                            >
                                <div class="dropdown-item-content">
                                    {{ eol.label }}
                                    <el-icon v-if="currentEOL === eol.value"><Check /></el-icon>
                                </div>
                            </el-dropdown-item>
                        </el-dropdown-menu>
                    </template>
                </el-dropdown>

                <!-- 设置 -->
                <el-dropdown trigger="click" placement="bottom-start" teleported persistent>
                    <span class="dropdown-link">
                        <Settings class="icon" />
                        <span>设置</span>
                    </span>
                    <template #dropdown>
                        <el-dropdown-menu class="custom-dropdown-menu">
                            <el-dropdown-item @click="toggleWordWrap">
                                <div class="dropdown-item-content">
                                    自动换行
                                    <el-icon v-if="wordWrap === 'on'"><Check /></el-icon>
                                </div>
                            </el-dropdown-item>
                            <el-dropdown-item @click="toggleMinimap">
                                <div class="dropdown-item-content">
                                    代码小地图
                                    <el-icon v-if="showMinimap"><Check /></el-icon>
                                </div>
                            </el-dropdown-item>
                        </el-dropdown-menu>
                    </template>
                </el-dropdown>
            </div>

            <!-- 操作按钮 -->
            <div class="toolbar-right">
                <span
                    class="dropdown-link"
                    @click="handleReset"
                    :class="{ 'opacity-50 cursor-not-allowed': !isDirty }"
                >
                    <RefreshCw class="icon" />
                    <span>重置</span>
                </span>
                <span
                    class="dropdown-link dropdown-link-primary"
                    @click="handleSave"
                >
                    <Save class="icon" />
                    <span>保存</span>
                </span>
            </div>
        </div>

        <!-- 编辑器主体 -->
        <div class="editor-wrapper">
            <div ref="editorContainer" class="editor-container"></div>
            <!-- 加载状态 -->
            <div v-if="loading || isMonacoLoading" class="loading-overlay">
                <div class="loading-content">
                    <el-icon class="loading-icon"><Loading /></el-icon>
                    <p>{{ isMonacoLoading ? '正在加载编辑器...' : '加载中...' }}</p>
                </div>
            </div>
            <!-- 错误状态 -->
            <div v-if="monacoLoadError" class="loading-overlay">
                <div class="loading-content">
                    <p class="text-red-500">{{ monacoLoadError }}</p>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount, watch, shallowRef } from 'vue'
import {
    FileText,
    Save,
    RefreshCw,
    Settings,
    WrapText,
    Sun,
    Moon,
    Monitor,
    Check,
    Loader2 as Loading
} from 'lucide-vue-next'

// Monaco 类型定义（使用 any 避免复杂的动态导入类型问题）
type MonacoEditor = any
type IStandaloneCodeEditor = any

// Props
interface Props {
    modelValue?: string
    language?: string
    path?: string
    readonly?: boolean
    loading?: boolean
    hideToolbar?: boolean
}

const props = withDefaults(defineProps<Props>(), {
    modelValue: '',
    language: 'plaintext',
    path: '',
    readonly: false,
    loading: false,
    hideToolbar: false
})

// Emits
const emit = defineEmits<{
    'update:modelValue': [value: string]
    'save': [content: string]
}>()

// Monaco 实例（动态加载）
const monaco = shallowRef<MonacoEditor | null>(null)
const editor = shallowRef<IStandaloneCodeEditor | null>(null)
const editorContainer = ref<HTMLElement | null>(null)

// 加载状态
const isMonacoLoading = ref(true)
const monacoLoadError = ref<string | null>(null)

// 状态
const isDirty = ref(false)
const content = ref(props.modelValue)
const initialValue = ref(props.modelValue)

// EOL 默认值（Monaco 加载后更新）
const currentEOL = ref(0) // 默认 LF

// 主题配置
const themes = [
    { label: 'Visual Studio (Light)', value: 'vs', icon: Sun },
    { label: 'Visual Studio Dark', value: 'vs-dark', icon: Moon },
    { label: 'High Contrast Dark', value: 'hc-black', icon: Monitor },
]

const currentTheme = ref(localStorage.getItem('monaco-theme') || 'vs-dark')
const currentThemeLabel = computed(() => {
    const theme = themes.find(t => t.value === currentTheme.value)
    return theme?.label || 'Visual Studio Dark'
})
const themeIcon = computed(() => {
    const theme = themes.find(t => t.value === currentTheme.value)
    return theme?.icon || Moon
})

// 语言配置
const languages = [
    { label: '自动检测', value: 'auto' },
    { label: 'Plain Text', value: 'plaintext' },
    { label: 'JavaScript', value: 'javascript' },
    { label: 'TypeScript', value: 'typescript' },
    { label: 'Python', value: 'python' },
    { label: 'Java', value: 'java' },
    { label: 'Go', value: 'go' },
    { label: 'Rust', value: 'rust' },
    { label: 'C/C++', value: 'cpp' },
    { label: 'C#', value: 'csharp' },
    { label: 'HTML', value: 'html' },
    { label: 'CSS', value: 'css' },
    { label: 'Less', value: 'less' },
    { label: 'SCSS', value: 'scss' },
    { label: 'JSON', value: 'json' },
    { label: 'YAML', value: 'yaml' },
    { label: 'XML', value: 'xml' },
    { label: 'Markdown', value: 'markdown' },
    { label: 'SQL', value: 'sql' },
    { label: 'Shell', value: 'shell' },
    { label: 'PowerShell', value: 'powershell' },
    { label: 'Lua', value: 'lua' },
]

const currentLanguage = ref(props.language === 'auto' ? '自动检测' :
    (languages.find(l => l.value === props.language)?.label || 'Plain Text'))

// EOL 配置（computed，依赖 Monaco 加载）
const eols = computed(() => {
    if (!monaco.value) {
        return [
            { label: 'LF (Linux / Unix)', value: 0 },
            { label: 'CRLF (Windows)', value: 1 },
        ]
    }
    return [
        { label: 'LF (Linux / Unix)', value: monaco.value.editor.EndOfLineSequence.LF },
        { label: 'CRLF (Windows)', value: monaco.value.editor.EndOfLineSequence.CRLF },
    ]
})

const currentEolLabel = computed(() => {
    const eol = eols.value.find(e => e.value === currentEOL.value)
    return eol?.label || 'LF (Linux / Unix)'
})

// 其他配置
const wordWrap = ref(localStorage.getItem('monaco-wordwrap') || 'on')
const showMinimap = ref(localStorage.getItem('monaco-minimap') !== 'false')

// 动态加载 Monaco Editor
const loadMonaco = async () => {
    // 动态导入 monaco-editor
    const monacoModule = await import('monaco-editor')

    // 动态导入 Workers
    // @ts-ignore - Vite worker imports
    const EditorWorker = (await import('monaco-editor/esm/vs/editor/editor.worker?worker')).default
    // @ts-ignore - Vite worker imports
    const JsonWorker = (await import('monaco-editor/esm/vs/language/json/json.worker?worker')).default
    // @ts-ignore - Vite worker imports
    const CssWorker = (await import('monaco-editor/esm/vs/language/css/css.worker?worker')).default
    // @ts-ignore - Vite worker imports
    const HtmlWorker = (await import('monaco-editor/esm/vs/language/html/html.worker?worker')).default
    // @ts-ignore - Vite worker imports
    const TsWorker = (await import('monaco-editor/esm/vs/language/typescript/ts.worker?worker')).default

    // 配置 Worker
    (self as any).MonacoEnvironment = {
        getWorker(_workerId: string, label: string): any {
            if (label === 'json') {
                // @ts-ignore
                return new JsonWorker()
            }
            if (label === 'css' || label === 'scss' || label === 'less') {
                // @ts-ignore
                return new CssWorker()
            }
            if (label === 'html' || label === 'handlebars' || label === 'razor') {
                // @ts-ignore
                return new HtmlWorker()
            }
            if (['typescript', 'javascript'].includes(label)) {
                // @ts-ignore
                return new TsWorker()
            }
            // @ts-ignore
            return new EditorWorker()
        },
    }

    return monacoModule
}

// 定义自定义主题
const defineCustomThemes = (monacoInstance: MonacoEditor) => {
    monacoInstance.editor.defineTheme('vs', {
        base: 'vs',
        inherit: true,
        rules: [{ token: '' }],
        colors: {
            'editor.background': '#f8f6f6',
            'minimap.background': '#f4f4f4',
            'scrollbar.shadow': '#e1e1e1',
            'scrollbarSlider.background': '#e1e1e1',
            'scrollbarSlider.hoverBackground': '#cccccc',
            'scrollbarSlider.activeBackground': '#bfbfbf',
        },
    })

    monacoInstance.editor.defineTheme('vs-dark-custom', {
        base: 'vs-dark',
        inherit: true,
        rules: [{ token: '' }],
        colors: {
            'editor.background': '#1e1e1e',
            'minimap.background': '#252526',
            'scrollbar.shadow': '#3c3c3c',
            'scrollbarSlider.background': '#424242',
            'scrollbarSlider.hoverBackground': '#4f4f4f',
            'scrollbarSlider.activeBackground': '#5c5c5c',
        },
    })
}

// 初始化编辑器
const initEditor = () => {
    if (!editorContainer.value || !monaco.value) return

    if (editor.value) {
        editor.value.dispose()
    }

    editor.value = monaco.value.editor.create(editorContainer.value, {
        value: content.value || props.modelValue || '',
        language: props.language === 'auto' ? 'plaintext' : props.language,
        theme: currentTheme.value,
        readOnly: props.readonly,
        automaticLayout: true,
        folding: true,
        roundedSelection: false,
        overviewRulerBorder: false,
        wordWrap: wordWrap.value as any,
        minimap: {
            enabled: showMinimap.value,
        },
        lineNumbersMinChars: 5,
        fontSize: 14,
        scrollBeyondLastLine: false,
        padding: { top: 10, bottom: 10 },
    })

    // 保存初始值
    initialValue.value = editor.value.getValue()

    // 监听内容变化
    editor.value.onDidChangeModelContent(() => {
        if (editor.value) {
            const newValue = editor.value.getValue()
            content.value = newValue
            // 只有当内容与初始值不同时才标记为脏
            isDirty.value = newValue !== initialValue.value
            emit('update:modelValue', newValue)
        }
    })

    // 设置初始 EOL
    if (editor.value.getModel()) {
        editor.value.getModel()!.pushEOL(currentEOL.value)
    }

    // Ctrl/Cmd + S 快捷键保存
    editor.value.addCommand(monaco.value.KeyMod.CtrlCmd | monaco.value.KeyCode.KeyS, () => {
        handleSave()
    })
}

// 改变语言
const changeLanguage = (lang: string) => {
    if (!editor.value || !monaco.value) return

    if (lang === 'auto') {
        // 自动检测逻辑（根据文件扩展名）
        if (props.path) {
            const ext = props.path.split('.').pop()?.toLowerCase()
            if (ext) {
                const langMap: Record<string, string> = {
                    'js': 'javascript',
                    'ts': 'typescript',
                    'py': 'python',
                    'java': 'java',
                    'go': 'go',
                    'rs': 'rust',
                    'cpp': 'cpp',
                    'c': 'c',
                    'cs': 'csharp',
                    'html': 'html',
                    'css': 'css',
                    'scss': 'scss',
                    'less': 'less',
                    'json': 'json',
                    'yaml': 'yaml',
                    'yml': 'yaml',
                    'xml': 'xml',
                    'md': 'markdown',
                    'sql': 'sql',
                    'sh': 'shell',
                    'ps1': 'powershell',
                    'lua': 'lua',
                }
                const detectedLang = langMap[ext]
                if (detectedLang) {
                    monaco.value.editor.setModelLanguage(editor.value.getModel()!, detectedLang)
                    currentLanguage.value = languages.find(l => l.value === detectedLang)?.label || 'Plain Text'
                    return
                }
            }
        }
        monaco.value.editor.setModelLanguage(editor.value.getModel()!, 'plaintext')
        currentLanguage.value = 'Plain Text'
    } else {
        monaco.value.editor.setModelLanguage(editor.value.getModel()!, lang)
        currentLanguage.value = languages.find(l => l.value === lang)?.label || 'Plain Text'
    }
}

// 改变主题
const changeTheme = (theme: string) => {
    currentTheme.value = theme
    if (monaco.value) {
        monaco.value.editor.setTheme(theme)
    }
    localStorage.setItem('monaco-theme', theme)
}

// 改变 EOL
const changeEOL = (eol: number) => {
    currentEOL.value = eol
    if (editor.value && editor.value.getModel()) {
        editor.value.getModel()!.pushEOL(eol)
    }
}

// 切换自动换行
const toggleWordWrap = () => {
    wordWrap.value = wordWrap.value === 'on' ? 'off' : 'on'
    localStorage.setItem('monaco-wordwrap', wordWrap.value)
    if (editor.value) {
        editor.value.updateOptions({
            wordWrap: wordWrap.value as any
        })
    }
}

// 切换小地图
const toggleMinimap = () => {
    showMinimap.value = !showMinimap.value
    localStorage.setItem('monaco-minimap', String(showMinimap.value))
    if (editor.value) {
        editor.value.updateOptions({
            minimap: {
                enabled: showMinimap.value
            }
        })
    }
}

// 重置
const handleReset = () => {
    if (!editor.value || !initialValue.value) return
    // 使用 pushEditOperations 避免触发 onDidChangeModelContent
    const model = editor.value.getModel()
    if (model) {
        model.pushEditOperations(
            [],
            [{
                range: model.getFullModelRange(),
                text: initialValue.value
            }],
            () => null
        )
    }
}

// 保存
const handleSave = () => {
    if (editor.value) {
        emit('save', editor.value.getValue())
    }
}

// 监听外部内容变化
watch(() => props.modelValue, (newValue) => {
    if (editor.value) {
        const currentValue = editor.value.getValue()
        if (newValue !== currentValue) {
            // 更新初始值和编辑器内容
            initialValue.value = newValue
            content.value = newValue
            editor.value.setValue(newValue)
        }
    }
})

// 监听 readonly 变化
watch(() => props.readonly, (newValue) => {
    if (editor.value) {
        editor.value.updateOptions({ readOnly: newValue })
    }
})

// 生命周期
onMounted(async () => {
    try {
        // 动态加载 Monaco Editor
        monaco.value = await loadMonaco()
        isMonacoLoading.value = false

        // 定义自定义主题
        defineCustomThemes(monaco.value)

        // 更新 EOL 默认值
        currentEOL.value = monaco.value.editor.EndOfLineSequence.LF

        // 等待 DOM 渲染后初始化编辑器
        setTimeout(() => {
            initEditor()
        }, 50)
    } catch (error) {
        console.error('加载 Monaco Editor 失败:', error)
        monacoLoadError.value = '编辑器加载失败，请刷新页面重试'
        isMonacoLoading.value = false
    }
})

onBeforeUnmount(() => {
    if (editor.value) {
        editor.value.dispose()
    }
})

// 暴露方法
defineExpose({
    getContent: () => editor.value?.getValue() || '',
    setValue: (value: string) => {
        if (editor.value) {
            // 更新初始值和内容缓存
            initialValue.value = value
            content.value = value
            // 使用 pushEditOperations 避免触发 onDidChangeModelContent
            const model = editor.value.getModel()
            if (model) {
                const currentContent = model.getValue()
                if (currentContent !== value) {
                    model.pushEditOperations(
                        [],
                        [{
                            range: model.getFullModelRange(),
                            text: value
                        }],
                        () => null
                    )
                }
            }
        }
    },
    getEditor: () => editor.value
})
</script>

<style scoped>
.monaco-editor-container {
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;
    background-color: #ffffff;
    border-radius: 0.5rem;
    overflow: hidden;
}

.editor-toolbar {
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0.5rem 0.75rem;
    background-color: #f9fafb;
    border-bottom: 1px solid #e5e7eb;
    border-top-left-radius: 0.5rem;
    border-top-right-radius: 0.5rem;
    overflow-x: auto;
    gap: 0.5rem;
}

.toolbar-left,
.toolbar-right {
    display: flex;
    align-items: center;
    gap: 0.25rem;
    flex-shrink: 0;
}

.dropdown-link {
    display: inline-flex;
    align-items: center;
    gap: 0.25rem;
    padding: 0.375rem 0.5rem;
    font-size: 0.75rem;
    color: #374151;
    border-radius: 0.375rem;
    cursor: pointer;
    transition: background-color 0.15s;
    white-space: nowrap;
}

@media (min-width: 640px) {
    .editor-toolbar {
        padding: 0.5rem 1rem;
        gap: 0.5rem;
    }

    .toolbar-left,
    .toolbar-right {
        gap: 0.5rem;
    }

    .dropdown-link {
        padding: 0.375rem 0.75rem;
        font-size: 0.875rem;
    }
}

.dropdown-link:hover {
    background-color: #f3f4f6;
}

.dropdown-link-primary {
    background-color: #3b82f6;
    color: #ffffff;
}

.dropdown-link-primary:hover {
    background-color: #2563eb;
}

.icon {
    width: 1rem;
    height: 1rem;
}

.dropdown-item-content {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
}

.editor-wrapper {
    flex: 1;
    min-height: 250px;
    position: relative;
}

@media (min-width: 640px) {
    .editor-wrapper {
        min-height: 400px;
    }
}

.editor-container {
    width: 100%;
    height: 100%;
}

.loading-overlay {
    position: absolute;
    inset: 0;
    background-color: rgba(255, 255, 255, 0.8);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 10;
}

.loading-content {
    text-align: center;
}

.loading-icon {
    width: 2.5rem;
    height: 2.5rem;
    color: #3b82f6;
    animation: spin 1s linear infinite;
}

.loading-content p {
    margin-top: 0.5rem;
    font-size: 0.875rem;
    color: #6b7280;
}

@keyframes spin {
    from {
        transform: rotate(0deg);
    }
    to {
        transform: rotate(360deg);
    }
}

:deep(.el-dropdown-link) {
    outline: none;
}

:deep(.el-dropdown-menu__item) {
    padding: 8px 16px;
}

:deep(.el-dropdown-menu__item:hover) {
    background-color: var(--el-fill-color-light);
}

/* 自定义下拉菜单样式 */
.custom-dropdown-menu {
    max-height: 300px;
    overflow-y: auto;
    position: relative;
}

/* 自定义滚动条样式 */
.custom-dropdown-menu::-webkit-scrollbar {
    width: 6px;
}

.custom-dropdown-menu::-webkit-scrollbar-track {
    background: #f1f1f1;
    border-radius: 3px;
}

.custom-dropdown-menu::-webkit-scrollbar-thumb {
    background: #c1c1c1;
    border-radius: 3px;
}

.custom-dropdown-menu::-webkit-scrollbar-thumb:hover {
    background: #a8a8a8;
}

/* 防止滚动穿透 */
.el-popper.is-light {
    z-index: 2000;
}

/* 确保下拉菜单可以独立滚动 */
.el-dropdown__popper.el-popper {
    position: fixed;
}

/* 下拉菜单滚动条样式 */
.el-dropdown__popper .el-dropdown-menu {
    max-height: 300px;
    overflow-y: auto;
}

/* 使用 overscroll-behavior 防止滚动穿透 */
.custom-dropdown-menu {
    overscroll-behavior: contain;
}
</style>