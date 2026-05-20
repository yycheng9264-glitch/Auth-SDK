import type { AuthSDKConfig, AuthSDKInstance, AuthInfo, UserInfo, LoginCredentials, AuthMode, LoginUIStyle } from './types';
export type { AuthSDKConfig, AuthSDKInstance, AuthInfo, UserInfo, LoginCredentials, AuthMode, LoginUIStyle, };
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
export declare function createAuthSDK(config: AuthSDKConfig): AuthSDKInstance;
