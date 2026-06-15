// ============================================================
// ui/styles.ts — 登录 UI 样式定义
//
// 所有样式使用 Shadow DOM 隔离，不会影响宿主页面的样式。
// 采用 flex 居中布局，适配各种屏幕尺寸。
// ============================================================

/** 登录弹窗/页面的完整样式字符串 */
export const loginStyles = `
/* ---- 遮罩层 ---- */
.auth-sdk-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2147483647;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
}

/* ---- 全屏模式 ---- */
.auth-sdk-overlay.fullscreen {
  background: #f5f7fa;
  align-items: flex-start;
  padding-top: 80px;
}

/* ---- 登录卡片 ---- */
.auth-sdk-card {
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.12);
  padding: 40px 36px 32px;
  width: 380px;
  max-width: 90vw;
  box-sizing: border-box;
}

.fullscreen .auth-sdk-card {
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
}

/* ---- 标题 ---- */
.auth-sdk-title {
  text-align: center;
  margin: 0 0 8px 0;
  font-size: 22px;
  font-weight: 600;
  color: #1a1a1a;
}

.auth-sdk-subtitle {
  text-align: center;
  margin: 0 0 28px 0;
  font-size: 14px;
  color: #8c8c8c;
}

/* ---- 表单组 ---- */
.auth-sdk-form-group {
  margin-bottom: 20px;
}

.auth-sdk-label {
  display: block;
  margin-bottom: 6px;
  font-size: 14px;
  font-weight: 500;
  color: #333;
}

.auth-sdk-input {
  width: 100%;
  height: 40px;
  padding: 0 12px;
  border: 1px solid #d9d9d9;
  border-radius: 6px;
  font-size: 14px;
  color: #333;
  outline: none;
  box-sizing: border-box;
  transition: border-color 0.2s, box-shadow 0.2s;
}

.auth-sdk-input:focus {
  border-color: #1677ff;
  box-shadow: 0 0 0 2px rgba(22, 119, 255, 0.15);
}

.auth-sdk-input::placeholder {
  color: #bfbfbf;
}

/* ---- 密码输入框容器 ---- */
.auth-sdk-password-wrapper {
  position: relative;
}

.auth-sdk-toggle-btn {
  position: absolute;
  right: 8px;
  top: 50%;
  transform: translateY(-50%);
  background: none;
  border: none;
  cursor: pointer;
  color: #8c8c8c;
  font-size: 13px;
  padding: 4px 6px;
}

.auth-sdk-toggle-btn:hover {
  color: #1677ff;
}

/* ---- 错误提示 ---- */
.auth-sdk-error {
  margin-bottom: 16px;
  padding: 8px 12px;
  background: #fff2f0;
  border: 1px solid #ffccc7;
  border-radius: 6px;
  color: #ff4d4f;
  font-size: 13px;
  line-height: 1.4;
  display: none;
}

.auth-sdk-error.visible {
  display: block;
}

/* ---- 提交按钮 ---- */
.auth-sdk-submit-btn {
  width: 100%;
  height: 42px;
  background: #1677ff;
  color: #fff;
  border: none;
  border-radius: 6px;
  font-size: 15px;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.auth-sdk-submit-btn:hover {
  background: #4096ff;
}

.auth-sdk-submit-btn:active {
  background: #0958d9;
}

.auth-sdk-submit-btn:disabled {
  background: #a0c4ff;
  cursor: not-allowed;
}

/* ---- 加载中状态 ---- */
.auth-sdk-spinner {
  display: inline-block;
  width: 16px;
  height: 16px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top-color: #fff;
  border-radius: 50%;
  animation: auth-sdk-spin 0.6s linear infinite;
}

.auth-sdk-loading-card {
  text-align: center;
}

.auth-sdk-loading-spinner {
  width: 34px;
  height: 34px;
  margin: 0 auto 20px;
  border: 3px solid rgba(22, 119, 255, 0.18);
  border-top-color: #1677ff;
  border-radius: 50%;
  animation: auth-sdk-spin 0.7s linear infinite;
}

@keyframes auth-sdk-spin {
  to { transform: rotate(360deg); }
}
`;
