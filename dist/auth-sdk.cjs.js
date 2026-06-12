'use strict';

/******************************************************************************
Copyright (c) Microsoft Corporation.

Permission to use, copy, modify, and/or distribute this software for any
purpose with or without fee is hereby granted.

THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH
REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF MERCHANTABILITY
AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY SPECIAL, DIRECT,
INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES WHATSOEVER RESULTING FROM
LOSS OF USE, DATA OR PROFITS, WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE OR
OTHER TORTIOUS ACTION, ARISING OUT OF OR IN CONNECTION WITH THE USE OR
PERFORMANCE OF THIS SOFTWARE.
***************************************************************************** */
/* global Reflect, Promise, SuppressedError, Symbol, Iterator */


function __awaiter(thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
}

typeof SuppressedError === "function" ? SuppressedError : function (error, suppressed, message) {
    var e = new Error(message);
    return e.name = "SuppressedError", e.error = error, e.suppressed = suppressed, e;
};

// ============================================================
// config.ts — SDK 默认配置
//
// 集中管理所有可配置项，包括鉴权中心地址、存储前缀、超时等。
// 业务方初始化时传入的配置会与默认配置合并。
//
// 配置优先级：内置默认值 < createAuthSDK() 入参 < updateConfig()
// ============================================================
/**
 * 获取 SDK 默认配置
 *
 * 这里设计为函数而非常量对象，原因：
 * 1. window.location.origin 需要在运行时确定，不能静态定义
 * 2. 每次调用返回新对象，避免引用被意外修改
 */
function getDefaultConfig() {
    return {
        // ---- 必填项（业务方需在初始化时传入，此处给空字符串占位） ----
        mode: 'web',
        authCenterUrl: '',
        // ---- 可选项（有合理默认值） ----
        redirect: typeof window !== 'undefined' ? window.location.origin : '',
        storagePrefix: 'auth_sdk_',
        loginUI: 'fullscreen',
        requestTimeout: 15000,
        tokenExpireBuffer: 60,
        retryOnAuthFail: true,
        onLogin: () => { },
        onLogout: () => { },
        // ---- SDK 内部存储 key（基于 storagePrefix 动态生成，一般无需修改） ----
        tokenStorageKey: 'token',
        userInfoStorageKey: 'user_info',
        refreshUrl: '/auth-center/openapi/auth/refresh',
    };
}

