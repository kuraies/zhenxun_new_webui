// MessageBox 组件的 props 类型（根据你提供的 defineProps）
export interface MessageBoxProps {
    title?: string
    message?: string
    confirmButtonText?: string
    confirmButtonHoverText?: string
    cancelButtonText?: string
    type?: 'error' | 'warning' | 'info' | 'success'
    onConfirm?: Function
    onCancel?: Function
    [key: string]: any
}

// ZXMessageBox 函数的 options 类型
export interface MessageBoxOptions {
    title?: string
    message?: string
    confirmButtonText?: string
    confirmButtonHoverText?: string
    cancelButtonText?: string
    type?: 'error' | 'warning' | 'info' | 'success'
    // 事件处理 - 这些将覆盖组件内部的 onConfirm/onCancel
    onConfirm?: () => void
    onCancel?: () => void
    slots?: Record<string, () => any>
}