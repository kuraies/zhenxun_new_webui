<script setup lang="ts">
import { ArrowLeft, ChevronRight, Home, Search } from "lucide-vue-next";

defineProps<{
    currentPath: string;
    pathSegments: string[];
    searchQuery: string;
}>();

const emit = defineEmits<{
    back: [];
    home: [];
    navigate: [path: string];
    "update:searchQuery": [value: string];
}>();
</script>

<template>
    <div
        class="rounded-3xl border-1 border-slate-200 bg-white p-3 shadow-sm sm:p-4"
    >
        <div class="scrollbar-hide flex items-center gap-2 overflow-x-auto">
            <button
                :disabled="!currentPath"
                class="btn-touch flex-shrink-0 cursor-pointer rounded-2xl p-1.5 text-gray-500 transition-colors hover:bg-gray-100 disabled:opacity-30"
                @click="emit('back')"
            >
                <ArrowLeft class="h-4 w-4" />
            </button>
            <button
                class="btn-touch flex-shrink-0 cursor-pointer rounded-2xl p-1.5 text-gray-500 transition-colors hover:bg-gray-100"
                @click="emit('home')"
            >
                <Home class="h-4 w-4" />
            </button>

            <div
                class="scrollbar-hide flex min-w-0 flex-1 items-center gap-1 overflow-x-auto text-sm"
            >
                <template v-for="(segment, index) in pathSegments" :key="index">
                    <ChevronRight class="h-4 w-4 flex-shrink-0 text-gray-400" />
                    <button
                        class="max-w-[120px] flex-shrink-0 truncate rounded-2xl px-2 py-1 text-zx-primary transition-colors hover:bg-zx-primary-tint"
                        @click="
                            emit(
                                'navigate',
                                pathSegments.slice(0, index + 1).join('/'),
                            )
                        "
                    >
                        {{ segment }}
                    </button>
                </template>
            </div>

            <div class="relative flex-shrink-0">
                <input
                    :value="searchQuery"
                    class="w-32 rounded-2xl border border-gray-200 px-3 py-1.5 pl-9 text-sm transition-colors focus:outline-none sm:w-48"
                    placeholder="搜索..."
                    type="text"
                    @input="
                        emit(
                            'update:searchQuery',
                            ($event.target as HTMLInputElement).value,
                        )
                    "
                />
                <Search
                    class="absolute top-1/2 left-2.5 h-4 w-4 -translate-y-1/2 text-gray-400"
                />
            </div>
        </div>
    </div>
</template>
