// 生产构建（或 mock 开关关闭）时 virtual:mock-api 指向本文件：
// mockAdapter 为 undefined，调用方按未启用处理，src/mocks 的其余代码不进产物
import type { AxiosAdapter } from 'axios'

export const mockAdapter: AxiosAdapter | undefined = undefined
