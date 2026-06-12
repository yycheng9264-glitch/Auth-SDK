// ============================================================
// React 示例 - 应用入口
//
// 接入 auth-sdk 的核心模式：
// 1. 创建 SDK 实例
// 2. 调用 guard() 鉴权守卫
// 3. 鉴权通过后再渲染 React 应用
// ============================================================

import React from 'react'
import ReactDOM from 'react-dom/client'
import { createAuthSDK } from '@yycheng9264-glitch/tool-auth'
import App from './App'

// ============================================================
// 第一步：创建 SDK 实例
// ============================================================
const auth = createAuthSDK({
  mode: 'web',                                      // 使用 Web 模式
  authCenterUrl: import.meta.env.VITE_AUTH_URL      // 从环境变量读取鉴权中心地址
    || 'https://auth-center.example.com',
  loginUI: 'modal',                                 // 弹窗模式，适合 SPA
  storagePrefix: 'react_app_',                      // 自定义前缀，避免 key 冲突
})

// ============================================================
// 第二步：鉴权守卫 —— 鉴权通过后再渲染应用
// ============================================================
auth.guard()
  .then(() => {
    // 鉴权通过，渲染 React 应用
    ReactDOM.createRoot(document.getElementById('root')!).render(
      <React.StrictMode>
        <App auth={auth} />
      </React.StrictMode>,
    )
  })
  .catch(() => {
    // 用户取消登录时显示提示
    document.getElementById('root')!.innerHTML = `
      <div style="text-align:center;margin-top:80px;color:#8c8c8c;font-family:sans-serif;">
        <p>已取消登录，<a href="javascript:location.reload()">重新访问</a></p>
      </div>
    `
  })

// 将 auth 实例挂到 window 上方便调试
;(window as any).__auth = auth
