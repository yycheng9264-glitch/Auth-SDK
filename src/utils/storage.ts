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
export function createStorage(prefix: string) {
  /**
   * 获取完整的存储 key（前缀 + 原始 key）
   */
  function getFullKey(key: string): string {
    return `${prefix}${key}`
  }

  return {
    /**
     * 存储数据
     * 自动将 value 序列化为 JSON 字符串
     */
    set<T>(key: string, value: T): void {
      try {
        const fullKey = getFullKey(key)
        localStorage.setItem(fullKey, JSON.stringify(value))
      } catch (e) {
        // localStorage 可能因配额不足而抛出异常，静默处理
        console.warn('[auth-sdk] localStorage 写入失败:', e)
      }
    },

    /**
     * 读取数据
     * 自动从 JSON 字符串反序列化，解析失败时返回 null
     */
    get<T>(key: string): T | null {
      try {
        const fullKey = getFullKey(key)
        const raw = localStorage.getItem(fullKey)
        if (raw === null) return null
        return JSON.parse(raw) as T
      } catch (e) {
        // 兼容手动修改或旧版本数据导致的解析失败
        console.warn('[auth-sdk] localStorage 读取解析失败:', e)
        return null
      }
    },

    /**
     * 删除指定 key 的数据
     */
    remove(key: string): void {
      const fullKey = getFullKey(key)
      localStorage.removeItem(fullKey)
    },

    /**
     * 清除所有以当前前缀开头的存储项
     * 用于登出时清理所有 SDK 相关数据
     */
    clear(): void {
      const keysToRemove: string[] = []
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i)
        if (key && key.startsWith(prefix)) {
          keysToRemove.push(key)
        }
      }
      keysToRemove.forEach((key) => localStorage.removeItem(key))
    },
  }
}

/** Storage 操作对象的类型 */
export type Storage = ReturnType<typeof createStorage>
