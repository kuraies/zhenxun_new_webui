<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { X, Save, RotateCcw, Search, Settings, Plus, Minus } from 'lucide-vue-next'
import { gsap } from 'gsap'
import { pluginApi } from '@/utils/api-next'
import { ZXNotification } from '@/components'
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

// 配置项原始值（用于重置）
const originalConfigs = ref<PluginDetailConfig[]>([])

// 追踪每个 list 类型配置的展开状态
const expandedListConfigs = ref<Set<string>>(new Set())

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

// 加载插件详情
const loadPluginDetail = async () => {
    loading.value = true
    try {
        const res = await pluginApi.getPluginDetail(props.module)
        if (res?.success && res?.data) {
            pluginDetail.value = res.data as PluginDetail

            // 检查 config_list 是否为空
            if (!res.data.config_list || res.data.config_list.length === 0) {
                ZXNotification({
                    title: '提示',
                    message: '该插件没有可配置项 (｡•́︿•̀｡)',
                    type: 'ℹ️',
                    position: 'top-right'
                })
                loading.value = false
                // 不显示弹窗，通知父组件关闭
                emit('update:visible', false)
                emit('close')
                return
            }

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

    // JSON 类型解析
    if (type === 'list' || type === 'dict' || type === 'json') {
        if (!newValue) {
            config.value = type === 'list' ? [] : {}
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

// 获取 List 类型配置的值（返回数组）
const getListValues = (config: PluginDetailConfig): any[] => {
    const value = config.value
    if (Array.isArray(value)) {
        return value
    }
    if (typeof value === 'string') {
        try {
            const parsed = JSON.parse(value)
            if (Array.isArray(parsed)) {
                return parsed
            }
        } catch {
            // 尝试按逗号分割
            return value.split(',').map(s => s.trim()).filter(s => s.length > 0)
        }
    }
    return []
}

// 添加 List 项
const addListItem = (config: PluginDetailConfig) => {
    const currentValues = getListValues(config)
    config.value = [...currentValues, '']
}

// 删除 List 项
const removeListItem = (config: PluginDetailConfig, index: number) => {
    const currentValues = getListValues(config)
    config.value = currentValues.filter((_, i) => i !== index)
}

// 更新 List 项
const updateListItem = (config: PluginDetailConfig, index: number, newValue: string) => {
    const currentValues = getListValues(config)
    const newValues = [...currentValues]
    newValues[index] = newValue
    config.value = newValues
}

// 保存配置
const handleSave = async () => {
    if (!pluginDetail.value) return

    saving.value = true
    try {
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
        return '["item1", "item2"]'
    }
    if (config.default_value !== null && config.default_value !== undefined) {
        return `默认值：${config.default_value}`
    }
    return '请输入配置值'
}

// 获取类型标签颜色
const getTypeBadgeClass = (type: string | null) => {
    if (!type) return 'bg-gray-100 text-gray-600'
    const t = type.toLowerCase()
    if (t === 'str' || t === 'string') return 'bg-blue-100 text-blue-700'
    if (t === 'int' || t === 'float') return 'bg-green-100 text-green-700'
    if (t === 'bool' || t === 'boolean') return 'bg-purple-100 text-purple-700'
    if (t === 'list' || t === 'dict' || t === 'json') return 'bg-orange-100 text-orange-700'
    return 'bg-gray-100 text-gray-600'
}
</script>

<template>
    <Teleport to="body">
        <Transition name="modal-jelly" :duration="{ enter: 500, leave: 250 }">
            <div
                v-if="internalVisible"
                class="fixed inset-0 glass-overlay z-50 flex items-center justify-center p-4"
                @click.self="handleClose"
            >
                <div
                    ref="modalContent"
                    class="modal-content bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[85vh] flex flex-col overflow-hidden"
                >
                    <!-- 头部 -->
                    <div class="flex items-center justify-between p-4 border-b border-gray-200">
                        <div>
                            <h3 class="text-lg font-bold text-gray-800">
                                {{ pluginName }} - 插件配置
                            </h3>
                            <p class="text-xs text-gray-500">
                                模块：{{ module }}
                            </p>
                        </div>
                        <button
                            @click="handleClose"
                            class="p-2 rounded-full hover:bg-gray-100 transition-colors btn-touch"
                        >
                            <X class="w-5 h-5 text-gray-500" />
                        </button>
                    </div>

                    <!-- 搜索栏 -->
                    <div v-if="!loading && editableConfigs.length > 0" class="p-4 border-b border-gray-100 bg-gray-50">
                        <div class="relative">
                            <Search class="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                            <input
                                v-model="searchKeyword"
                                type="text"
                                placeholder="搜索配置项..."
                                class="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                            />
                        </div>
                    </div>

                    <!-- 配置列表 -->
                    <div class="flex-1 overflow-y-auto p-4 space-y-4">
                        <!-- 加载中 -->
                        <div v-if="loading" class="flex items-center justify-center py-12">
                            <div class="text-center text-gray-400">
                                <div class="w-8 h-8 mx-auto mb-3 animate-spin rounded-full border-2 border-blue-500 border-t-transparent"></div>
                                <p>加载配置中...</p>
                            </div>
                        </div>

                        <!-- 无配置项 -->
                        <div v-else-if="!loading && editableConfigs.length === 0" class="flex items-center justify-center py-12">
                            <div class="text-center text-gray-400">
                                <Settings class="w-12 h-12 mx-auto mb-3 opacity-20" />
                                <p>该插件没有配置项</p>
                            </div>
                        </div>

                        <!-- 配置项列表 -->
                        <template v-else-if="filteredConfigs.length > 0">
                            <div
                                v-for="(config, index) in filteredConfigs"
                                :key="config.key"
                                class="bg-gray-50 rounded-2xl p-4 border border-gray-200 hover:border-blue-300 transition-colors"
                            >
                                <!-- 配置头部 -->
                                <div class="flex items-start justify-between gap-3 mb-3">
                                    <div class="flex-1 min-w-0">
                                        <div class="flex items-center gap-2 mb-1">
                                            <span class="font-semibold text-gray-800 break-all">
                                                {{ config.key }}
                                            </span>
                                            <span
                                                v-if="config.type"
                                                :class="getTypeBadgeClass(config.type)"
                                                class="px-2 py-0.5 rounded-full text-[10px] font-medium flex-shrink-0 uppercase"
                                            >
                                                {{ config.type }}
                                            </span>
                                        </div>
                                        <p v-if="config.help" class="text-xs text-gray-500 break-words">
                                            {{ config.help }}
                                        </p>
                                    </div>
                                </div>

                                <!-- 配置输入 -->
                                <div class="mt-3">
                                    <!-- 布尔类型 -->
                                    <div
                                        v-if="config.type?.toLowerCase() === 'bool' || config.type?.toLowerCase() === 'boolean'"
                                        class="flex items-center gap-3"
                                    >
                                        <label class="relative inline-flex items-center cursor-pointer">
                                            <input
                                                type="checkbox"
                                                :checked="getConfigValue(config)"
                                                @change="setConfigValue(config, ($event.target as HTMLInputElement).checked)"
                                                class="sr-only peer"
                                            >
                                            <div class="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                                            <span class="ml-3 text-sm text-gray-600">
                                                {{ getConfigValue(config) ? '已启用' : '已禁用' }}
                                            </span>
                                        </label>
                                    </div>

                                    <!-- List 类型 - 可增减的多个 input -->
                                    <div
                                        v-else-if="config.type?.toLowerCase() === 'list'"
                                        class="space-y-2"
                                    >
                                        <div
                                            v-for="(item, index) in getListValues(config)"
                                            :key="index"
                                            class="flex items-center gap-2"
                                        >
                                            <input
                                                type="text"
                                                :value="item"
                                                @input="updateListItem(config, index, ($event.target as HTMLInputElement).value)"
                                                placeholder="请输入列表项"
                                                class="flex-1 px-3 py-2.5 bg-white border border-gray-300 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                                            >
                                            <button
                                                @click="removeListItem(config, index)"
                                                class="p-2 rounded-full hover:bg-red-50 text-red-500 transition-colors"
                                                title="删除此项"
                                            >
                                                <Minus class="w-4 h-4" />
                                            </button>
                                        </div>
                                        <button
                                            @click="addListItem(config)"
                                            class="flex items-center gap-2 px-4 py-2 rounded-2xl border border-dashed border-blue-300 text-blue-600 hover:bg-blue-50 transition-colors text-sm"
                                        >
                                            <Plus class="w-4 h-4" />
                                            <span>添加项</span>
                                        </button>
                                    </div>

                                    <!-- dict/json 类型 -->
                                    <textarea
                                        v-else-if="config.type?.toLowerCase() === 'dict' || config.type?.toLowerCase() === 'json'"
                                        :value="getConfigValue(config)"
                                        @input="setConfigValue(config, ($event.target as HTMLTextAreaElement).value)"
                                        :placeholder="getPlaceholder(config)"
                                        rows="4"
                                        class="w-full px-3 py-2.5 bg-white border border-gray-300 rounded-2xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all resize-none"
                                    ></textarea>

                                    <!-- 数字类型 -->
                                    <input
                                        v-else-if="config.type?.toLowerCase() === 'int'"
                                        type="number"
                                        :value="getConfigValue(config)"
                                        @input="setConfigValue(config, ($event.target as HTMLInputElement).value)"
                                        :placeholder="getPlaceholder(config)"
                                        class="w-full px-3 py-2.5 bg-white border border-gray-300 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                                    >

                                    <!-- float 类型 -->
                                    <input
                                        v-else-if="config.type?.toLowerCase() === 'float'"
                                        type="number"
                                        step="0.1"
                                        :value="getConfigValue(config)"
                                        @input="setConfigValue(config, ($event.target as HTMLInputElement).value)"
                                        :placeholder="getPlaceholder(config)"
                                        class="w-full px-3 py-2.5 bg-white border border-gray-300 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                                    >

                                    <!-- 字符串类型 -->
                                    <input
                                        v-else
                                        type="text"
                                        :value="getConfigValue(config)"
                                        @input="setConfigValue(config, ($event.target as HTMLInputElement).value)"
                                        :placeholder="getPlaceholder(config)"
                                        class="w-full px-3 py-2.5 bg-white border border-gray-300 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                                    >
                                </div>
                            </div>
                        </template>

                        <!-- 无搜索结果 -->
                        <div v-else-if="!loading && editableConfigs.length > 0 && searchKeyword" class="flex items-center justify-center py-12">
                            <div class="text-center text-gray-400">
                                <Search class="w-12 h-12 mx-auto mb-3 opacity-20" />
                                <p>没有找到匹配的配置项</p>
                            </div>
                        </div>
                    </div>

                    <!-- 底部操作栏 -->
                    <div v-if="editableConfigs.length > 0" class="flex items-center justify-end gap-3 p-4 border-t border-gray-200 bg-gray-50">
                        <button
                            @click="handleReset"
                            :disabled="loading"
                            class="flex items-center gap-2 px-4 py-2 rounded-2xl bg-gray-200 text-gray-700 hover:bg-gray-300 transition-colors disabled:opacity-50 btn-touch"
                        >
                            <RotateCcw class="w-4 h-4" />
                            <span class="text-sm font-medium">重置</span>
                        </button>
                        <button
                            @click="handleClose"
                            :disabled="loading"
                            class="px-4 py-2 rounded-2xl bg-white border border-gray-300 text-gray-700 hover:bg-gray-100 transition-colors disabled:opacity-50 btn-touch"
                        >
                            取消
                        </button>
                        <button
                            @click="handleSave"
                            :disabled="loading || saving"
                            class="flex items-center gap-2 px-6 py-2 rounded-2xl bg-blue-600 text-white hover:bg-blue-700 transition-all disabled:opacity-50 btn-touch"
                        >
                            <Save v-if="!saving" class="w-4 h-4" />
                            <div v-else class="w-4 h-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                            <span class="text-sm font-medium">
                                {{ saving ? '保存中...' : '保存' }}
                            </span>
                        </button>
                    </div>
                </div>
            </div>
        </Transition>
    </Teleport>
</template>

<style scoped>
/* 果冻动画样式已在 custom.css 中统一定义 */
</style>
