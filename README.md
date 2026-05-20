# @team/auth-sdk

统一登录鉴权 SDK，支持 **Web 模式**（appId + appSecret）和 **企微模式**（OAuth），适配 SPA 工程化项目和纯 HTML 页面。

## 功能特性

- 🔐 **双模鉴权**：Web 模式（appId + appSecret 换 token）和企微模式（OAuth 授权获取用户信息）
- 📦 **双模分发**：支持 npm ESM 引入（SPA 项目）和 CDN UMD 引入（HTML 页面）
- 🖥 **原生 UI**：登录弹窗/全屏页使用原生 DOM 实现，不依赖任何前端框架
- 🛡 **鉴权守卫**：一行代码 `guard()` 自动检测登录状态，未登录时弹登录页
- 🔄 **请求封装**：可选 fetch 封装，自动注入 token、处理 401
- 📝 **全中文注释**：代码含详细中文文档注释

## 快速开始

### npm 方式（SPA 工程化项目）

```bash
npm install @team/auth-sdk
```

```ts
import { createAuthSDK } from '@team/auth-sdk'

const auth = createAuthSDK({
  mode: 'web',
  authCenterUrl: 'https://auth-center.example.com',
  loginUI: 'modal',
})

auth.guard().then(() => {
  createApp(App).mount('#app')
})
```

### CDN 方式（纯 HTML 页面）

```html
<script src="https://cdn.example.com/auth-sdk.umd.js"></script>
<script>
  const auth = AuthSDK.create({
    mode: 'wework',
    authCenterUrl: 'https://auth-center.example.com',
  })

  auth.guard().then(() => {
    document.getElementById('app').style.display = 'block'
    startApp()
  })
</script>
```

## 详细文档

- [项目说明文档](./docs/项目说明文档.md) — 项目介绍、技术栈、开发指南
- [业务接入文档](./docs/业务接入文档.md) — 各模式接入步骤、示例代码
- [发布部署文档](./docs/发布部署文档.md) — 构建、发布、部署流程

## 目录结构

```
auth-sdk/
├── src/
│   ├── index.ts           # 主入口
│   ├── config.ts          # 默认配置管理
│   ├── core/              # 核心模块（框架无关）
│   │   ├── AuthSDK.ts     # SDK 主类
│   │   ├── TokenManager.ts# Token 管理器
│   │   └── Http.ts        # 请求封装
│   ├── modes/             # 鉴权模式
│   │   ├── WebMode.ts     # Web 模式
│   │   └── WeWorkMode.ts  # 企微模式
│   ├── ui/                # UI 层
│   │   ├── LoginModal.ts  # 登录弹窗组件
│   │   └── styles.ts      # 样式定义
│   ├── utils/             # 工具函数
│   │   ├── storage.ts     # localStorage 封装
│   │   └── url.ts         # URL 参数工具
│   └── types/             # 类型定义
│       └── index.ts
├── docs/                   # 文档
├── examples/               # 示例项目
└── package.json
```

## 许可证

MIT
