import type { AuthInfo, UserInfo } from '../types';
import type { Storage } from '../utils/storage';
export declare class TokenManager {
    private storage;
    private tokenExpireBuffer;
    constructor(storage: Storage, tokenExpireBuffer: number);
    /**
     * 保存认证信息到 localStorage
     * 同时存储原始 token 数据和计算后的过期时间
     */
    saveAuthInfo(info: AuthInfo): void;
    /**
     * 从 localStorage 读取认证信息
     * 如果不存在返回 null
     */
    getAuthInfo(): AuthInfo | null;
    /**
     * 获取当前 token 字符串
     * 便捷方法，直接返回 accessToken 值
     */
    getToken(): string | null;
    /**
     * 保存用户信息（企微模式）
     */
    saveUserInfo(userInfo: UserInfo): void;
    /**
     * 获取用户信息
     */
    getUserInfo(): UserInfo | null;
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
    isValid(): boolean;
    /**
     * 清除所有认证数据
     * 登出时调用
     */
    clear(): void;
}
