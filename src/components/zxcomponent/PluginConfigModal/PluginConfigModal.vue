<script setup lang="ts">
import { ref, computed, watch, nextTick, onMounted, onUnmounted } from 'vue'
import { X, Save, RotateCcw, Search, Settings, Plus, Minus, Shield, SlidersHorizontal, ChevronDown, GripVertical } from 'lucide-vue-next'
import { gsap } from 'gsap'
import { pluginApi } from '@/utils/api-next'
import { ZXNotification } from '@/services/ui'
import { ZXDropdown } from '@/components/zxcomponent/ZXDropdown'
import type { PluginDetailConfig, PluginDetail } from '@/types/plugin.types'

interface Props {
    module: string
    pluginName: string
    visible: boolean
}

const props = defineProps<Props>()
const emit = defineEmits<{
    (e: 'update:visible', value: boolean): void
    (e: 'close'): void
    (e: 'updated', module: string): void
}>()

// 本地 visible 状态
const internalVisible = ref(false)

// 加载状态
const loading = ref(false)
const saving = ref(false)

// 插件详情数据
const pluginDetail = ref<PluginDetail | null>(null)

// 配置项数据（可编辑的副本）
const editableConfigs = ref<PluginDetailConfig[]>([])

// 搜索关键词
const searchKeyword = ref('')
const searchInputRef = ref<HTMLInputElement | null>(null)
const rowsRef = ref<HTMLElement | null>(null)

// 配置项原始值（用于重置）
const originalConfigs = ref<PluginDetailConfig[]>([])

// 通用设置（所有插件默认拥有）：群权限 / 限制超级用户
const editableLevel = ref(1)
const editableLimitSuperuser = ref(false)
const originalLevel = ref(1)
const originalLimitSuperuser = ref(false)

// 群权限下拉选项：等级 1-10
const levelOptions = Array.from({ length: 10 }, (_, i) => ({
    label: `等级 ${i + 1}`,
    value: String(i + 1)
}))

// 类型徽标：柔和着色胶囊，与插件卡的版本/内置徽标同语言
const typeBadges: Record<string, { label: string; cls: string }> = {
    int: { label: 'INTEGER', cls: 'bg-purple-100 text-purple-600' },
    float: { label: 'FLOAT', cls: 'bg-blue-100 text-blue-600' },
    bool: { label: 'BOOL', cls: 'bg-green-100 text-green-600' },
    boolean: { label: 'BOOL', cls: 'bg-green-100 text-green-600' },
    str: { label: 'STRING', cls: 'bg-gray-100 text-gray-500' },
    string: { label: 'STRING', cls: 'bg-gray-100 text-gray-500' },
    list: { label: 'LIST', cls: 'bg-orange-100 text-orange-600' },
    dict: { label: 'DICT', cls: 'bg-cyan-100 text-cyan-600' },
    json: { label: 'JSON', cls: 'bg-cyan-100 text-cyan-600' }
}

const typeBadge = (type?: string | null) =>
    typeBadges[(type || '').toLowerCase()] || {
        label: (type || 'ANY').toUpperCase(),
        cls: 'bg-gray-100 text-gray-500'
    }

// 搜索框快捷键（Ctrl/Cmd + K）
const isMac = /mac/i.test(navigator.platform)
const onSearchHotkey = (e: KeyboardEvent) => {
    if (!internalVisible.value) return
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        searchInputRef.value?.focus()
    }
}

onMounted(() => window.addEventListener('keydown', onSearchHotkey))
onUnmounted(() => window.removeEventListener('keydown', onSearchHotkey))

// 配置项类型对应的输入组件
const configTypeInputs: Record<string, string> = {
    str: 'text',
    string: 'text',
    int: 'number',
    float: 'number',
    bool: 'boolean',
    boolean: 'boolean',
    list: 'textarea',
    dict: 'textarea',
    json: 'textarea'
}

