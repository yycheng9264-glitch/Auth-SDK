// ============================================================
// index.ts — SDK 主入口
//
// 导出内容：
// - createAuthSDK()  : 创建 SDK 实例（核心入口）
// - AuthSDKInstance  : 实例类型
// - AuthSDKConfig    : 配置类型
// - 其他公共类型
//
// UMD 模式下通过 window.AuthSDK 访问：
//   const auth = AuthSDK.create({ ... })
// ============================================================

import { AuthSDK } from './core/AuthSDK'
import type { AuthSDKConfig, AuthSDKInstance, AuthInfo, UserInfo, LoginCredentials, AuthMode, LoginUIStyle } from './types'

// 导出类型，方便业务方做类型推导
export type {
  AuthSDKConfig,
  AuthSDKInstance,
  AuthInfo,
  UserInfo,
  LoginCredentials,
  AuthMode,
  LoginUIStyle,
}

/**
 * 创建鉴权 SDK 实例
 *
 * 这是 SDK 的唯一入口函数，业务方通过此函数获取鉴权实例。
 *
 * @param config  鉴权配置
 * @returns       AuthSDK 实例
 *
 * @example
 * // Web 模式
 * const auth = createAuthSDK({
 *   mode: 'web',
 *   authCenterUrl: 'https://auth-center.example.com',
 * })
 *
 * // 企微模式
 * const auth = createAuthSDK({
 *   mode: 'wework',
 *   authCenterUrl: 'https://auth-center.example.com',
 * })
 *
 * // 在应用入口使用
 * auth.guard().then(() => {
 *   createApp(App).mount('#app')
 * })
 */
export function createAuthSDK(config: AuthSDKConfig): AuthSDKInstance {
  return new AuthSDK(config)
}

// ============================================================
// UMD 全局变量支持
// 当通过 <script> 标签引入时，通过 window.AuthSDK 访问
// ============================================================
if (typeof window !== 'undefined') {
  (window as any).AuthSDK = {
    create: createAuthSDK,
  }
}