// ============================================================
// core/TokenManager.ts — Token 管理器
//
// 职责：
// 1. 将 token 和用户信息持久化到 localStorage
// 2. 从 localStorage 读取并验证 token 有效性
// 3. 计算过期时间并判断是否需要重新登录
// 4. 登出时清除所有认证数据
// ============================================================
class TokenManager {
    constructor(storage, tokenExpireBuffer) {
        this.storage = storage;
        this.tokenExpireBuffer = tokenExpireBuffer;
    }
    /**
     * 保存认证信息到 localStorage
     * 同时存储原始 token 数据和计算后的过期时间
     */
    saveAuthInfo(info) {
        this.storage.set('token', info);
    }
    /**
     * 从 localStorage 读取认证信息
     * 如果不存在返回 null
     */
    getAuthInfo() {
        return this.storage.get('token');
    }
    /**
     * 获取当前 token 字符串
     * 便捷方法，直接返回 accessToken 值
     */
    getToken() {
        const info = this.getAuthInfo();
        return info ? info.token : null;
    }
    /**
     * 保存用户信息（企微模式）
     */
    saveUserInfo(userInfo) {
        this.storage.set('user_info', userInfo);
    }
    /**
     * 获取用户信息
     */
    getUserInfo() {
        return this.storage.get('user_info');
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
    isValid() {
        const info = this.getAuthInfo();
        if (!info || !info.token)
            return false;
        // 如果没有过期时间字段，默认视为有效（兼容旧版本）
        if (!info.expiresAt)
            return true;
        // 计算带缓冲的过期时间点
        const bufferMs = this.tokenExpireBuffer * 1000;
        const effectiveExpiry = info.expiresAt - bufferMs;
        return Date.now() < effectiveExpiry;
    }
    /**
     * 清除所有认证数据
     * 登出时调用
     */
    clear() {
        this.storage.clear();
    }
}

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
class HttpClient {
    constructor(params) {
        /** 请求拦截器列表 */
        this.requestInterceptors = [];
        /** 响应拦截器列表 */
        this.responseInterceptors = [];
        /** 401 回调：通知上层重新登录 */
        this.onUnauthorized = null;
        this.getToken = params.getToken;
        this.getAuthInfo = params.getAuthInfo;
        this.baseUrl = params.baseUrl;
        this.timeout = params.timeout;
    }
    /**
     * 发起带鉴权的 HTTP 请求
     * 自动注入 token、处理超时和 401
     */
    request(url_1) {
        return __awaiter(this, arguments, void 0, function* (url, options = {}) {
            // 构建完整 URL
            const fullUrl = url.startsWith('http') ? url : `${this.baseUrl}${url}`;
            // ---- 自动注入 Authorization 头 ----
            const headers = Object.assign({ 'Content-Type': 'application/json' }, (options.headers || {}));
            const token = this.getToken();
            if (token) {
                headers['Authorization'] = `Bearer ${token}`;
            }
            let config = Object.assign(Object.assign({}, options), { headers });
            // 执行请求拦截器
            for (const interceptor of this.requestInterceptors) {
                config = interceptor(config);
            }
            // ---- 发起请求（含超时控制） ----
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), this.timeout);
            try {
                let response = yield fetch(fullUrl, Object.assign(Object.assign({}, config), { signal: controller.signal }));
                // 执行响应拦截器
                for (const interceptor of this.responseInterceptors) {
                    response = yield interceptor(response);
                }
                // ---- 处理 401 未授权 ----
                if (response.status === 401) {
                    if (this.onUnauthorized) {
                        this.onUnauthorized();
                    }
                    throw new HttpError(response.status, '登录已过期，请重新登录');
                }
                // ---- 处理非 2xx 状态码 ----
                if (!response.ok) {
                    const errorBody = yield response.text().catch(() => '');
                    throw new HttpError(response.status, `请求失败: ${response.statusText}`, errorBody);
                }
                // ---- 解析响应体 ----
                // 有些接口可能返回空 body（204 等），安全处理
                const text = yield response.text();
                if (!text)
                    return undefined;
                return JSON.parse(text);
            }
            catch (error) {
                if (error instanceof HttpError)
                    throw error;
                if (error.name === 'AbortError') {
                    throw new HttpError(0, '请求超时');
                }
                throw new HttpError(0, '网络请求失败', error.message);
            }
            finally {
                clearTimeout(timeoutId);
            }
        });
    }
    /** 添加请求拦截器 */
    addRequestInterceptor(interceptor) {
        this.requestInterceptors.push(interceptor);
    }
    /** 添加响应拦截器 */
    addResponseInterceptor(interceptor) {
        this.responseInterceptors.push(interceptor);
    }
}
/**
 * 自定义 HTTP 错误类
 * 包含状态码、错误信息和可选的响应体内容
 */
class HttpError extends Error {
    constructor(status, message, body = '') {
        super(message);
        this.name = 'HttpError';
        this.status = status;
        this.body = body;
    }
}

// ============================================================
// utils/storage.ts — localStorage 封装
//
// 功能：
// 1. 自动添加 key 前缀，避免多应用共存时 key 冲突
// 2. JSON 序列化/反序列化，支持存储对象类型
// 3. 异常安全，解析失败时返回 null
// ============================================================
/**
 * 创建带前缀的 storage 操作对象
 * @param prefix  key 前缀，由 config.storagePrefix 传入
 */
