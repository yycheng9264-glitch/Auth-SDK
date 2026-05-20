import type { ResolvedConfig } from './types';
/**
 * 获取 SDK 默认配置
 *
 * 这里设计为函数而非常量对象，原因：
 * 1. window.location.origin 需要在运行时确定，不能静态定义
 * 2. 每次调用返回新对象，避免引用被意外修改
 */
export declare function getDefaultConfig(): ResolvedConfig;
