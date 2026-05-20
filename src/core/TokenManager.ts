// ============================================================
// core/TokenManager.ts — Token 管理器
//
// 职责：
// 1. 将 token 和用户信息持久化到 localStorage
// 2. 从 localStorage 读取并验证 token 有效性
// 3. 计算过期时间并判断是否需要重新登录
// 4. 登出时清除所有认证数据
// ============================================================

import type { AuthInfo, UserInfo } from '../types'
import type { Storage } from '../utils/storage'

export class TokenManager {
  private storage: Storage
  private tokenExpireBuffer: number

  constructor(storage: Storage, tokenExpireBuffer: number) {
    this.storage = storage
    this.tokenExpireBuffer = tokenExpireBuffer
  }

  /**
   * 保存认证信息到 localStorage
   * 同时存储原始 token 数据和计算后的过期时间
   */
  saveAuthInfo(info: AuthInfo): void {
    this.storage.set('token', info)
  }

  /**
   * 从 localStorage 读取认证信息
   * 如果不存在返回 null
   */
  getAuthInfo(): AuthInfo | null {
    return this.storage.get<AuthInfo>('token')
  }

  /**
   * 获取当前 token 字符串
   * 便捷方法，直接返回 accessToken 值
   */
  getToken(): string | null {
    const info = this.getAuthInfo()
    return info ? info.token : null
  }

  /**
   * 保存用户信息（企微模式）
   */
  saveUserInfo(userInfo: UserInfo): void {
    this.storage.set('user_info', userInfo)
  }

  /**
   * 获取用户信息
   */
  getUserInfo(): UserInfo | null {
    return this.storage.get<UserInfo>('user_info')
  }

  /**
   * 判断当前 token 是否有效
   *
   * 判断逻辑：
   * 1. token 存在
   * 2. 当前时间 < 过期时间 - 缓冲期
   *
   * 预留缓冲期的原因是：避免 token 刚好在请求过程中过期，
   * 导致请求因 401 被拒
   */
  isValid(): boolean {
    const info = this.getAuthInfo()
    if (!info || !info.token) return false

    // 如果没有过期时间字段，默认视为有效（兼容旧版本）
    if (!info.expiresAt) return true

    // 计算带缓冲的过期时间点
    const bufferMs = this.tokenExpireBuffer * 1000
    const effectiveExpiry = info.expiresAt - bufferMs

    return Date.now() < effectiveExpiry
  }

  /**
   * 清除所有认证数据
   * 登出时调用
   */
  clear(): void {
    this.storage.clear()
  }
}