function createStorage(prefix) {
    /**
     * 获取完整的存储 key（前缀 + 原始 key）
     */
    function getFullKey(key) {
        return `${prefix}${key}`;
    }
    return {
        /**
         * 存储数据
         * 自动将 value 序列化为 JSON 字符串
         */
        set(key, value) {
            try {
                const fullKey = getFullKey(key);
                localStorage.setItem(fullKey, JSON.stringify(value));
            }
            catch (e) {
                // localStorage 可能因配额不足而抛出异常，静默处理
                console.warn('[auth-sdk] localStorage 写入失败:', e);
            }
        },
        /**
         * 读取数据
         * 自动从 JSON 字符串反序列化，解析失败时返回 null
         */
        get(key) {
            try {
                const fullKey = getFullKey(key);
                const raw = localStorage.getItem(fullKey);
                if (raw === null)
                    return null;
                return JSON.parse(raw);
            }
            catch (e) {
                // 兼容手动修改或旧版本数据导致的解析失败
                console.warn('[auth-sdk] localStorage 读取解析失败:', e);
                return null;
            }
        },
        /**
         * 删除指定 key 的数据
         */
        remove(key) {
            const fullKey = getFullKey(key);
            localStorage.removeItem(fullKey);
        },
        /**
         * 清除所有以当前前缀开头的存储项
         * 用于登出时清理所有 SDK 相关数据
         */
        clear() {
            const keysToRemove = [];
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key && key.startsWith(prefix)) {
                    keysToRemove.push(key);
                }
            }
            keysToRemove.forEach((key) => localStorage.removeItem(key));
        },
    };
}

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
function getUrlParam(paramName, url) {
    const targetUrl = window.location.href;
    const urlObj = new URL(targetUrl);
    return urlObj.searchParams.get(paramName);
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
function removeUrlParam(paramName, url) {
    const targetUrl = window.location.href;
    const urlObj = new URL(targetUrl);
    urlObj.searchParams.delete(paramName);
    return urlObj.toString();
}
/**
 * 使用 history.replaceState 清除当前页面 URL 中的指定参数
 * 不刷新页面，不留历史记录
 */
function cleanUrlParam(paramName) {
    const cleanUrl = removeUrlParam(paramName);
    window.history.replaceState({}, '', cleanUrl);
}
/**
 * 判断当前页面 URL 是否包含企微回调的 code 参数
 * 用于企微模式在页面加载时检测是否为 OAuth 回跳
 */
function hasCodeParam() {
    return getUrlParam('code') !== null;
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
function appendQueryParams(baseUrl, params) {
    const urlObj = new URL(baseUrl);
    Object.entries(params).forEach(([key, value]) => {
        urlObj.searchParams.append(key, value);
    });
    return urlObj.toString();
}

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
/**
 * Web 模式的 Http 请求工具
 * 由于获取 token 时还没有 token，所以直接使用原生 fetch
 */
class WebMode {
    constructor(httpClient) {
        this.authCenterUrl = httpClient.baseUrl;
    }
    /**
     * Web 模式登录
     * 使用 appId + appSecret 换取 token
     *
     * @param credentials  用户在登录页填写的 appId 和 appSecret
     * @returns            AuthInfo 认证信息
     */
    login(credentials) {
        return __awaiter(this, void 0, void 0, function* () {
            const { appId, appSecret } = credentials;
            // 校验必填字段
            if (!appId || !appSecret) {
                throw new Error('请输入 App ID 和 App Secret');
            }
            const url = `${this.authCenterUrl}/auth-center/openapi/auth/token`;
            let response;
            try {
                response = yield fetch(url, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ appId, appSecret }),
                });
            }
            catch (error) {
                throw new HttpError(0, '网络连接失败，请检查网络', error.message);
            }
            if (!response.ok) {
                const errorText = yield response.text().catch(() => '');
                throw new HttpError(response.status, `登录失败 (${response.status})`, errorText);
            }
            // 解析响应
            const body = yield response.json();
            // 处理通用响应包装：后端可能返回 { code, success, data: { accessToken, ... } }
            // 也可能直接返回 { accessToken, expiresIn, tokenType }
            const raw = body.data || body;
            if (!raw.accessToken) {
                throw new Error('登录失败：接口未返回有效的 token');
            }
            // 计算过期时间：当前时间 + expiresIn 秒
            const expiresInSeconds = parseInt(raw.expiresIn, 10) || 7200;
            const expiresAt = Date.now() + expiresInSeconds * 1000;
            return {
                token: raw.accessToken,
                tokenType: raw.tokenType || 'Bearer',
                expiresAt,
                obtainedAt: Date.now(),
            };
        });
    }
}

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
class WeWorkMode {
    constructor(httpClient, redirectUrl) {
        this.authCenterUrl = httpClient.baseUrl;
        this.redirectUrl = redirectUrl;
    }
    /**
     * 获取企微授权 URL
     * 前端拿到 URL 后需要引导用户完成企微的授权
     *
     * @param appId  应用标识
     * @returns      企微授权 URL
     */
    getOAuthUrl(appId) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!appId) {
                throw new Error('请输入 App ID');
            }
            const url = `${this.authCenterUrl}/auth-center/api/thirdparty/auth/oauth-url`;
            // 拼接查询参数
            const fullUrl = appendQueryParams(url, {
                appId,
                redirect: this.redirectUrl,
            });
            let response;
            try {
                response = yield fetch(fullUrl, {
                    method: 'GET',
                    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                });
            }
            catch (error) {
                throw new HttpError(0, '网络连接失败，请检查网络', error.message);
            }
            if (!response.ok) {
                throw new HttpError(response.status, '获取企微授权地址失败', yield response.text().catch(() => ''));
            }
            const result = yield response.json();
            if (!result.data) {
                throw new Error('获取企微授权地址失败：接口未返回有效的 URL');
            }
            return result.data;
        });
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
    login(credentials) {
        return __awaiter(this, void 0, void 0, function* () {
            const { appId, code } = credentials;
            if (!appId) {
                throw new Error('请输入 App ID');
            }
            // 如果没有 code，说明是需要获取 OAuth URL 并跳转
            // 这种情况不应该走到 login，由外部逻辑处理
            if (!code) {
                throw new Error('缺少企微授权 code');
            }
            // 用 code 换取用户信息
            const url = `${this.authCenterUrl}/auth-center/api/thirdparty/auth/login`;
            const fullUrl = appendQueryParams(url, { appId, code });
            let response;
            try {
                response = yield fetch(fullUrl, {
                    method: 'GET',
                    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                });
            }
            catch (error) {
                throw new HttpError(0, '网络连接失败，请检查网络', error.message);
            }
            if (!response.ok) {
                throw new HttpError(response.status, '企微登录失败', yield response.text().catch(() => ''));
            }
            const userInfo = yield response.json();
            if (!userInfo.userId) {
                throw new Error('企微登录失败：未获取到用户信息');
            }
            // 企微模式没有 token，使用用户 ID 构造一个标识 token
            // 后续如果需要调用业务接口，业务方自行决定鉴权方式
            const sessionToken = `wework_${userInfo.userId}_${Date.now()}`;
            const expiresAt = Date.now() + 8 * 60 * 60 * 1000; // 默认 8 小时有效
            return {
                token: sessionToken,
                tokenType: 'Bearer',
                expiresAt,
                userInfo,
                obtainedAt: Date.now(),
            };
        });
    }
}

