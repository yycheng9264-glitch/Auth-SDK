// ============================================================
// core/AuthSDK.ts — SDK 主类
//
// 这是整个 SDK 的核心编排器，负责：
// 1. 整合 TokenManager、HttpClient 和各鉴权模式
// 2. 提供 guard() 鉴权守卫，业务方只需调用此方法
// 3. 管理登录页面的展示和销毁
// 4. 协调 Web 模式和企微模式的不同流程
// ============================================================

import type {
  AuthMode,
  AuthInfo,
  AuthSDKConfig,
  AuthSDKInstance,
  ResolvedConfig,
  LoginCredentials,
  UserInfo,
} from '../types'
import { getDefaultConfig } from '../config'
import { TokenManager } from './TokenManager'
import { HttpClient } from './Http'
import { createStorage, type Storage } from '../utils/storage'
import { getUrlParam, cleanUrlParam, hasCodeParam } from '../utils/url'
import { WebMode } from '../modes/WebMode'
import { WeWorkMode } from '../modes/WeWorkMode'
import { LoginModal } from '../ui/LoginModal'

export class AuthSDK implements AuthSDKInstance {
  private config: ResolvedConfig
  private tokenManager: TokenManager
  private httpClient: HttpClient
  private storage: Storage
  private loginModal: LoginModal | null = null

  /** 当前登录模式的处理器 */
  private modeHandler: WebMode | WeWorkMode | null = null

  /** 防止 guard() 被重复调用 */
  private guardPromise: Promise<AuthInfo> | null = null

  constructor(config: AuthSDKConfig) {
    // 合并默认配置
    this.config = { ...getDefaultConfig(), ...config }
    this.storage = createStorage(this.config.storagePrefix)

    this.tokenManager = new TokenManager(
      this.storage,
      this.config.tokenExpireBuffer,
    )

    this.httpClient = new HttpClient({
      getToken: () => this.tokenManager.getToken(),
      getAuthInfo: () => this.tokenManager.getAuthInfo(),
      baseUrl: this.config.authCenterUrl,
      timeout: this.config.requestTimeout,
    })

    // 设置 401 自动处理：清除 token 并弹登录页
    this.httpClient.onUnauthorized = () => {
      this.tokenManager.clear()
      this.showLoginUI()
    }

    // 初始化对应模式的处理器
    this.initModeHandler()
  }

  /**
   * 根据模式初始化对应的鉴权处理器
   */
  private initModeHandler(): void {
    if (this.config.mode === 'web') {
      this.modeHandler = new WebMode(this.httpClient)
    } else if (this.config.mode === 'wework') {
      this.modeHandler = new WeWorkMode(this.httpClient, this.config.redirect)
    }
  }

  /**
   * 展示登录 UI
   * 根据 loginUI 配置决定弹窗还是全屏
   * 返回一个 Promise，登录成功后 resolve
   */
  private showLoginUI(): Promise<AuthInfo> {
    return new Promise((resolve, reject) => {
      // 如果已有登录弹窗实例则复用
      if (!this.loginModal) {
        this.loginModal = new LoginModal({
          mode: this.config.mode,
          uiStyle: this.config.loginUI,
          onSubmit: async (credentials: LoginCredentials) => {
            try {
              const info = await this.handleLogin(credentials)
              this.loginModal?.hide()
              this.config.onLogin(info)
              resolve(info)
            } catch (error) {
              // 登录失败由 UI 层显示错误，不 reject（让用户可以重新输入）
              throw error
            }
          },
          onCancel: () => {
            reject(new Error('用户取消登录'))
          },
        })
      }
      this.loginModal.show()
    })
  }

  /**
   * 处理登录逻辑
   * 根据当前模式调用对应的鉴权流程
   */
  private async handleLogin(credentials: LoginCredentials): Promise<AuthInfo> {
    if (!this.modeHandler) {
      throw new Error('未初始化鉴权模式处理器')
    }

    const authInfo = await this.modeHandler.login(credentials)

    // 保存认证信息
    this.tokenManager.saveAuthInfo(authInfo)

    // 如果是企微模式且有用户信息，额外保存
    if (authInfo.userInfo) {
      this.tokenManager.saveUserInfo(authInfo.userInfo)
    }

    return authInfo
  }

  // ============================================================
  // 对外 API
  // ============================================================