// 过滤后的配置列表
const filteredConfigs = computed(() => {
    if (!searchKeyword.value) return editableConfigs.value
    const keyword = searchKeyword.value.toLowerCase()
    return editableConfigs.value.filter(config =>
        config.key.toLowerCase().includes(keyword) ||
        (config.help && config.help.toLowerCase().includes(keyword))
    )
})

// 搜索结果集变化时行列表交错淡入（打开弹窗首次载入也会触发）
watch(() => filteredConfigs.value.length, async () => {
    await nextTick()
    const rows = rowsRef.value?.children
    if (!rows?.length) return
    gsap.fromTo(
        rows,
        { opacity: 0, y: 8 },
        { opacity: 1, y: 0, duration: 0.25, stagger: 0.03, ease: 'power2.out', clearProps: 'all' }
    )
})

// 加载插件详情
const loadPluginDetail = async () => {
    loading.value = true
    try {
        const res = await pluginApi.getPluginDetail(props.module)
        if (res?.success && res?.data) {
            pluginDetail.value = res.data as PluginDetail

            // 通用设置：群权限 / 限制超级用户
            originalLevel.value = Math.min(10, Math.max(1, Number(res.data.level) || 1))
            originalLimitSuperuser.value = !!res.data.limit_superuser
            editableLevel.value = originalLevel.value
            editableLimitSuperuser.value = originalLimitSuperuser.value

            // 深拷贝配置项用于编辑
            editableConfigs.value = res.data.config_list.map((config: PluginDetailConfig) => ({
                ...config,
                value: JSON.parse(JSON.stringify(config.value))
            }))
            // 保存原始值用于重置
            originalConfigs.value = res.data.config_list.map((config: PluginDetailConfig) => ({
                ...config,
                value: JSON.parse(JSON.stringify(config.value))
            }))
            // 数据加载成功，显示弹窗
            internalVisible.value = true
        } else {
            ZXNotification({
                title: '哎呀~',
                message: '获取插件详情失败 (っ °Д °;) っ',
                type: '😭',
                position: 'top-right'
            })
            emit('update:visible', false)
            emit('close')
        }
    } catch (error) {
        ZXNotification({
            title: '呜呼~',
            message: '网络请求失败 (´；ω；`)',
            type: '😭',
            position: 'top-right'
        })
        emit('update:visible', false)
        emit('close')
    } finally {
        loading.value = false
    }
}

// 监听 visible 变化
watch(() => props.visible, (newVal) => {
    if (newVal) {
        // 先加载数据，由 loadPluginDetail 决定是否显示弹窗
        loadPluginDetail()
    } else {
        internalVisible.value = false
    }
}, { immediate: true })

watch(internalVisible, (newVal) => {
    emit('update:visible', newVal)
    if (!newVal) {
        emit('close')
    }
})

// 根据类型获取配置值
const getConfigValue = (config: PluginDetailConfig) => {
    const type = config.type?.toLowerCase() || ''
    const value = config.value

    // 布尔类型特殊处理
    if (type === 'bool' || type === 'boolean') {
        return !!value
    }

    // 数值类型
    if (type === 'int' || type === 'float') {
        return value ?? 0
    }

    // 对象/数组类型转为 JSON 字符串显示
    if (type === 'list' || type === 'dict' || type === 'json') {
        if (value === null || value === undefined) return ''
        return typeof value === 'string' ? value : JSON.stringify(value, null, 2)
    }

    // 字符串类型
    return value ?? ''
}

// 编辑态文本：list 转逗号分隔，dict/json 转单行 JSON
const configValueText = (config: PluginDetailConfig) => {
    const type = config.type?.toLowerCase() || ''
    const value = config.value
    if (type === 'list') {
        return Array.isArray(value)
            ? value.map((v: any) => String(v)).join(', ')
            : (value ?? '')
    }
    if (type === 'dict' || type === 'json') {
        if (value === null || value === undefined) return ''
        return typeof value === 'string' ? value : JSON.stringify(value)
    }
    return value ?? ''
}