// ============================================================
// ui/styles.ts — 登录 UI 样式定义
//
// 所有样式使用 Shadow DOM 隔离，不会影响宿主页面的样式。
// 采用 flex 居中布局，适配各种屏幕尺寸。
// ============================================================
/** 登录弹窗/页面的完整样式字符串 */
const loginStyles = `
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

@keyframes auth-sdk-spin {
  to { transform: rotate(360deg); }
}
`;

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
class LoginModal {
    constructor(config) {
        this.container = null;
        this.root = null;
        this.config = config;
    }
    /**
     * 显示登录弹窗
     * 懒创建：第一次调用时才构建 DOM
     */
    show() {
        if (this.container) {
            this.container.style.display = '';
            return;
        }
        this.build();
    }
    /**
     * 隐藏登录弹窗
     */
    hide() {
        if (this.container) {
            this.container.style.display = 'none';
        }
    }
    /**
     * 销毁登录弹窗，清理 DOM
     */
    destroy() {
        if (this.container && this.container.parentNode) {
            this.container.parentNode.removeChild(this.container);
        }
        this.container = null;
        this.root = null;
    }
    /**
     * 构建登录弹窗 DOM
     * 使用 Shadow DOM 隔离样式
     */
    build() {
        // 创建容器并附加 Shadow DOM
        this.container = document.createElement('div');
        this.root = this.container.attachShadow({ mode: 'closed' });
        // 注入样式
        const styleEl = document.createElement('style');
        styleEl.textContent = loginStyles;
        this.root.appendChild(styleEl);
        // 根据模式构建不同的表单内容
        if (this.config.mode === 'web') {
            this.buildWebForm();
        }
        else {
            this.buildWeWorkForm();
        }
        // 绑定全局事件
        this.bindEvents();
        // 挂载到页面
        document.body.appendChild(this.container);
    }
    /**
     * 构建 Web 模式的登录表单
     * 包含 appId 和 appSecret 两个输入框
     */
    buildWebForm() {
        const modeClass = this.config.uiStyle === 'fullscreen' ? 'fullscreen' : '';
        // 表单标题：根据是否回调模式显示不同文案
        const title = this.config.isCallback ? '请输入 App ID 完成登录' : '登录认证';
        const subtitle = this.config.isCallback
            ? '企微授权已回调，请输入您的 App ID'
            : '请输入 App ID 和 App Secret';
        this.root.innerHTML += `
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
    `;
        // 获取 DOM 引用
        this.captureElements();
    }
    /**
     * 构建企微模式的登录表单
     * 只包含 appId 输入框
     */
    buildWeWorkForm() {
        const modeClass = this.config.uiStyle === 'fullscreen' ? 'fullscreen' : '';
        const title = this.config.isCallback
            ? '请输入 App ID 完成登录'
            : '企微授权登录';
        const subtitle = this.config.isCallback
            ? '企微授权已回调，请输入您的 App ID'
            : '点击下方按钮跳转企微进行授权';
        this.root.innerHTML += `
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
    `;
        this.captureElements();
    }
    /**
     * 缓存 DOM 元素引用，避免后续频繁查询
     */
    captureElements() {
        const root = this.root;
        this.overlay = root.querySelector('.auth-sdk-overlay');
        this.errorEl = root.querySelector('#errorMsg');
        this.submitBtn = root.querySelector('#submitBtn');
        this.appIdInput = root.querySelector('#appId');
        this.form = root.querySelector('#loginForm');
        // Web 模式特有的密码输入框
        this.appSecretInput = root.querySelector('#appSecret');
        this.appSecretGroup = root.querySelector('.auth-sdk-password-wrapper');
        // 绑定密码可见性切换
        const toggleBtn = root.querySelector('#toggleSecret');
        if (toggleBtn && this.appSecretInput) {
            toggleBtn.addEventListener('click', () => {
                const isPassword = this.appSecretInput.type === 'password';
                this.appSecretInput.type = isPassword ? 'text' : 'password';
                toggleBtn.textContent = isPassword ? '隐藏' : '显示';
            });
        }
        // 自动聚焦到第一个输入框
        setTimeout(() => this.appIdInput.focus(), 100);
    }
    /**
     * 绑定表单事件
     */
    bindEvents() {
        // 表单提交
        this.form.addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleSubmit();
        });
        // 登录弹窗不允许点击遮罩关闭，防止用户跳过鉴权
    }
    /**
     * 处理表单提交
     */
    handleSubmit() {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b;
            const appId = this.appIdInput.value.trim();
            const appSecret = (_a = this.appSecretInput) === null || _a === void 0 ? void 0 : _a.value.trim();
            // 前端校验
            if (!appId) {
                this.showError('请输入 App ID');
                this.appIdInput.focus();
                return;
            }
            if (this.config.mode === 'web' && !appSecret) {
                this.showError('请输入 App Secret');
                (_b = this.appSecretInput) === null || _b === void 0 ? void 0 : _b.focus();
                return;
            }
            // 进入 loading 状态
            this.setLoading(true);
            this.hideError();
            try {
                yield this.config.onSubmit({ appId, appSecret });
                // 登录成功后由 AuthSDK 调用 hide()
            }
            catch (error) {
                // 显示后端返回的错误信息
                const message = error instanceof Error ? error.message : '登录失败，请重试';
                this.showError(message);
                this.setLoading(false);
            }
        });
    }
    /**
     * 设置按钮 loading 状态
     */
    setLoading(loading) {
        if (loading) {
            this.submitBtn.disabled = true;
            this.submitBtn.innerHTML = '<span class="auth-sdk-spinner"></span> 登录中...';
        }
        else {
            this.submitBtn.disabled = false;
            this.submitBtn.textContent = '登 录';
        }
    }
    /**
     * 显示错误提示
     */
    showError(message) {
        this.errorEl.textContent = message;
        this.errorEl.classList.add('visible');
    }
    /**
     * 隐藏错误提示
     */
    hideError() {
        this.errorEl.textContent = '';
        this.errorEl.classList.remove('visible');
    }
}

