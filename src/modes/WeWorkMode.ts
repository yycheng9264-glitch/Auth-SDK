// ============================================================
// modes/WeWorkMode.ts — 企微鉴权模式
//
// 流程：
// 1. 用户输入 appId 后，SDK 获取企微授权 URL
// 2. 浏览器跳转到企微授权页，用户完成授权
// 3. 企微回调到业务系统页面，URL 携带 ?code=xxx
// 4. 用户再次输入 appId，SDK 用 appId + code 换取用户信息
//
// 接口：
//   GET /auth-center/api/thirdparty/auth/oauth-url?appId=xxx&redirect=xxx
//   Response: { data: "企微授权URL" }
//
//   GET /auth-center/api/thirdparty/auth/login?appId=xxx&code=xxx
//   Response: { userId, userName, mobile, ... }
// ============================================================

import type { AuthInfo, LoginCredentials, UserInfo } from '../types'
import { appendQueryParams } from '../utils/url'
import { HttpError } from '../core/Http'

/**
 * OAuth URL 接口响应结构
 */
interface OAuthUrlResponse {
  data: string  // 企微授权 URL
  success?: boolean
  message?: string
}

interface UserInfoResponse {
  data?: UserInfo
  success?: boolean
  message?: string
}

export class WeWorkMode {
  private authCenterUrl: string
  private redirectUrl: string
  private sessionHours: number

  constructor(
    httpClient: { baseUrl: string },
    redirectUrl: string,
    sessionHours = 8,
  ) {
    this.authCenterUrl = httpClient.baseUrl
    this.redirectUrl = redirectUrl
    this.sessionHours = sessionHours
  }

  /**
   * 获取企微授权 URL
   * 前端拿到 URL 后需要引导用户完成企微的授权
   *
   * @param appId  应用标识
   * @returns      企微授权 URL
   */
  async getOAuthUrl(appId: string, state?: string, redirect?: string): Promise<string> {
    if (!appId) {
      throw new Error('请输入 App ID')
    }

    const url = `${this.authCenterUrl}/auth-center/api/thirdparty/auth/oauth-url`

    // 拼接查询参数
    const fullUrl = appendQueryParams(url, {
      appId,
      ...(state ? { state } : {}),
      redirect: redirect || this.redirectUrl,
    })

    let response: Response
    try {
      response = await fetch(fullUrl, {
        method: 'GET',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      })
    } catch (error) {
      throw new HttpError(0, '网络连接失败，请检查网络', (error as Error).message)
    }

    if (!response.ok) {
      throw new HttpError(
        response.status,
        '获取企微授权地址失败',
        await response.text().catch(() => ''),
      )
    }

    const result = await response.json() as OAuthUrlResponse | string
    const oauthUrl = typeof result === 'string' ? result : result.data

    if (!oauthUrl) {
      const message = typeof result === 'string' ? '' : result.message
      if (message) throw new Error(message)
      throw new Error('获取企微授权地址失败：接口未返回有效的 URL')
    }

    return oauthUrl
  }

  /**
   * 企微模式登录
   * 用企微回调的 code 换取用户信息
   *
   * 注意：
   * 这里的 credentials 可能包含 code 字段（在企微回调场景下由 AuthSDK 传入）
   * 如果 code 不存在，则返回 oauthUrl 让外部跳转
   *
   * @param credentials  包含 appId，可能包含 code
   * @returns            认证信息（包含用户信息）
   */
  async login(credentials: LoginCredentials & { code?: string }): Promise<AuthInfo> {
    const { appId, code } = credentials

    if (!appId) {
      throw new Error('请输入 App ID')
    }

    // 如果没有 code，说明是需要获取 OAuth URL 并跳转
    // 这种情况不应该走到 login，由外部逻辑处理
    if (!code) {
      throw new Error('缺少企微授权 code')
    }

    // 用 code 换取用户信息
    const url = `${this.authCenterUrl}/auth-center/api/thirdparty/auth/login`

    const fullUrl = appendQueryParams(url, { appId, code })

    let response: Response
    try {
      response = await fetch(fullUrl, {
        method: 'GET',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      })
    } catch (error) {
      throw new HttpError(0, '网络连接失败，请检查网络', (error as Error).message)
    }

    if (!response.ok) {
      throw new HttpError(
        response.status,
        '企微登录失败',
        await response.text().catch(() => ''),
      )
    }

    const result = await response.json() as UserInfo | UserInfoResponse
    const userInfo = 'data' in result && result.data ? result.data : result as UserInfo

    if (!userInfo.userId) {
      const message = 'message' in result ? result.message : ''
      if (message) throw new Error(message)
      throw new Error('企微登录失败：未获取到用户信息')
    }

    // 企微模式没有 token，使用用户 ID 构造一个标识 token
    // 后续如果需要调用业务接口，业务方自行决定鉴权方式
    const sessionToken = `wework_${userInfo.userId}_${Date.now()}`
    const expiresAt = Date.now() + this.sessionHours * 60 * 60 * 1000

    return {
      token: sessionToken,
      tokenType: 'Bearer',
      expiresAt,
      userInfo,
      obtainedAt: Date.now(),
    }
  }
}