// 设置配置值
const setConfigValue = (config: PluginDetailConfig, newValue: any) => {
    const type = config.type?.toLowerCase() || ''

    // 数值类型转换
    if (type === 'int') {
        config.value = parseInt(newValue) || 0
        return
    }
    if (type === 'float') {
        config.value = parseFloat(newValue) || 0
        return
    }

    // 布尔类型
    if (type === 'bool' || type === 'boolean') {
        config.value = newValue
        return
    }

    // list：支持 JSON 数组或逗号分隔
    if (type === 'list') {
        if (!newValue.trim()) {
            config.value = []
            return
        }
        try {
            const parsed = JSON.parse(newValue)
            config.value = Array.isArray(parsed)
                ? parsed.map((v: any) => String(v))
                : newValue.split(',').map((v: string) => v.trim()).filter((v: string) => v !== '')
        } catch {
            config.value = newValue.split(',').map((v: string) => v.trim()).filter((v: string) => v !== '')
        }
        return
    }

    // dict/json：JSON 解析校验
    if (type === 'dict' || type === 'json') {
        if (!newValue.trim()) {
            config.value = {}
            return
        }
        try {
            config.value = JSON.parse(newValue)
        } catch (e) {
            ZXNotification({
                title: '格式错误',
                message: 'JSON 格式不正确，请检查 (｡•́︿•̀｡)',
                type: '😭',
                position: 'top-right'
            })
        }
        return
    }

    // 默认字符串
    config.value = newValue
}

// 数字步进：int 步长 1，float 步长 0.1（结果保留两位小数防浮点误差）
const stepConfigValue = (config: PluginDetailConfig, dir: 1 | -1) => {
    const type = config.type?.toLowerCase() || ''
    const step = type === 'float' ? 0.1 : 1
    const current =
        typeof config.value === 'number'
            ? config.value
            : parseFloat(String(config.value ?? '')) || 0
    config.value = Math.round((current + dir * step) * 100) / 100
}

// 保存配置
const handleSave = async () => {
    if (!pluginDetail.value) return

    saving.value = true
    try {
        // 先保存通用设置（群权限 / 限制超级用户）
        const settingsRes = await pluginApi.updatePluginSettings({
            module: props.module,
            level: editableLevel.value,
            limit_superuser: editableLimitSuperuser.value
        })
        if (!settingsRes?.success) {
            ZXNotification({
                title: '哎呀~',
                message: settingsRes.message || '保存通用设置失败了，请再试一次 (´；ω；`)',
                type: '😭',
                position: 'top-right'
            })
            return
        }

        // 构建配置数据，将值转为字符串，由后端进行类型转换
        const configs = editableConfigs.value.reduce((acc, config) => {
            const type = config.type?.toLowerCase() || ''
            let stringValue: string

            // 根据类型将值转为字符串格式
            if (type === 'bool' || type === 'boolean') {
                stringValue = config.value ? 'true' : 'false'
            } else if (type === 'list' || type === 'dict' || type === 'json') {
                // JSON 类型转为字符串
                stringValue = typeof config.value === 'string'
                    ? config.value
                    : JSON.stringify(config.value)
            } else {
                // 其他类型直接转字符串
                stringValue = String(config.value ?? '')
            }

            acc[config.key] = stringValue
            return acc
        }, {} as Record<string, string>)

        const res = await pluginApi.savePluginConfig(props.module, configs)
        if (res?.success) {
            ZXNotification({
                title: '成功啦~',
                message: '插件配置已保存 ♪(´▽｀)',
                type: '🥳',
                position: 'top-right',
                confetti: true
            })
            emit('updated', props.module)
            internalVisible.value = false
        } else {
            ZXNotification({
                title: '哎呀~',
                message: res.message || '保存配置失败了，请再试一次 (´；ω；`)',
                type: '😭',
                position: 'top-right'
            })
        }
    } catch (error) {
        ZXNotification({
            title: '呜呼~',
            message: '网络请求失败 (っ °Д °;) っ',
            type: '😭',
            position: 'top-right'
        })
    } finally {
        saving.value = false
    }
}

