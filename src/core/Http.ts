// ============================================================
// core/Http.ts — 带 token 自动注入的请求封装
//
// 职责：
// 1. 自动给请求添加 Authorization: Bearer <token> 头
// 2. 遇到 401 状态码时触发登录回调，让上层处理重新登录
// 3. 支持请求超时控制
// 4. 对非 JSON 响应做安全处理
//
// 注意：
// 这是一个可选功能，业务方可以自己用 getToken() 取 token 后自行处理请求。
// ============================================================

import type { AuthInfo } from '../types'

/**
 * 请求拦截器类型：在请求发送前对配置进行修改
 */
type RequestInterceptor = (config: RequestInit) => RequestInit

/**
 * 响应拦截器类型：对响应数据进行统一处理
 */
type ResponseInterceptor = (response: Response) => Response | Promise<Response>

export class HttpClient {
  private getToken: () => string | null
  private getAuthInfo: () => AuthInfo | null
  /** 鉴权中心基础地址，对外暴露供模式处理器使用 */
  readonly baseUrl: string
  private timeout: number

  /** 请求拦截器列表 */
  private requestInterceptors: RequestInterceptor[] = []

  /** 响应拦截器列表 */
  private responseInterceptors: ResponseInterceptor[] = []

  /** 401 回调：通知上层重新登录 */
  onUnauthorized: (() => void) | null = null

  constructor(params: {
    getToken: () => string | null
    getAuthInfo: () => AuthInfo | null
    baseUrl: string
    timeout: number
  }) {
    this.getToken = params.getToken
    this.getAuthInfo = params.getAuthInfo
    this.baseUrl = params.baseUrl
    this.timeout = params.timeout
  }

  /**
   * 发起带鉴权的 HTTP 请求
   * 自动注入 token、处理超时和 401
   */
  async request<T = unknown>(url: string, options: RequestInit = {}): Promise<T> {
    // 构建完整 URL
    const fullUrl = url.startsWith('http') ? url : `${this.baseUrl}${url}`

    // ---- 自动注入 Authorization 头 ----
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string> || {}),
    }

    const token = this.getToken()
    if (token) {
      headers['Authorization'] = `Bearer ${token}`
    }

    let config: RequestInit = {
      ...options,
      headers,
    }

    // 执行请求拦截器
    for (const interceptor of this.requestInterceptors) {
      config = interceptor(config)
    }

    // ---- 发起请求（含超时控制） ----
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), this.timeout)

    try {
      let response = await fetch(fullUrl, {
        ...config,
        signal: controller.signal,
      })

      // 执行响应拦截器
      for (const interceptor of this.responseInterceptors) {
        response = await interceptor(response)
      }

      // ---- 处理 401 未授权 ----
      if (response.status === 401) {
        if (this.onUnauthorized) {
          this.onUnauthorized()
        }
        throw new HttpError(response.status, '登录已过期，请重新登录')
      }

      // ---- 处理非 2xx 状态码 ----
      if (!response.ok) {
        const errorBody = await response.text().catch(() => '')
        throw new HttpError(response.status, `请求失败: ${response.statusText}`, errorBody)
      }

      // ---- 解析响应体 ----
      // 有些接口可能返回空 body（204 等），安全处理
      const text = await response.text()
      if (!text) return undefined as T
      return JSON.parse(text) as T
    } catch (error) {
      if (error instanceof HttpError) throw error
      if ((error as Error).name === 'AbortError') {
        throw new HttpError(0, '请求超时')
      }
      throw new HttpError(0, '网络请求失败', (error as Error).message)
    } finally {
      clearTimeout(timeoutId)
    }
  }

  /** 添加请求拦截器 */
  addRequestInterceptor(interceptor: RequestInterceptor): void {
    this.requestInterceptors.push(interceptor)
  }

  /** 添加响应拦截器 */
  addResponseInterceptor(interceptor: ResponseInterceptor): void {
    this.responseInterceptors.push(interceptor)
  }
}

/**
 * 自定义 HTTP 错误类
 * 包含状态码、错误信息和可选的响应体内容
 */
export class HttpError extends Error {
  status: number
  body: string

  constructor(status: number, message: string, body: string = '') {
    super(message)
    this.name = 'HttpError'
    this.status = status
    this.body = body
  }
}
