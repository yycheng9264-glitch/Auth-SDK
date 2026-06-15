// ============================================================
// config.ts — SDK 默认配置
//
// 集中管理所有可配置项，包括鉴权中心地址、存储前缀、超时等。
// 业务方初始化时传入的配置会与默认配置合并。
//
// 配置优先级：内置默认值 < createAuthSDK() 入参 < updateConfig()
// ============================================================

import type { ResolvedConfig } from './types'

/**
 * 获取 SDK 默认配置
 *
 * 这里设计为函数而非常量对象，原因：
 * 1. window.location.origin 需要在运行时确定，不能静态定义
 * 2. 每次调用返回新对象，避免引用被意外修改
 */
export function getDefaultConfig(): ResolvedConfig {
  return {
    // ---- 必填项（业务方需在初始化时传入，此处给空字符串占位） ----
    mode: 'web',
    appId: '',
    authCenterUrl: '',

    // ---- 可选项（有合理默认值） ----
    redirect: typeof window !== 'undefined' ? window.location.origin : '',
    weworkRedirect: typeof window !== 'undefined' ? window.location.href : '',
    weworkSessionHours: 8,
    storagePrefix: 'auth_sdk_',
    loginUI: 'fullscreen',
    requestTimeout: 15000,
    tokenExpireBuffer: 60,
    retryOnAuthFail: true,
    onLogin: () => {},
    onLogout: () => {},

    // ---- SDK 内部存储 key（基于 storagePrefix 动态生成，一般无需修改） ----
    tokenStorageKey: 'token',
    userInfoStorageKey: 'user_info',
    refreshUrl: '/auth-center/openapi/auth/refresh',
  }
}
