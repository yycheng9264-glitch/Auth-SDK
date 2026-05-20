import type { AuthInfo, LoginCredentials } from '../types';
/**
 * Web 模式的 Http 请求工具
 * 由于获取 token 时还没有 token，所以直接使用原生 fetch
 */
export declare class WebMode {
    private authCenterUrl;
    constructor(httpClient: {
        baseUrl: string;
    });
    /**
     * Web 模式登录
     * 使用 appId + appSecret 换取 token
     *
     * @param credentials  用户在登录页填写的 appId 和 appSecret
     * @returns            AuthInfo 认证信息
     */
    login(credentials: LoginCredentials): Promise<AuthInfo>;
}
