// ============================================================
// React 示例 - 业务主页面
//
// 展示 SDK 的常用操作：
// - 获取和显示 token
// - 获取用户信息（企微模式）
// - 退出登录
// - 使用 fetch 封装调用业务接口
// ============================================================

import React, { useState, useEffect } from 'react'
import type { AuthSDKInstance, AuthInfo, UserInfo } from '@team/auth-sdk'

interface AppProps {
  auth: AuthSDKInstance
}

export default function App({ auth }: AppProps) {
  const [authInfo, setAuthInfo] = useState<AuthInfo | null>(null)
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null)

  useEffect(() => {
    // 获取认证信息
    setAuthInfo(auth.getAuthInfo())
    setUserInfo(auth.getUserInfo())
  }, [])

  /** 退出登录 */
  const handleLogout = () => {
    auth.logout()
    window.location.reload()
  }

  /** 使用 SDK 的 fetch 封装调用业务接口 */
  const handleFetchData = async () => {
    try {
      const data = await auth.fetch('/api/business/data')
      alert('请求成功：' + JSON.stringify(data))
    } catch (error) {
      alert('请求失败：' + (error as Error).message)
    }
  }

  return (
    <div style={{ maxWidth: 800, margin: '60px auto', padding: '0 20px', fontFamily: 'sans-serif' }}>
      <h1>业务系统（React）</h1>
      <p>鉴权已通过，以下是业务内容</p>

      {/* Token 信息 */}
      <div style={{ background: '#f5f7fa', borderRadius: 8, padding: 20, margin: '16px 0' }}>
        <h3>Token 信息</h3>
        <pre style={{ background: '#fff', padding: 12, borderRadius: 4 }}>
          {authInfo ? JSON.stringify(authInfo, null, 2) : '（无 token）'}
        </pre>
      </div>

      {/* 用户信息（企微模式） */}
      {userInfo && (
        <div style={{ background: '#f5f7fa', borderRadius: 8, padding: 20, margin: '16px 0' }}>
          <h3>用户信息（企微）</h3>
          <pre style={{ background: '#fff', padding: 12, borderRadius: 4 }}>
            {JSON.stringify(userInfo, null, 2)}
          </pre>
        </div>
      )}

      {/* 操作按钮 */}
      <div style={{ display: 'flex', gap: 12, marginTop: 24 }}>
        <button
          onClick={handleFetchData}
          style={{
            padding: '8px 20px', background: '#1677ff', color: '#fff',
            border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 14,
          }}
        >
          测试请求
        </button>
        <button
          onClick={handleLogout}
          style={{
            padding: '8px 20px', background: '#ff4d4f', color: '#fff',
            border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 14,
          }}
        >
          退出登录
        </button>
      </div>
    </div>
  )
}
