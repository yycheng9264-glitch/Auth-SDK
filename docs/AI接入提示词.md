# 以下内容可直接复制发送给 AI 工具（如 Claude Code、Cursor 等）

---

请帮我的前端 React 项目（Vite + TypeScript）接入统一登录鉴权 SDK。

## SDK 信息

- 依赖：`"@yycheng9264-glitch/tool-auth": "^0.1.0"`
- 入口 API：`createAuthSDK(config)` → `auth.guard()` → `auth.logout()` → `auth.fetch()`
- 鉴权模式：Web 模式（用户在登录弹窗输入 appId + appSecret，换取 token）

## 接入步骤

### 1. 安装依赖

在 `package.json` 的 `dependencies` 中添加：

```json
"@yycheng9264-glitch/tool-auth": "^0.1.0"
```

执行 `npm install`。

### 2. 配置环境变量

在 `.env` 文件中添加（如果项目还没有 `.env` 文件则新建一个）：

```
# 鉴权中心地址（开发环境走 Vite proxy，留空发相对路径）
# 生产部署时改为实际地址
VITE_AUTH_URL=
```

### 3. 修改入口文件（src/main.tsx）

在渲染 React 应用之前调用鉴权守卫，鉴权通过后再 render。

```tsx
import React from "react";
import ReactDOM from "react-dom/client";
import { createAuthSDK } from "@yycheng9264-glitch/tool-auth";
import App from "./App";

// 从环境变量读取鉴权中心地址，开发环境留空走 Vite proxy
const auth = createAuthSDK({
  mode: "web",
  authCenterUrl: import.meta.env.VITE_AUTH_URL || "",
  loginUI: "modal",
});

// 鉴权守卫：未登录弹出登录弹窗，通过后才渲染应用
auth.guard().then(() => {
  ReactDOM.createRoot(document.getElementById("root")!).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  );
});
```

### 4. 配置 Vite 代理（开发环境解决跨域）

在 `vite.config.ts` 的 `server.proxy` 中添加 `/auth-center` 的转发：

```ts
export default defineConfig({
  server: {
    proxy: {
      "/auth-center": {
        target: "https://test-api.songtsam.com",
        changeOrigin: true,
      },
    },
  },
});
```

### 5. 添加退出登录按钮

在页面右上角（或导航栏/设置菜单）添加一个退出登录按钮：

```tsx
<button
  onClick={() => {
    auth.logout();
    window.location.reload();
  }}
  style={{
    padding: "4px 16px",
    background: "#ff4d4f",
    color: "#fff",
    border: "none",
    borderRadius: 6,
    cursor: "pointer",
    fontSize: 13,
  }}
>
  退出登录
</button>
```

## 改动清单

| 文件 | 改动 |
|------|------|
| `package.json` | dependencies 加 `@yycheng9264-glitch/tool-auth` |
| `.env` | 加 `VITE_AUTH_URL` |
| `vite.config.ts` | proxy 加 `/auth-center` |
| `src/main.tsx` | 引入 SDK，`auth.guard()` 包裹 render |
| 首页/导航组件 | 右上角加退出登录按钮 |

## 开发/生产环境说明

- **开发环境**：`VITE_AUTH_URL` 留空，请求走 `/auth-center` 相对路径，由 Vite proxy 转发到鉴权中心
- **生产环境**：`VITE_AUTH_URL` 改为实际鉴权中心地址，由后端处理 CORS