// ============================================================
// core/AuthSDK.ts — SDK 主类
//
// 这是整个 SDK 的核心编排器，负责：
// 1. 整合 TokenManager、HttpClient 和各鉴权模式
// 2. 提供 guard() 鉴权守卫，业务方只需调用此方法
// 3. 管理登录页面的展示和销毁
// 4. 协调 Web 模式和企微模式的不同流程
// ============================================================
class AuthSDK {
    constructor(config) {
        this.loginModal = null;
        /** 当前登录模式的处理器 */
        this.modeHandler = null;
        /** 防止 guard() 被重复调用 */
        this.guardPromise = null;
        // 合并默认配置
        this.config = Object.assign(Object.assign({}, getDefaultConfig()), config);
        this.storage = createStorage(this.config.storagePrefix);
        this.tokenManager = new TokenManager(this.storage, this.config.tokenExpireBuffer);
        this.httpClient = this.createHttpClient();
        // 初始化对应模式的处理器
        this.initModeHandler();
    }
    /**
     * 根据模式初始化对应的鉴权处理器
     */
    initModeHandler() {
        if (this.config.mode === 'web') {
            this.modeHandler = new WebMode(this.httpClient);
        }
        else if (this.config.mode === 'wework') {
            this.modeHandler = new WeWorkMode(this.httpClient, this.config.redirect);
        }
    }
    /**
     * 创建请求客户端并绑定统一的 401 处理。
     * updateConfig() 重建客户端时也必须走这里，避免丢失 onUnauthorized。
     */
    createHttpClient() {
        const client = new HttpClient({
            getToken: () => this.tokenManager.getToken(),
            getAuthInfo: () => this.tokenManager.getAuthInfo(),
            baseUrl: this.config.authCenterUrl,
            timeout: this.config.requestTimeout,
        });
        client.onUnauthorized = () => {
            this.guardPromise = null;
            this.tokenManager.clear();
            void this.showLoginUI().catch(() => { });
        };
        return client;
    }
    /**
     * 展示登录 UI
     * 根据 loginUI 配置决定弹窗还是全屏
     * 返回一个 Promise，登录成功后 resolve
     */
    showLoginUI() {
        return new Promise((resolve, reject) => {
            // 如果已有登录弹窗实例则复用
            if (!this.loginModal) {
                this.loginModal = new LoginModal({
                    mode: this.config.mode,
                    uiStyle: this.config.loginUI,
                    onSubmit: (credentials) => __awaiter(this, void 0, void 0, function* () {
                        var _a;
                        try {
                            const info = yield this.handleLogin(credentials);
                            (_a = this.loginModal) === null || _a === void 0 ? void 0 : _a.hide();
                            this.config.onLogin(info);
                            resolve(info);
                        }
                        catch (error) {
                            // 登录失败由 UI 层显示错误，不 reject（让用户可以重新输入）
                            throw error;
                        }
                    }),
                    onCancel: () => {
                        reject(new Error('用户取消登录'));
                    },
                });
            }
            this.loginModal.show();
        });
    }
    /**
     * 处理登录逻辑
     * 根据当前模式调用对应的鉴权流程
     */
    handleLogin(credentials) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.modeHandler) {
                throw new Error('未初始化鉴权模式处理器');
            }
            const authInfo = yield this.modeHandler.login(credentials);
            // 保存认证信息
            this.tokenManager.saveAuthInfo(authInfo);
            // 如果是企微模式且有用户信息，额外保存
            if (authInfo.userInfo) {
                this.tokenManager.saveUserInfo(authInfo.userInfo);
            }
            return authInfo;
        });
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
    guard() {
        return __awaiter(this, void 0, void 0, function* () {
            // 防止重复调用导致多个登录弹窗
            if (this.guardPromise)
                return this.guardPromise;
            this.guardPromise = this._guard().catch((error) => {
                this.guardPromise = null;
                throw error;
            });
            return this.guardPromise;
        });
    }
    _guard() {
        return __awaiter(this, void 0, void 0, function* () {
            // ---- 检查是否已登录 ----
            if (this.tokenManager.isValid()) {
                const info = this.tokenManager.getAuthInfo();
                if (info)
                    return info;
            }
            // ---- 企微模式特殊处理：检测 OAuth 回跳 ----
            if (this.config.mode === 'wework' && hasCodeParam()) {
                return this.handleWeWorkCallback();
            }
            // ---- 未登录，弹出登录页面 ----
            return this.showLoginUI();
        });
    }
    /**
     * 处理企微 OAuth 回调
     * URL 中携带 ?code=xxx，调用 login 接口换取用户信息
     */
    handleWeWorkCallback() {
        return __awaiter(this, void 0, void 0, function* () {
            const code = getUrlParam('code');
            if (!code) {
                // 没有 code 但仍进入了此方法，回退到弹出登录页
                return this.showLoginUI();
            }
            // 企微回调场景：需要用户先输入 appId
            // 因为 code 是企微返回的临时授权码，需要结合 appId 才能换取用户信息
            return new Promise((resolve, reject) => {
                if (!this.loginModal) {
                    this.loginModal = new LoginModal({
                        mode: this.config.mode,
                        uiStyle: this.config.loginUI,
                        isCallback: true, // 标记为回调模式，UI 给出对应的提示文案
                        onSubmit: (credentials) => __awaiter(this, void 0, void 0, function* () {
                            var _a;
                            try {
                                const info = yield this.modeHandler.login(Object.assign(Object.assign({}, credentials), { 
                                    // 把 code 传给登录处理器
                                    code }));
                                this.tokenManager.saveAuthInfo(info);
                                if (info.userInfo) {
                                    this.tokenManager.saveUserInfo(info.userInfo);
                                }
                                // 清除 URL 中的 code，防止刷新后重复处理
                                cleanUrlParam('code');
                                (_a = this.loginModal) === null || _a === void 0 ? void 0 : _a.hide();
                                this.config.onLogin(info);
                                resolve(info);
                            }
                            catch (error) {
                                throw error;
                            }
                        }),
                        onCancel: () => {
                            // 用户取消，清除 code 防止死循环
                            cleanUrlParam('code');
                            reject(new Error('用户取消登录'));
                        },
                    });
                }
                this.loginModal.show();
            });
        });
    }
    /**
     * 检查是否已登录（仅检查本地存储，不触发网络请求或登录流程）
     */
    isAuthenticated() {
        return this.tokenManager.isValid();
    }
    /**
     * 主动触发登录
     */
    login() {
        return __awaiter(this, void 0, void 0, function* () {
            return this.showLoginUI();
        });
    }
    /**
     * 登出
     * 清除所有本地认证数据
     */
    logout() {
        this.guardPromise = null;
        this.tokenManager.clear();
        this.config.onLogout();
    }
    /** 获取当前存储的 token */
    getToken() {
        return this.tokenManager.getToken();
    }
    /** 获取用户信息（企微模式） */
    getUserInfo() {
        return this.tokenManager.getUserInfo();
    }
    /** 获取完整认证信息 */
    getAuthInfo() {
        return this.tokenManager.getAuthInfo();
    }
    /**
     * 更新配置
     * 合并到现有配置中，可用于运行时切换后端地址
     */
    updateConfig(config) {
        const previous = {
            authCenterUrl: this.config.authCenterUrl,
            requestTimeout: this.config.requestTimeout,
            mode: this.config.mode,
            redirect: this.config.redirect,
            loginUI: this.config.loginUI,
        };
        Object.assign(this.config, config);
        const shouldRecreateHttpClient = (config.authCenterUrl !== undefined &&
            config.authCenterUrl !== previous.authCenterUrl) ||
            (config.requestTimeout !== undefined &&
                config.requestTimeout !== previous.requestTimeout);
        const shouldReinitModeHandler = shouldRecreateHttpClient ||
            (config.mode !== undefined && config.mode !== previous.mode) ||
            (config.redirect !== undefined && config.redirect !== previous.redirect);
        if (shouldRecreateHttpClient) {
            this.httpClient = this.createHttpClient();
        }
        if (shouldReinitModeHandler) {
            this.initModeHandler();
        }
        if (shouldRecreateHttpClient ||
            shouldReinitModeHandler ||
            (config.loginUI !== undefined && config.loginUI !== previous.loginUI)) {
            this.guardPromise = null;
            this.loginModal = null;
        }
    }
    /**
     * 带 token 自动注入的 fetch 封装
     * 方便业务方直接使用，无需手动处理 token
     */
    fetch(url, options) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.httpClient.request(url, options);
        });
    }
}