// 重置配置
const handleReset = () => {
    // 恢复原始值
    editableConfigs.value = originalConfigs.value.map(config => ({
        ...config,
        value: JSON.parse(JSON.stringify(config.value))
    }))
    editableLevel.value = originalLevel.value
    editableLimitSuperuser.value = originalLimitSuperuser.value

    ZXNotification({
        title: '已重置',
        message: '配置已恢复到原始值 (｡•̀ᴗ-)✧',
        type: '😌',
        position: 'top-right'
    })
}

// 关闭弹窗
const handleClose = () => {
    internalVisible.value = false
}

// 根据类型获取占位符
const getPlaceholder = (config: PluginDetailConfig) => {
    const type = config.type?.toLowerCase() || ''
    if (type === 'json' || type === 'dict') {
        return '{ "key": "value" }'
    }
    if (type === 'list') {
        return '多项用英文逗号分隔'
    }
    if (config.default_value !== null && config.default_value !== undefined) {
        return `默认值：${config.default_value}`
    }
    return '请输入配置值'
}
</script>

<template>
    <Teleport to="body">
        <Transition name="modal-jelly" :duration="{ enter: 500, leave: 250 }">
            <div
                v-if="internalVisible"
                class="fixed inset-0 z-50 flex items-center justify-center"
            >
                <div
                    class="glass-overlay absolute h-full w-full"
                    @click.self="handleClose"
                ></div>
                <div
                    class="modal-content relative z-1 flex max-h-[85vh] w-full max-w-3xl flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xl max-sm:mx-4"
                >
                    <!-- 头部：图标 + 标题 + 模块徽标 -->
                    <div class="flex items-center gap-3.5 px-6 pt-5 pb-4">
                        <div class="flex min-w-0 flex-1 items-center gap-2">
                            <p class="truncate text-2xl font-bold text-slate-800">
                                {{ pluginName }}
                            </p>
                            <span
                                class="shrink-0 rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-400"
                            >
                                {{ module }}
                            </span>
                        </div>
                        <button
                            class="flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-full text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
                            type="button"
                            @click="handleClose"
                        >
                            <X class="h-4 w-4" />
                        </button>
                    </div>

                    <!-- 搜索 -->
                    <div v-if="!loading && editableConfigs.length > 0" class="px-6 pb-4">
                        <div
                            class="flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-3.5 py-2 transition-all focus-within:border-slate-400 focus-within:shadow-[inset_0_0_0_1px_var(--color-slate-400)] focus-within:bg-white"
                        >
                            <Search class="h-4 w-4 shrink-0 text-slate-400" />
                            <input
                                ref="searchInputRef"
                                v-model="searchKeyword"
                                type="text"
                                placeholder="搜索配置项"
                                class="min-w-0 flex-1 bg-transparent text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none"
                            >
                            <span
                                class="flex shrink-0 items-center gap-0.5 text-[10px] text-slate-400"
                            >
                                <span
                                    class="rounded border border-slate-200 bg-white px-1.5 py-0.5 font-mono leading-none"
                                >{{ isMac ? '⌘' : 'Ctrl' }}</span>
                                <span
                                    class="rounded border border-slate-200 bg-white px-1.5 py-0.5 font-mono leading-none"
                                >K</span>
                            </span>
                        </div>
                    </div>

                    <!-- 主体：权限设置 / 参数配置 两个分区 -->
                    <div class="min-h-0 flex-1 space-y-4 overflow-y-auto px-6 pb-5">
                        <!-- 加载中 -->
                        <div v-if="loading" class="flex items-center justify-center py-14">
                            <div
                                class="h-8 w-8 animate-spin rounded-full border-2 border-zx-primary border-t-transparent"
                            ></div>
                        </div>

                        <template v-else>
                            <!-- 分区一：权限设置（所有插件默认拥有） -->
                            <section
                                class="rounded-3xl border border-slate-200 bg-white p-4 sm:p-5"
                            >
                                <div class="flex items-center gap-2.5 pb-4">

                                    <div>
                                        <p class="text-sm font-bold text-slate-800">权限设置</p>
                                    </div>
                                </div>

                                <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                    <!-- 群权限 -->
                                    <div
                                        class="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3"
                                    >
                                        <div class="min-w-0 flex-1">
                                            <p class="text-sm font-bold text-slate-700">群权限</p>
                                            <p
                                                class="truncate text-xs text-slate-400"
                                                title="触发该功能所需权限等级"
                                            >
                                                触发该功能所需权限等级
                                            </p>
                                        </div>
                                        <ZXDropdown
                                            :model-value="String(editableLevel)"
                                            :options="levelOptions"
                                            trigger-class="flex h-9 shrink-0 items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3.5 text-sm text-slate-700 transition-colors hover:text-zx-primary"
                                            @update:model-value="editableLevel = Number($event)"
                                        >
                                            <template #trigger="{ label, open }">
                                                <span class="font-semibold">{{ label }}</span>
                                                <ChevronDown
                                                    class="h-3.5 w-3.5 shrink-0 text-slate-400 transition-transform"
                                                    :class="open ? 'rotate-180' : ''"
                                                />
                                            </template>
                                        </ZXDropdown>
                                    </div>

                                    <!-- 限制超级用户 -->
                                    <div
                                        class="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3"
                                    >
                                        <div class="min-w-0 flex-1">
                                            <p class="text-sm font-bold text-slate-700">限制超级用户</p>
                                            <p class="truncate text-xs text-slate-400">
                                                {{ editableLimitSuperuser ? '超级用户也受等级限制' : '超级用户不受等级限制' }}
                                            </p>
                                        </div>
                                        <label
                                            class="relative inline-flex shrink-0 cursor-pointer items-center"
                                        >
                                            <input
                                                type="checkbox"
                                                v-model="editableLimitSuperuser"
                                                class="sr-only peer"
                                            >
                                            <div
                                                class="h-6 w-11 rounded-full bg-slate-200 transition-colors after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:bg-white after:transition-all peer-checked:bg-zx-primary peer-checked:after:translate-x-full"
                                            ></div>
                                        </label>
                                    </div>
                                </div>
                            </section>

                            <!-- 无配置项提示 -->
                            <p
                                v-if="editableConfigs.length === 0"
                                class="text-center text-xs text-slate-300"
                            >
                                该插件没有额外配置项
                            </p>

                            <!-- 分区二：参数配置 -->
                            <section
                                v-else
                                class="rounded-3xl border border-slate-200 bg-white p-4 px-0 sm:p-5 sm:px-0"
                            >
                                <div class="flex items-center gap-2.5 pb-4 px-4 sm:px-5">

                                    <div class="min-w-0 flex-1">
                                        <p class="text-sm font-bold text-slate-800">参数配置</p>

                                    </div>
                                </div>

                                <!-- 表格：列头 + 行 -->
                                <div
                                    class="overflow-hidden w-full"
                                >
                                    <!-- 列头（仅 sm+ 显示） -->
                                    <div
                                        class="hidden grid-cols-[1rem_10rem_1fr_4.5rem_14rem] items-center gap-3 border-b border-slate-100 px-4 py-2 text-xs text-slate-400 sm:grid"
                                    >
                                        <span></span>
                                        <span>参数名</span>
                                        <span>说明</span>
                                        <span>类型</span>
                                        <span>值</span>
                                    </div>

                                    <!-- 参数行 -->
                                    <div
                                        v-if="filteredConfigs.length > 0"
                                        ref="rowsRef"
                                        class="divide-y divide-slate-100"
                                    >
                                        <div
                                            v-for="config in filteredConfigs"
                                            :key="config.key"
                                            class="group flex flex-col gap-2 px-4 py-3 transition-colors hover:bg-slate-50 sm:grid sm:grid-cols-[1rem_10rem_1fr_4.5rem_14rem] sm:items-center sm:gap-3"
                                        >
                                            <!-- 拖拽柄 -->
                                            <div class="hidden shrink-0 sm:flex sm:justify-center">
                                                <GripVertical
                                                    class="h-3.5 w-3.5 cursor-grab text-slate-300 transition-colors group-hover:text-slate-400"
                                                />
                                            </div>
                                            <!-- 参数名 -->
                                            <div class="flex min-w-0 items-center gap-1.5">
                                                <span
                                                    class="truncate text-xs font-semibold text-slate-700"
                                                    :title="config.key"
                                                >
                                                    {{ config.key }}
                                                </span>
                                                <span
                                                    class="shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-bold uppercase leading-none sm:hidden"
                                                    :class="typeBadge(config.type).cls"
                                                >
                                                    {{ typeBadge(config.type).label }}
                                                </span>
                                            </div>

                                            <!-- 说明 -->
                                            <p
                                                class="truncate text-[11px] text-slate-400"
                                                :title="config.help ?? undefined"
                                            >
                                                {{ config.help || '—' }}
                                            </p>

                                            <!-- 类型 -->
                                            <div class="hidden sm:block">
                                                <span
                                                    class="inline-block rounded-full px-3 py-1 text-[10px] font-bold uppercase leading-none"
                                                    :class="typeBadge(config.type).cls"
                                                >
                                                    {{ typeBadge(config.type).label }}
                                                </span>
                                            </div>

                                            <!-- 值：输入控件 -->
                                            <div>
                                                <!-- 布尔 -->
                                                <div
                                                    v-if="config.type?.toLowerCase() === 'bool' || config.type?.toLowerCase() === 'boolean'"
                                                    class="flex items-center justify-end gap-3"
                                                >
                                                    <span
                                                        class="text-[13px] transition-colors"
                                                        :class="getConfigValue(config) ? 'text-slate-700' : 'text-slate-400'"
                                                    >
                                                        {{ getConfigValue(config) ? '已启用' : '已禁用' }}
                                                    </span>
                                                    <label
                                                        class="relative inline-flex cursor-pointer items-center"
                                                    >
                                                        <input
                                                            type="checkbox"
                                                            :checked="getConfigValue(config)"
                                                            @change="setConfigValue(config, ($event.target as HTMLInputElement).checked)"
                                                            class="sr-only peer"
                                                        >
                                                        <div
                                                            class="h-6 w-11 rounded-full bg-slate-200 transition-colors after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:bg-white after:transition-all peer-checked:bg-zx-primary peer-checked:after:translate-x-full"
                                                        ></div>
                                                    </label>
                                                </div>

                                                <!-- list：逗号分隔 -->
                                                <input
                                                    v-else-if="config.type?.toLowerCase() === 'list'"
                                                    type="text"
                                                    :value="configValueText(config)"
                                                    @input="setConfigValue(config, ($event.target as HTMLInputElement).value)"
                                                    :placeholder="getPlaceholder(config)"
                                                    class="w-full rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-[13px] text-slate-700 placeholder:text-slate-400 transition-colors focus:border-zx-primary focus:bg-white focus:outline-none"
                                                >

                                                <!-- dict/json -->
                                                <input
                                                    v-else-if="config.type?.toLowerCase() === 'dict' || config.type?.toLowerCase() === 'json'"
                                                    type="text"
                                                    :value="configValueText(config)"
                                                    @input="setConfigValue(config, ($event.target as HTMLInputElement).value)"
                                                    :placeholder="getPlaceholder(config)"
                                                    class="w-full rounded-full border border-slate-200 bg-slate-50 px-4 py-2 font-mono text-[13px] text-slate-700 placeholder:text-slate-400 transition-colors focus:border-zx-primary focus:bg-white focus:outline-none"
                                                >

                                                <!-- int / float：步进器（加减在输入框内右侧） -->
                                                <div
                                                    v-else-if="config.type?.toLowerCase() === 'int' || config.type?.toLowerCase() === 'float'"
                                                    class="flex w-full items-center gap-1 rounded-full border border-slate-200 bg-slate-50 py-1 pl-4 pr-1.5 transition-colors focus-within:border-zx-primary focus-within:bg-white"
                                                >
                                                    <input
                                                        type="number"
                                                        :value="getConfigValue(config)"
                                                        @input="setConfigValue(config, ($event.target as HTMLInputElement).value)"
                                                        :placeholder="getPlaceholder(config)"
                                                        class="num-input min-w-0 flex-1 bg-transparent text-[13px] text-slate-700 placeholder:text-slate-400 focus:outline-none"
                                                    >
                                                    <button
                                                        class="flex h-7 w-7 shrink-0 cursor-pointer items-center justify-center rounded-full text-slate-400 transition-colors hover:bg-white hover:text-zx-primary"
                                                        title="减少"
                                                        type="button"
                                                        @click="stepConfigValue(config, -1)"
                                                    >
                                                        <Minus class="h-3.5 w-3.5" />
                                                    </button>
                                                    <button
                                                        class="flex h-7 w-7 shrink-0 cursor-pointer items-center justify-center rounded-full text-slate-400 transition-colors hover:bg-white hover:text-zx-primary"
                                                        title="增加"
                                                        type="button"
                                                        @click="stepConfigValue(config, 1)"
                                                    >
                                                        <Plus class="h-3.5 w-3.5" />
                                                    </button>
                                                </div>

                                                <!-- 字符串 -->
                                                <input
                                                    v-else
                                                    type="text"
                                                    :value="getConfigValue(config)"
                                                    @input="setConfigValue(config, ($event.target as HTMLInputElement).value)"
                                                    :placeholder="getPlaceholder(config)"
                                                    class="w-full rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-[13px] text-slate-700 placeholder:text-slate-400 transition-colors focus:border-zx-primary focus:bg-white focus:outline-none"
                                                >
                                            </div>
                                        </div>
                                    </div>

                                    <!-- 无搜索结果 -->
                                    <div
                                        v-else
                                        class="flex flex-col items-center justify-center py-10 text-slate-300"
                                    >
                                        <Search class="mb-2 h-8 w-8 opacity-40" />
                                        <p class="text-sm">没有找到匹配的配置项</p>
                                    </div>
                                </div>
                            </section>
                        </template>
                    </div>

                    <!-- 底部操作栏：左重置 + 提示，右取消/保存 -->
                    <div
                        class="flex items-center justify-between gap-3 border-t border-slate-100 px-6 py-4"
                    >
                        <div class="flex min-w-0 items-center gap-2">
                            <button
                                class="btn-touch flex shrink-0 cursor-pointer items-center gap-1.5 rounded-full px-4 py-2 text-sm text-slate-500 transition-colors hover:bg-slate-100 disabled:opacity-50"
                                :disabled="loading"
                                type="button"
                                @click="handleReset"
                            >
                                <RotateCcw class="h-4 w-4" />
                                <span>重置</span>
                            </button>
                        </div>
                        <div class="flex shrink-0 items-center gap-2">
                            <button
                                class="btn-touch cursor-pointer rounded-full px-4 py-2 text-sm text-slate-500 transition-colors hover:bg-slate-100 disabled:opacity-50"
                                :disabled="loading"
                                type="button"
                                @click="handleClose"
                            >
                                取消
                            </button>
                            <button
                                class="btn-touch flex cursor-pointer items-center gap-1.5 rounded-full bg-zx-primary px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-zx-primary-hover disabled:opacity-50"
                                :disabled="loading || saving"
                                type="button"
                                @click="handleSave"
                            >
                                <Save v-if="!saving" class="h-4 w-4" />
                                <div
                                    v-else
                                    class="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"
                                ></div>
                                <span>{{ saving ? '保存中...' : '保存' }}</span>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </Transition>
    </Teleport>
</template>

<style scoped>
/* 隐藏 number 输入的浏览器原生步进箭头 */
.num-input::-webkit-outer-spin-button,
.num-input::-webkit-inner-spin-button {
    -webkit-appearance: none;
    margin: 0;
}
.num-input {
    -moz-appearance: textfield;
    appearance: textfield;
}
/* 果冻动画样式已在 custom.css 中统一定义 */
</style>
