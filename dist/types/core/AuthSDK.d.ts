import type { AuthInfo, AuthSDKConfig, AuthSDKInstance, UserInfo } from '../types';
export declare class AuthSDK implements AuthSDKInstance {
    private config;
    private tokenManager;
    private httpClient;
    private storage;
    private loginModal;
    private loadingOverlay;
    /** 当前登录模式的处理器 */
    private modeHandler;
    /** 防止 guard() 被重复调用 */
    private guardPromise;
    constructor(config: AuthSDKConfig);
    /**
     * 根据模式初始化对应的鉴权处理器
     */
    private initModeHandler;
    /**
     * 创建请求客户端并绑定统一的 401 处理。
     * updateConfig() 重建客户端时也必须走这里，避免丢失 onUnauthorized。
     */
    private createHttpClient;
    private getWeWorkRedirectUrl;
    private getWeWorkAppId;
    private createOAuthState;
    private showLoading;
    private hideLoading;
    /**
     * 展示登录 UI
     * 根据 loginUI 配置决定弹窗还是全屏
     * 返回一个 Promise，登录成功后 resolve
     */
    private showLoginUI;
    /**
     * 处理登录逻辑
     * 根据当前模式调用对应的鉴权流程
     */
    private handleLogin;
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
    guard(): Promise<AuthInfo>;
    private _guard;
    /**
     * 处理企微 OAuth 回调
     * URL 中携带 ?code=xxx，调用 login 接口换取用户信息
     */
    private handleWeWorkCallback;
    private startWeWorkAuthorization;
    /**
     * 检查是否已登录（仅检查本地存储，不触发网络请求或登录流程）
     */
    isAuthenticated(): boolean;
    /**
     * 主动触发登录
     */
    login(): Promise<AuthInfo>;
    /**
     * 登出
     * 清除所有本地认证数据
     */
    logout(): void;
    /** 获取当前存储的 token */
    getToken(): string | null;
    /** 获取用户信息（企微模式） */
    getUserInfo(): UserInfo | null;
    /** 获取完整认证信息 */
    getAuthInfo(): AuthInfo | null;
    /**
     * 更新配置
     * 合并到现有配置中，可用于运行时切换后端地址
     */
    updateConfig(config: Partial<AuthSDKConfig>): void;
    /**
     * 带 token 自动注入的 fetch 封装
     * 方便业务方直接使用，无需手动处理 token
     */
    fetch<T = unknown>(url: string, options?: RequestInit): Promise<T>;
}
