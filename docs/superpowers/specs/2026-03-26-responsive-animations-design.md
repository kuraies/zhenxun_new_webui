---
name: 响应式动画与过渡效果增强
description: 完善页面切换时的响应式动画、过渡效果，包括侧边栏FLIP动画、断点过渡、卡片交互和列表动画
type: project
---

# 响应式动画与过渡效果增强

## 背景

当前前端已有基础的响应式效果和部分动画，但存在以下改进空间：
- 侧边栏折叠/展开时，内容区域直接重排，缺乏平滑过渡
- 窗口尺寸变化时，布局跳变不够流畅
- 卡片交互反馈不够生动
- 列表数据变化时缺乏动画效果

## 目标

使用 GSAP + FLIP 方案增强以下场景的动画效果：
1. 侧边栏折叠/展开时的布局动画
2. 断点切换时的过渡动画
3. 卡片交互的视觉反馈
4. 列表项进入/离开/筛选动画

## 技术方案

### 依赖

- GSAP (已安装) - 核心动画库
- GSAP Flip 插件 (需新增) - FLIP 动画支持

### 实现细节

#### 1. 侧边栏折叠/展开 - FLIP 动画

**触发时机：** `navMini` 状态变化

**实现流程：**
1. 切换前：使用 `Flip.getState()` 记录内容区域关键元素位置
2. 执行布局变化：更新 `navMini` 状态，让浏览器重排
3. 动画回放：`Flip.from(state)` 动画元素到新位置

**动画参数：**
- 持续时间：350ms
- 缓动函数：`power2.inOut`
- 交错延迟：25ms

**涉及元素：**
- Dashboard 页面的统计卡片
- 插件列表页的插件卡片
- 商店页面的商店卡片
- 管理页面的群组/好友卡片

#### 2. 窗口尺寸变化 - 断点过渡

**触发时机：** Tailwind 断点切换

**断点定义：**
- sm: 640px
- md: 768px
- lg: 1024px
- xl: 1280px
- 2xl: 1536px

**实现方式：**
- 监听 resize 事件，防抖 150ms
- 检测当前断点，仅在断点变化时触发 FLIP 动画
- 同一断点内的尺寸变化不触发动画

#### 3. 卡片交互动画

**悬停效果：**
- 上浮 4px + 阴影增强
- 过渡：200ms ease-out

**点击反馈：**
- 按下：scale(0.98)
- 释放：弹性恢复 back.out(1.5)
- 持续：120ms

**选中状态：**
- 边框高亮 + scale(1.02)
- 过渡：250ms ease-out

#### 4. 列表动画

**进入动画：**
- 淡入 + 上移 16px
- 使用 GSAP stagger 交错
- 持续：300ms，交错 40ms

**离开动画：**
- 淡出 + scale(0.95)
- 持续：200ms

**筛选过渡：**
- FLIP 动画处理位置变化
- 新显示项：淡入
- 隐藏项：淡出

## 文件变更

| 文件路径 | 变更类型 | 说明 |
|----------|----------|------|
| `src/composables/useFlipAnimation.ts` | 新建 | FLIP 动画 composable |
| `src/composables/useBreakpoint.ts` | 新建 | 断点检测 composable |
| `src/composables/useListAnimation.ts` | 新建 | 列表动画 composable |
| `src/assets/custom.css` | 修改 | 添加动画工具类 |
| `src/pages/Home.vue` | 修改 | 集成 FLIP 动画 |
| `src/views/dashboard/Dashboard.vue` | 修改 | 添加列表进入动画 |
| `src/views/plugin/Plugin.vue` | 修改 | 添加列表动画和筛选过渡 |
| `src/views/store/Store.vue` | 修改 | 添加列表动画和筛选过渡 |
| `src/views/manage/GroupManage.vue` | 修改 | 添加列表动画 |
| `src/views/manage/FriendManage.vue` | 修改 | 添加列表动画 |
| `src/components/zxcomponent/PluginCard/PluginCard.vue` | 修改 | 增强交互动画 |
| `src/components/zxcomponent/StoreCard/StoreCard.vue` | 修改 | 增强交互动画 |
| `src/components/zxcomponent/GroupCard/GroupCard.vue` | 修改 | 增强交互动画 |
| `src/components/zxcomponent/FriendCard/FriendCard.vue` | 修改 | 增强交互动画 |
| `package.json` | 修改 | 添加 gsap/Flip 依赖 |

## 验收标准

1. 侧边栏折叠/展开时，内容区域卡片平滑飞行动画
2. 拖拽窗口跨越断点时，触发布局过渡动画
3. 卡片悬停有明显上浮和阴影效果
4. 卡片点击有弹性反馈
5. 列表加载时元素交错淡入
6. 筛选时元素平滑移动到新位置