// ============================================================
// index.ts — SDK 主入口
//
// 导出内容：
// - createAuthSDK()  : 创建 SDK 实例（核心入口）
// - AuthSDKInstance  : 实例类型
// - AuthSDKConfig    : 配置类型
// - 其他公共类型
//
// UMD 模式下通过 window.AuthSDK 访问：
//   const auth = AuthSDK.create({ ... })
// ============================================================
/**
 * 创建鉴权 SDK 实例
 *
 * 这是 SDK 的唯一入口函数，业务方通过此函数获取鉴权实例。
 *
 * @param config  鉴权配置
 * @returns       AuthSDK 实例
 *
 * @example
 * // Web 模式
 * const auth = createAuthSDK({
 *   mode: 'web',
 *   authCenterUrl: 'https://auth-center.example.com',
 * })
 *
 * // 企微模式
 * const auth = createAuthSDK({
 *   mode: 'wework',
 *   authCenterUrl: 'https://auth-center.example.com',
 * })
 *
 * // 在应用入口使用
 * auth.guard().then(() => {
 *   createApp(App).mount('#app')
 * })
 */
function createAuthSDK(config) {
    return new AuthSDK(config);
}
// ============================================================
// UMD 全局变量支持
// 当通过 <script> 标签引入时，通过 window.AuthSDK 访问
// ============================================================
if (typeof window !== 'undefined') {
    window.AuthSDK = {
        create: createAuthSDK,
    };
}

exports.createAuthSDK = createAuthSDK;
//# sourceMappingURL=auth-sdk.cjs.js.map
