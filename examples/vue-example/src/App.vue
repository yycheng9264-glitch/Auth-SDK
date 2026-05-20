<!--
  ============================================================
  Vue 示例 - 业务主页面
  ============================================================
-->

<template>
  <div class="container">
    <h1>业务系统（Vue）</h1>
    <p>鉴权已通过，以下是业务内容</p>

    <!-- Token 信息 -->
    <div class="card">
      <h3>Token 信息</h3>
      <pre>{{ authInfo }}</pre>
    </div>

    <!-- 用户信息（企微模式） -->
    <div v-if="userInfo" class="card">
      <h3>用户信息（企微）</h3>
      <pre>{{ userInfo }}</pre>
    </div>

    <!-- 操作按钮 -->
    <div class="actions">
      <button class="btn btn-primary" @click="handleFetch">测试请求</button>
      <button class="btn btn-danger" @click="handleLogout">退出登录</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, inject, onMounted } from 'vue'
import type { AuthSDKInstance, AuthInfo, UserInfo } from '@team/auth-sdk'

const auth = inject<AuthSDKInstance>('auth')!

const authInfo = ref<string>('')
const userInfo = ref<string>('')

onMounted(() => {
  const info = auth!.getAuthInfo()
  authInfo.value = info ? JSON.stringify(info, null, 2) : '（无 token）'

  const user = auth!.getUserInfo()
  userInfo.value = user ? JSON.stringify(user, null, 2) : ''
})

const handleFetch = async () => {
  try {
    const data = await auth!.fetch('/api/business/data')
    alert('请求成功：' + JSON.stringify(data))
  } catch (error) {
    alert('请求失败：' + (error as Error).message)
  }
}

const handleLogout = () => {
  auth!.logout()
  window.location.reload()
}
</script>

<style>
.container {
  max-width: 800px;
  margin: 60px auto;
  padding: 0 20px;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
}
.card {
  background: #f5f7fa;
  border-radius: 8px;
  padding: 20px;
  margin: 16px 0;
}
.card pre {
  background: #fff;
  padding: 12px;
  border-radius: 4px;
  overflow-x: auto;
  font-size: 13px;
}
.actions {
  display: flex;
  gap: 12px;
  margin-top: 24px;
}
.btn {
  padding: 8px 20px;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  color: #fff;
}
.btn-primary { background: #1677ff; }
.btn-primary:hover { background: #4096ff; }
.btn-danger { background: #ff4d4f; }
.btn-danger:hover { background: #ff7875; }
</style>
