import type { AuthInfo } from '../types';
/**
 * 请求拦截器类型：在请求发送前对配置进行修改
 */
type RequestInterceptor = (config: RequestInit) => RequestInit;
/**
 * 响应拦截器类型：对响应数据进行统一处理
 */
type ResponseInterceptor = (response: Response) => Response | Promise<Response>;
export declare class HttpClient {
    private getToken;
    private getAuthInfo;
    /** 鉴权中心基础地址，对外暴露供模式处理器使用 */
    readonly baseUrl: string;
    private timeout;
    /** 请求拦截器列表 */
    private requestInterceptors;
    /** 响应拦截器列表 */
    private responseInterceptors;
    /** 401 回调：通知上层重新登录 */
    onUnauthorized: (() => void) | null;
    constructor(params: {
        getToken: () => string | null;
        getAuthInfo: () => AuthInfo | null;
        baseUrl: string;
        timeout: number;
    });
    /**
     * 发起带鉴权的 HTTP 请求
     * 自动注入 token、处理超时和 401
     */
    request<T = unknown>(url: string, options?: RequestInit): Promise<T>;
    /** 添加请求拦截器 */
    addRequestInterceptor(interceptor: RequestInterceptor): void;
    /** 添加响应拦截器 */
    addResponseInterceptor(interceptor: ResponseInterceptor): void;
}
/**
 * 自定义 HTTP 错误类
 * 包含状态码、错误信息和可选的响应体内容
 */
export declare class HttpError extends Error {
    status: number;
    body: string;
    constructor(status: number, message: string, body?: string);
}
export {};
