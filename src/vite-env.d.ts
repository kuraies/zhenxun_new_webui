/// <reference types="vite/client" />

// Mock 模式开关，由 vite.config.ts 的 alias 指向 src/mocks/flag-on.ts / flag-off.ts
declare module 'virtual:mock-mode' {
    export const MOCK_MODE: boolean
}

// Mock 适配器，由 vite.config.ts 的 alias 指向 src/mocks/server.ts / empty-adapter.ts
declare module 'virtual:mock-api' {
    import type { AxiosAdapter } from 'axios'
    export const mockAdapter: AxiosAdapter | undefined
}

declare module '*.vue' {
    import type { DefineComponent } from 'vue'
    const component: DefineComponent<{}, {}, any>
    export default component
}
