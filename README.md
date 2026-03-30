# 真寻 WebUI

基于 Vue 3 + Vite + TypeScript 开发的真寻 Bot 管理后台界面。

## 技术栈

- **框架**: Vue 3.5+ (`<script setup>` 语法)
- **构建工具**: Vite 7
- **语言**: TypeScript 5.9
- **UI 组件库**: Element Plus 2.10
- **状态管理**: Pinia 3
- **路由**: Vue Router 4
- **HTTP 客户端**: Axios 1.11
- **样式**: TailwindCSS 4
- **图标**: Lucide Vue Next
- **动画**: GSAP 3
- **代码编辑器**: Monaco Editor

## 开发指南

### 环境要求

- Node.js 18+
- npm 或 pnpm

### 安装依赖

```bash
npm install
```

### 开发模式

```bash
npm run dev
```

启动开发服务器后，访问 `http://localhost:5173`（端口可能根据配置变化）。

### 构建生产版本

```bash
npm run build
```

构建产物将输出到 `dist/` 目录。

### 类型检查

```bash
npm run type-check
```

### 预览生产构建

```bash
npm run preview
```

## 项目结构

```
zhenxun_new_webui/
├── src/
│   ├── components/         # 可复用组件
│   │   └── zxcomponent/    # 自定义组件库
│   ├── pages/              # 页面级组件（Login, Home）
│   ├── views/              # 视图组件（各功能页面）
│   ├── store/              # Pinia 状态管理
│   ├── router/             # Vue Router 配置
│   ├── types/              # TypeScript 类型定义
│   ├── utils/              # 工具函数
│   │   └── api-next/       # API 客户端封装
│   ├── config/             # 配置文件
│   └── assets/             # 静态资源
├── public/                 # 公共静态文件
├── index.html              # HTML 入口
├── vite.config.ts          # Vite 配置
├── tsconfig.json           # TypeScript 配置
└── package.json            # 项目依赖
```

## API 集成

API 客户端封装在 `src/utils/api-next/` 目录下：

- **HTTP API**: `/zhenxun/api/v1/*`
- **WebSocket API**: `/zhenxun/ws/v1/*`

### 使用示例

```typescript
import { systemApi, dashboardApi } from '@/utils/api-next'

// 获取系统状态
const status = await systemApi.getStatus()

// 获取仪表盘数据
const dashboard = await dashboardApi.getOverview()
```

## 组件使用

### ZXNotification 通知组件

```typescript
import { ZXNotification } from '@/components'

ZXNotification({
    title: '提示',
    message: '操作成功',
    type: 'success',
    position: 'top-right'
})
```

### ZXMessageBox 消息框

```typescript
import { ZXMessageBox } from '@/components'

const confirmed = await ZXMessageBox({
    title: '确认操作',
    message: '确定要执行此操作吗？',
    confirmButtonText: '确定',
    cancelButtonText: '取消'
})
```

## 代码规范

### TypeScript

- 启用严格模式 (`strict: true`)
- 禁止未使用的局部变量和参数
- 使用类型推导优先，必要时添加显式类型注解

### Vue 组件

- 使用 `<script setup>` 语法
- 组件名使用 PascalCase
- Props 和 Emits 需要显式声明类型

### 样式

- 使用 TailwindCSS 工具类优先
- 复杂样式使用 Scoped CSS
- 响应式设计使用 `sm:`, `md:`, `lg:` 前缀

## 构建优化

- 代码分割：Vue、Element Plus 单独打包
- 图片压缩：使用 `vite-plugin-minipic`
- Gzip 压缩：使用 `vite-plugin-compression2`
-  Terser 混淆：生产环境自动启用

## 常见问题

### API 请求失败

检查后端服务是否启动，默认 API 地址为 `http://localhost:8080`。

### 类型检查错误

运行 `npm run type-check` 查看详细错误信息。

### 样式不生效

检查是否使用了正确的 TailwindCSS 类名，或清除浏览器缓存。

## 许可证

MIT
