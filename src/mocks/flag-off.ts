// Mock 开关关闭（或生产构建）时 vite alias 指向本文件，MOCK_MODE 为编译期常量 false，
// 所有 if (MOCK_MODE) 分支会被摇树移除，src/mocks 不会进入产物
export const MOCK_MODE = false as const
