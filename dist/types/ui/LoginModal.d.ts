import type { AuthMode, LoginCredentials, LoginUIStyle } from '../types';
/** 登录模态框配置 */
interface LoginModalConfig {
    mode: AuthMode;
    uiStyle: LoginUIStyle;
    isCallback?: boolean;
    onSubmit: (credentials: LoginCredentials) => Promise<void>;
    onCancel: () => void;
}
export declare class LoginModal {
    private config;
    private container;
    private root;
    private overlay;
    private errorEl;
    private submitBtn;
    private appIdInput;
    private appSecretInput;
    private appSecretGroup;
    private form;
    constructor(config: LoginModalConfig);
    /**
     * 显示登录弹窗
     * 懒创建：第一次调用时才构建 DOM
     */
    show(): void;
    /**
     * 隐藏登录弹窗
     */
    hide(): void;
    /**
     * 销毁登录弹窗，清理 DOM
     */
    destroy(): void;
    /**
     * 构建登录弹窗 DOM
     * 使用 Shadow DOM 隔离样式
     */
    private build;
    /**
     * 构建 Web 模式的登录表单
     * 包含 appId 和 appSecret 两个输入框
     */
    private buildWebForm;
    /**
     * 构建企微模式的登录表单
     * 只包含 appId 输入框
     */
    private buildWeWorkForm;
    /**
     * 缓存 DOM 元素引用，避免后续频繁查询
     */
    private captureElements;
    /**
     * 绑定表单事件
     */
    private bindEvents;
    /**
     * 处理表单提交
     */
    private handleSubmit;
    /**
     * 设置按钮 loading 状态
     */
    private setLoading;
    /**
     * 显示错误提示
     */
    private showError;
    /**
     * 隐藏错误提示
     */
    private hideError;
}
export {};