  /**
   * 鉴权守卫 —— 核心方法
   *
   * 流程：
   * 1. 检查本地 token 是否有效
   * 2. 企微模式：检查是否有 OAuth 回调 code，有则自动处理
   * 3. 如果未登录，弹出登录页面
   * 4. 登录成功后 resolve
   *
   * 业务方通常只在应用入口调用一次：
   *   auth.guard().then(() => mountApp())
   */
  async guard(): Promise<AuthInfo> {
    // 防止重复调用导致多个登录弹窗
    if (this.guardPromise) return this.guardPromise

    this.guardPromise = this._guard()
    return this.guardPromise
  }

  private async _guard(): Promise<AuthInfo> {
    // ---- 检查是否已登录 ----
    if (this.tokenManager.isValid()) {
      const info = this.tokenManager.getAuthInfo()
      if (info) return info
    }

    // ---- 企微模式特殊处理：检测 OAuth 回跳 ----
    if (this.config.mode === 'wework' && hasCodeParam()) {
      return this.handleWeWorkCallback()
    }

    // ---- 未登录，弹出登录页面 ----
    return this.showLoginUI()
  }

  /**
   * 处理企微 OAuth 回调
   * URL 中携带 ?code=xxx，调用 login 接口换取用户信息
   */
  private async handleWeWorkCallback(): Promise<AuthInfo> {
    const code = getUrlParam('code')
    if (!code) {
      // 没有 code 但仍进入了此方法，回退到弹出登录页
      return this.showLoginUI()
    }

    // 企微回调场景：需要用户先输入 appId
    // 因为 code 是企微返回的临时授权码，需要结合 appId 才能换取用户信息
    return new Promise((resolve, reject) => {
      if (!this.loginModal) {
        this.loginModal = new LoginModal({
          mode: this.config.mode,
          uiStyle: this.config.loginUI,
          isCallback: true, // 标记为回调模式，UI 给出对应的提示文案
          onSubmit: async (credentials: LoginCredentials) => {
            try {
              const info = await this.modeHandler!.login({
                ...credentials,
                // 把 code 传给登录处理器
                code,
              })
              this.tokenManager.saveAuthInfo(info)
              if (info.userInfo) {
                this.tokenManager.saveUserInfo(info.userInfo)
              }
              // 清除 URL 中的 code，防止刷新后重复处理
              cleanUrlParam('code')
              this.loginModal?.hide()
              this.config.onLogin(info)
              resolve(info)
            } catch (error) {
              throw error
            }
          },
          onCancel: () => {
            // 用户取消，清除 code 防止死循环
            cleanUrlParam('code')
            reject(new Error('用户取消登录'))
          },
        })
      }
      this.loginModal.show()
    })
  }

  /**
   * 检查是否已登录（仅检查本地存储，不触发网络请求或登录流程）
   */
  isAuthenticated(): boolean {
    return this.tokenManager.isValid()
  }

  /**
   * 主动触发登录
   */
  async login(): Promise<AuthInfo> {
    return this.showLoginUI()
  }

  /**
   * 登出
   * 清除所有本地认证数据
   */
  logout(): void {
    this.tokenManager.clear()
    this.config.onLogout()
  }

  /** 获取当前存储的 token */
  getToken(): string | null {
    return this.tokenManager.getToken()
  }

  /** 获取用户信息（企微模式） */
  getUserInfo(): UserInfo | null {
    return this.tokenManager.getUserInfo()
  }

  /** 获取完整认证信息 */
  getAuthInfo(): AuthInfo | null {
    return this.tokenManager.getAuthInfo()
  }

  /**
   * 更新配置
   * 合并到现有配置中，可用于运行时切换后端地址
   */
  updateConfig(config: Partial<AuthSDKConfig>): void {
    Object.assign(this.config, config)
    // 如果地址变了，更新 httpClient 的基础地址
    if (config.authCenterUrl) {
      // 重新创建 httpClient 较为安全
      this.httpClient = new HttpClient({
        getToken: () => this.tokenManager.getToken(),
        getAuthInfo: () => this.tokenManager.getAuthInfo(),
        baseUrl: this.config.authCenterUrl,
        timeout: this.config.requestTimeout,
      })
    }
    // 如果模式变了，重新初始化处理器
    if (config.mode && config.mode !== this.config.mode) {
      this.config.mode = config.mode
      this.initModeHandler()
    }
  }

  /**
   * 带 token 自动注入的 fetch 封装
   * 方便业务方直接使用，无需手动处理 token
   */
  async fetch<T = unknown>(url: string, options?: RequestInit): Promise<T> {
    return this.httpClient.request<T>(url, options)
  }
}
