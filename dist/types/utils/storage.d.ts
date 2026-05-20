/**
 * 创建带前缀的 storage 操作对象
 * @param prefix  key 前缀，由 config.storagePrefix 传入
 */
export declare function createStorage(prefix: string): {
    /**
     * 存储数据
     * 自动将 value 序列化为 JSON 字符串
     */
    set<T>(key: string, value: T): void;
    /**
     * 读取数据
     * 自动从 JSON 字符串反序列化，解析失败时返回 null
     */
    get<T>(key: string): T | null;
    /**
     * 删除指定 key 的数据
     */
    remove(key: string): void;
    /**
     * 清除所有以当前前缀开头的存储项
     * 用于登出时清理所有 SDK 相关数据
     */
    clear(): void;
};
/** Storage 操作对象的类型 */
export type Storage = ReturnType<typeof createStorage>;
