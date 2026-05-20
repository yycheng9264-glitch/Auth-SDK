// ============================================================
// Vue 示例 - 应用入口
//
// 接入 auth-sdk 的核心模式：
// 1. 创建 SDK 实例
// 2. 调用 guard() 鉴权守卫
// 3. 鉴权通过后再创建 Vue 应用
// ============================================================

import { createApp } from 'vue'
import { createAuthSDK } from '@team/auth-sdk'
import App from './App.vue'

// ============================================================
// 第一步：创建 SDK 实例
// ============================================================
const auth = createAuthSDK({
  mode: 'web',
  authCenterUrl: import.meta.env.VITE_AUTH_URL
    || 'https://auth-center.example.com',
  loginUI: 'modal',
  storagePrefix: 'vue_app_',
})

// ============================================================
// 第二步：鉴权守卫 —— 鉴权通过后再渲染应用
// ============================================================
auth.guard()
  .then(() => {
    // 鉴权通过，挂载 Vue 应用
    const app = createApp(App)

    // 将 auth 实例注入到所有组件中
    // 组件内通过 inject('auth') 获取
    app.provide('auth', auth)

    app.mount('#app')
  })
  .catch(() => {
    document.getElementById('app')!.innerHTML = `
      <div style="text-align:center;margin-top:80px;color:#8c8c8c;font-family:sans-serif;">
        <p>已取消登录，<a href="javascript:location.reload()">重新访问</a></p>
      </div>
    `
  })
