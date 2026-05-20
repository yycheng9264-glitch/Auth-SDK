// ============================================================
// ui/LoginModal.ts — 登录弹窗/页面组件
//
// 使用原生 DOM + Shadow DOM 实现，不依赖任何前端框架。
// 支持两种模式（Web/企微）和两种展示样式（modal/fullscreen）。
//
// 特点：
// - 样式完全隔离，不影响宿主页面
// - 支持键盘操作（Enter 提交，ESC 取消）
// - 内置 loading、error 状态
// - 密码可见性切换
// ============================================================

import type { AuthMode, LoginCredentials, LoginUIStyle } from '../types'
import { loginStyles } from './styles'

/** 登录模态框配置 */
interface LoginModalConfig {
  mode: AuthMode
  uiStyle: LoginUIStyle
  isCallback?: boolean       // 是否为企微回调模式
  onSubmit: (credentials: LoginCredentials) => Promise<void>
  onCancel: () => void
}

export class LoginModal {
  private config: LoginModalConfig
  private container: HTMLDivElement | null = null
  private root: ShadowRoot | null = null

  // DOM 元素引用，避免重复查询
  private overlay!: HTMLElement
  private errorEl!: HTMLElement
  private submitBtn!: HTMLButtonElement
  private appIdInput!: HTMLInputElement
  private appSecretInput!: HTMLInputElement | null
  private appSecretGroup!: HTMLElement | null
  private form!: HTMLElement

  constructor(config: LoginModalConfig) {
    this.config = config
  }

  /**
   * 显示登录弹窗
   * 懒创建：第一次调用时才构建 DOM
   */
  show(): void {
    if (this.container) {
      this.container.style.display = ''
      return
    }
    this.build()
  }

  /**
   * 隐藏登录弹窗
   */
  hide(): void {
    if (this.container) {
      this.container.style.display = 'none'
    }
  }

  /**
   * 销毁登录弹窗，清理 DOM
   */
  destroy(): void {
    if (this.container && this.container.parentNode) {
      this.container.parentNode.removeChild(this.container)
    }
    this.container = null
    this.root = null
  }

  /**
   * 构建登录弹窗 DOM
   * 使用 Shadow DOM 隔离样式
   */
  private build(): void {
    // 创建容器并附加 Shadow DOM
    this.container = document.createElement('div')
    this.root = this.container.attachShadow({ mode: 'closed' })

    // 注入样式
    const styleEl = document.createElement('style')
    styleEl.textContent = loginStyles
    this.root.appendChild(styleEl)

    // 根据模式构建不同的表单内容
    if (this.config.mode === 'web') {
      this.buildWebForm()
    } else {
      this.buildWeWorkForm()
    }

    // 绑定全局事件
    this.bindEvents()

    // 挂载到页面
    document.body.appendChild(this.container)
  }

  /**
   * 构建 Web 模式的登录表单
   * 包含 appId 和 appSecret 两个输入框
   */
  private buildWebForm(): void {
    const modeClass = this.config.uiStyle === 'fullscreen' ? 'fullscreen' : ''

    // 表单标题：根据是否回调模式显示不同文案
    const title = this.config.isCallback ? '请输入 App ID 完成登录' : '登录认证'
    const subtitle = this.config.isCallback
      ? '企微授权已回调，请输入您的 App ID'
      : '请输入 App ID 和 App Secret'

    this.root!.innerHTML += `
      <div class="auth-sdk-overlay ${modeClass}">
        <div class="auth-sdk-card">
          <h2 class="auth-sdk-title">${title}</h2>
          <p class="auth-sdk-subtitle">${subtitle}</p>

          <div class="auth-sdk-error" id="errorMsg"></div>

          <form id="loginForm">
            <div class="auth-sdk-form-group">
              <label class="auth-sdk-label" for="appId">App ID</label>
              <input
                class="auth-sdk-input"
                type="text"
                id="appId"
                placeholder="请输入应用 ID"
                autocomplete="off"
              />
            </div>

            <div class="auth-sdk-form-group">
              <label class="auth-sdk-label" for="appSecret">App Secret</label>
              <div class="auth-sdk-password-wrapper">
                <input
                  class="auth-sdk-input"
                  type="password"
                  id="appSecret"
                  placeholder="请输入应用密钥"
                  autocomplete="off"
                />
                <button type="button" class="auth-sdk-toggle-btn" id="toggleSecret">
                  显示
                </button>
              </div>
            </div>

            <button type="submit" class="auth-sdk-submit-btn" id="submitBtn">
              登 录
            </button>
          </form>
        </div>
      </div>
    `

    // 获取 DOM 引用
    this.captureElements()
  }

