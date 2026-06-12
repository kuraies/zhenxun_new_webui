<script setup lang="ts">
defineProps<{
    modelValue: boolean;
    name: string;
}>();

const emit = defineEmits<{
    "update:modelValue": [value: boolean];
    "update:name": [value: string];
    confirm: [];
}>();
</script>

<template>
    <Transition name="modal-jelly" :duration="{ enter: 500, leave: 250 }">
        <div
            v-if="modelValue"
            class="glass-overlay fixed inset-0 z-50 flex items-center justify-center p-4"
            @click="emit('update:modelValue', false)"
        >
            <div
                class="modal-content w-full max-w-sm rounded-2xl bg-white p-4 shadow-xl sm:p-6"
                @click.stop
            >
                <h3 class="mb-4 text-lg font-semibold text-gray-800">
                    重命名文件
                </h3>

                <input
                    :value="name"
                    class="mb-4 w-full rounded-2xl border border-gray-200 px-4 py-2 text-sm focus:border-none focus:ring-2 focus:ring-blue-500"
                    placeholder="请输入新名称"
                    type="text"
                    @input="
                        emit(
                            'update:name',
                            ($event.target as HTMLInputElement).value,
                        )
                    "
                    @keyup.enter="emit('confirm')"
                />

                <div class="flex space-x-3">
                    <button
                        class="flex-1 rounded-2xl bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-200"
                        @click="emit('update:modelValue', false)"
                    >
                        取消
                    </button>
                    <button
                        class="flex-1 rounded-2xl bg-blue-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-600"
                        @click="emit('confirm')"
                    >
                        确定
                    </button>
                </div>
            </div>
        </div>
    </Transition>
</template>
