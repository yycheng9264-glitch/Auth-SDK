// ============================================================
// utils/url.ts — URL 参数解析工具
//
// 功能：
// 1. 从当前 URL 或指定 URL 中提取查询参数
// 2. 清除 URL 中的指定参数（用于企微模式回调后清理 code）
// 3. 拼接 URL 查询参数
// ============================================================

/**
 * 从 URL 中提取指定查询参数的值
 *
 * @param paramName  参数名
 * @param url        目标 URL，默认使用当前页面 URL
 * @returns          参数值，不存在时返回 null
 *
 * @example
 * // 当前 URL 为 https://example.com?code=abc&state=123
 * getUrlParam('code')      // 返回 'abc'
 * getUrlParam('state')     // 返回 '123'
 * getUrlParam('token')     // 返回 null
 */
export function getUrlParam(paramName: string, url?: string): string | null {
  const targetUrl = url || window.location.href
  const urlObj = new URL(targetUrl)
  return urlObj.searchParams.get(paramName)
}

/**
 * 从 URL 中清除指定查询参数，不刷新页面
 *
 * 用于企微 OAuth 回调后，拿到 code 并完成登录，
 * 需要将 URL 中的 code 参数移除，防止页面刷新后重新进入 code 处理流程。
 *
 * @param paramName  要清除的参数名
 * @param url        目标 URL，默认使用当前页面 URL
 * @returns          清除参数后的新 URL
 */
export function removeUrlParam(paramName: string, url?: string): string {
  const targetUrl = url || window.location.href
  const urlObj = new URL(targetUrl)
  urlObj.searchParams.delete(paramName)
  return urlObj.toString()
}

/**
 * 使用 history.replaceState 清除当前页面 URL 中的指定参数
 * 不刷新页面，不留历史记录
 */
export function cleanUrlParam(paramName: string): void {
  const cleanUrl = removeUrlParam(paramName)
  window.history.replaceState({}, '', cleanUrl)
}

/**
 * 判断当前页面 URL 是否包含企微回调的 code 参数
 * 用于企微模式在页面加载时检测是否为 OAuth 回跳
 */
export function hasCodeParam(): boolean {
  return getUrlParam('code') !== null
}

/**
 * 拼接查询参数到 URL
 *
 * @param baseUrl  基础 URL
 * @param params   参数对象
 * @returns        拼接后的完整 URL
 *
 * @example
 * appendQueryParams('https://api.example.com/login', { appId: 'test', code: 'abc' })
 * // 返回 'https://api.example.com/login?appId=test&code=abc'
 */
export function appendQueryParams(baseUrl: string, params: Record<string, string>): string {
  const urlObj = new URL(baseUrl)
  Object.entries(params).forEach(([key, value]) => {
    urlObj.searchParams.append(key, value)
  })
  return urlObj.toString()
}