  /**
   * 构建企微模式的登录表单
   * 只包含 appId 输入框
   */
  private buildWeWorkForm(): void {
    const modeClass = this.config.uiStyle === 'fullscreen' ? 'fullscreen' : ''

    const title = this.config.isCallback
      ? '请输入 App ID 完成登录'
      : '企微授权登录'
    const subtitle = this.config.isCallback
      ? '企微授权已回调，请输入您的 App ID'
      : '点击下方按钮跳转企微进行授权'

    this.root!.innerHTML += `
      <div class="auth-sdk-overlay ${modeClass}">
        <div class="auth-sdk-card">
          <h2 class="auth-sdk-title">${title}</h2>
          <p class="auth-sdk-subtitle">${subtitle}</p>

          <div class="auth-sdk-error" id="errorMsg"></div>

          <form id="loginForm">
            <div class="auth-sdk-form-group">
              <label class="auth-sdk-label" for="appId">App ID</label>
              <input
                class="auth-sdk-input"
                type="text"
                id="appId"
                placeholder="请输入应用 ID"
                autocomplete="off"
              />
            </div>

            <button type="submit" class="auth-sdk-submit-btn" id="submitBtn">
              ${this.config.isCallback ? '完 成 登 录' : '企 微 授 权 登 录'}
            </button>
          </form>
        </div>
      </div>
    `

    this.captureElements()
  }

  /**
   * 缓存 DOM 元素引用，避免后续频繁查询
   */
  private captureElements(): void {
    const root = this.root!
    this.overlay = root.querySelector('.auth-sdk-overlay')!
    this.errorEl = root.querySelector('#errorMsg')!
    this.submitBtn = root.querySelector('#submitBtn')!
    this.appIdInput = root.querySelector('#appId')!
    this.form = root.querySelector('#loginForm')!

    // Web 模式特有的密码输入框
    this.appSecretInput = root.querySelector('#appSecret')
    this.appSecretGroup = root.querySelector('.auth-sdk-password-wrapper')

    // 绑定密码可见性切换
    const toggleBtn = root.querySelector('#toggleSecret')
    if (toggleBtn && this.appSecretInput) {
      toggleBtn.addEventListener('click', () => {
        const isPassword = this.appSecretInput!.type === 'password'
        this.appSecretInput!.type = isPassword ? 'text' : 'password'
        toggleBtn.textContent = isPassword ? '隐藏' : '显示'
      })
    }

    // 自动聚焦到第一个输入框
    setTimeout(() => this.appIdInput.focus(), 100)
  }

  /**
   * 绑定表单事件
   */
  private bindEvents(): void {
    // 表单提交
    this.form.addEventListener('submit', (e: Event) => {
      e.preventDefault()
      this.handleSubmit()
    })

    // 登录弹窗不允许点击遮罩关闭，防止用户跳过鉴权
  }

  /**
   * 处理表单提交
   */
  private async handleSubmit(): Promise<void> {
    const appId = this.appIdInput.value.trim()
    const appSecret = this.appSecretInput?.value.trim()

    // 前端校验
    if (!appId) {
      this.showError('请输入 App ID')
      this.appIdInput.focus()
      return
    }

    if (this.config.mode === 'web' && !appSecret) {
      this.showError('请输入 App Secret')
      this.appSecretInput?.focus()
      return
    }

    // 进入 loading 状态
    this.setLoading(true)
    this.hideError()

    try {
      await this.config.onSubmit({ appId, appSecret })
      // 登录成功后由 AuthSDK 调用 hide()
    } catch (error) {
      // 显示后端返回的错误信息
      const message = error instanceof Error ? error.message : '登录失败，请重试'
      this.showError(message)
      this.setLoading(false)
    }
  }

  /**
   * 设置按钮 loading 状态
   */
  private setLoading(loading: boolean): void {
    if (loading) {
      this.submitBtn.disabled = true
      this.submitBtn.innerHTML = '<span class="auth-sdk-spinner"></span> 登录中...'
    } else {
      this.submitBtn.disabled = false
      this.submitBtn.textContent = '登 录'
    }
  }

  /**
   * 显示错误提示
   */
  private showError(message: string): void {
    this.errorEl.textContent = message
    this.errorEl.classList.add('visible')
  }

  /**
   * 隐藏错误提示
   */
  private hideError(): void {
    this.errorEl.textContent = ''
    this.errorEl.classList.remove('visible')
  }
}
