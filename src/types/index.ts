// ============================================================
// types/index.ts — SDK 类型定义
// 包含所有接口、类型别名、枚举的定义
// 统一管理方便业务方查阅和使用
// ============================================================

/**
 * 鉴权模式枚举
 * - web:    用户输入 appId + appSecret 换取 token
 * - wework: 通过企微 OAuth 授权获取用户信息
 */
export type AuthMode = 'web' | 'wework'

/**
 * 登录页展示样式
 * - modal:      居中弹窗，适合 SPA 项目
 * - fullscreen: 全屏遮罩，适合 HTML 页面
 */
export type LoginUIStyle = 'modal' | 'fullscreen'

// ============================================================
// 后端接口响应类型
// ============================================================

/**
 * Web 模式：获取 token 接口响应
 * 对应 POST /auth-center/openapi/auth/token
 */
export interface TokenResponse {
  accessToken: string   // 成功后返回的 token，用于后续访问业务接口
  expiresIn: string     // token 的过期时间（秒）
  tokenType: string     // token 的类型
}

/**
 * 企微模式：获取用户信息接口响应
 * 对应 GET /auth-center/api/thirdparty/auth/login
 */
export interface UserInfo {
  userId: string        // 用户 id
  userName: string      // 用户名称
  mobile: string        // 用户电话
  gender: string        // 性别：1-男，2-女
  email: string         // 邮箱
  avatar: string        // 头像链接
  address: string       // 地址
}

// ============================================================
// SDK 内部类型
// ============================================================

/**
 * SDK 统一认证信息（内部存储结构）
 * 同时兼容 Web 和企微两种模式的认证数据
 */
export interface AuthInfo {
  token: string             // accessToken
  tokenType: string         // token 类型
  expiresAt: number         // 计算后的过期时间戳（Date.now() + expiresIn * 1000）
  userInfo?: UserInfo       // 用户信息，仅企微模式有此字段
  obtainedAt?: number       // 获取时间戳，用于计算剩余有效期
}

/**
 * 登录凭证（用户在登录页填写）
 * Web 模式需要 appId + appSecret
 * 企微模式只需要 appId
 */
export interface LoginCredentials {
  appId: string             // 应用标识
  appSecret?: string        // 应用密钥，企微模式不需要
}

/**
 * SDK 初始化配置
 */
export interface AuthSDKConfig {
  /** 鉴权模式：web | wework */
  mode: AuthMode
  /** 后端鉴权中心基础地址（必填），如 https://auth-center.example.com */
  authCenterUrl: string
  /** 企微回调地址，默认当前页面 origin */
  redirect?: string
  /** localStorage key 前缀，默认 'auth_sdk_'，多应用共存时使用 */
  storagePrefix?: string
  /** 登录 UI 样式：modal | fullscreen */
  loginUI?: LoginUIStyle
  /** 请求超时时间（毫秒），默认 15000 */
  requestTimeout?: number
  /** token 提前过期缓冲时间（秒），默认 60 */
  tokenExpireBuffer?: number
  /** 鉴权失败后是否自动重试，默认 true */
  retryOnAuthFail?: boolean
  /** 登录成功回调 */
  onLogin?: (info: AuthInfo) => void
  /** 登出回调 */
  onLogout?: () => void
}

/**
 * SDK 内部完整配置（合并默认值后的完整配置对象）
 */
export interface ResolvedConfig extends Required<AuthSDKConfig> {
  // 扩展默认值中定义的内部 key
  tokenStorageKey: string
  userInfoStorageKey: string
  refreshUrl: string
}

/**
 * SDK 实例对外暴露的方法接口
 */
export interface AuthSDKInstance {
  /**
   * 鉴权守卫 —— 核心方法
   * 未登录时自动弹出登录页面，登录成功后 resolve
   * 业务方在 guard().then(...) 中启动自己的逻辑
   */
  guard(): Promise<AuthInfo>

  /**
   * 检查是否已登录
   * 仅检查本地存储的 token，不会触发网络请求或登录流程
   */
  isAuthenticated(): boolean

  /**
   * 主动触发登录
   * 弹出登录页面让用户填写凭据
   */
  login(): Promise<AuthInfo>

  /**
   * 登出
   * 清除本地 token/用户信息
   */
  logout(): void

  /**
   * 获取当前存储的 token
   */
  getToken(): string | null

  /**
   * 获取用户信息（企微模式）
   */
  getUserInfo(): UserInfo | null

  /**
   * 获取完整认证信息
   */
  getAuthInfo(): AuthInfo | null

  /**
   * 更新配置（合并到现有配置中）
   * 可用于运行时切换后端地址等场景
   */
  updateConfig(config: Partial<AuthSDKConfig>): void

  /**
   * 带 token 自动注入的 fetch 封装（可选使用）
   * 自动加上 Authorization: Bearer <token>
   * 遇到 401 自动尝试重新登录
   */
  fetch<T = unknown>(url: string, options?: RequestInit): Promise<T>
}
