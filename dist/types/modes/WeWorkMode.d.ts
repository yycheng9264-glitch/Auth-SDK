import type { AuthInfo, LoginCredentials } from '../types';
export declare class WeWorkMode {
    private authCenterUrl;
    private redirectUrl;
    constructor(httpClient: {
        baseUrl: string;
    }, redirectUrl: string);
    /**
     * 获取企微授权 URL
     * 前端拿到 URL 后需要引导用户完成企微的授权
     *
     * @param appId  应用标识
     * @returns      企微授权 URL
     */
    getOAuthUrl(appId: string): Promise<string>;
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
    login(credentials: LoginCredentials & {
        code?: string;
    }): Promise<AuthInfo>;
}
