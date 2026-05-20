// ============================================================
// modes/WebMode.ts — Web 鉴权模式
//
// 流程：
// 1. 用户在登录页输入 appId + appSecret
// 2. 调用后端接口换取 token
// 3. 将 token 和过期时间封装为 AuthInfo
//
// 接口：
//   POST /auth-center/openapi/auth/token
//   Body: { appId, appSecret }
//   Response: { accessToken, expiresIn, tokenType }
// ============================================================

import type { AuthInfo, LoginCredentials, TokenResponse } from '../types'
import { HttpError } from '../core/Http'

/**
 * Web 模式的 Http 请求工具
 * 由于获取 token 时还没有 token，所以直接使用原生 fetch
 */
export class WebMode {
  private authCenterUrl: string

  constructor(httpClient: { baseUrl: string }) {
    this.authCenterUrl = httpClient.baseUrl
  }

  /**
   * Web 模式登录
   * 使用 appId + appSecret 换取 token
   *
   * @param credentials  用户在登录页填写的 appId 和 appSecret
   * @returns            AuthInfo 认证信息
   */
  async login(credentials: LoginCredentials): Promise<AuthInfo> {
    const { appId, appSecret } = credentials

    // 校验必填字段
    if (!appId || !appSecret) {
      throw new Error('请输入 App ID 和 App Secret')
    }

    const url = `${this.authCenterUrl}/auth-center/openapi/auth/token`

    let response: Response
    try {
      response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ appId, appSecret }),
      })
    } catch (error) {
      throw new HttpError(0, '网络连接失败，请检查网络', (error as Error).message)
    }

    if (!response.ok) {
      const errorText = await response.text().catch(() => '')
      throw new HttpError(
        response.status,
        `登录失败 (${response.status})`,
        errorText,
      )
    }

    // 解析响应
    const body = await response.json()

    // 处理通用响应包装：后端可能返回 { code, success, data: { accessToken, ... } }
    // 也可能直接返回 { accessToken, expiresIn, tokenType }
    const raw: TokenResponse = body.data || body

    if (!raw.accessToken) {
      throw new Error('登录失败：接口未返回有效的 token')
    }

    // 计算过期时间：当前时间 + expiresIn 秒
    const expiresInSeconds = parseInt(raw.expiresIn, 10) || 7200
    const expiresAt = Date.now() + expiresInSeconds * 1000

    return {
      token: raw.accessToken,
      tokenType: raw.tokenType || 'Bearer',
      expiresAt,
      obtainedAt: Date.now(),
    }
  }
}
