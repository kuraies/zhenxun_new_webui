/**
 * 调试页聊天记录的 IndexedDB 缓存
 * 按会话 key（bot 私聊 / group:xxx）分桶存取，刷新页面后恢复
 */

const DB_NAME = "zhenxun-debug-chat";
const DB_VERSION = 1;
const STORE_NAME = "bubbles";
/** 每个会话最多保留的条数 */
const MAX_PER_CONVERSATION = 200;

export interface CachedBubble {
    /** 自增主键（IndexedDB 分配） */
    id?: number;
    conversationKey: string;
    from: "user" | "bot";
    parts: { kind: string; text?: string; src?: string }[];
    time: string;
    ts: number;
}

const isIndexedDBAvailable = () =>
    typeof window !== "undefined" && typeof window.indexedDB !== "undefined";

let dbPromise: Promise<IDBDatabase> | null = null;

const openDatabase = () => {
    if (!isIndexedDBAvailable()) {
        return Promise.reject(new Error("IndexedDB is not available"));
    }

    if (dbPromise) return dbPromise;

    dbPromise = new Promise((resolve, reject) => {
        const request = window.indexedDB.open(DB_NAME, DB_VERSION);

        request.onupgradeneeded = () => {
            const db = request.result;
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                const store = db.createObjectStore(STORE_NAME, {
                    keyPath: "id",
                    autoIncrement: true,
                });
                store.createIndex("conversationKey", "conversationKey", {
                    unique: false,
                });
                store.createIndex("ts", "ts", { unique: false });
            }
        };

        request.onsuccess = () => {
            const db = request.result;
            db.onversionchange = () => db.close();
            resolve(db);
        };

        request.onerror = () => reject(request.error);
    });

    return dbPromise;
};

const runTransaction = async <T>(
    mode: IDBTransactionMode,
    callback: (store: IDBObjectStore) => IDBRequest<T> | void,
) => {
    const db = await openDatabase();

    return new Promise<T | void>((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, mode);
        const store = transaction.objectStore(STORE_NAME);
        const request = callback(store);
        let result: T | undefined;

        if (request) {
            request.onsuccess = () => {
                result = request.result;
            };
            request.onerror = () => reject(request.error);
        }

        transaction.oncomplete = () => resolve(result);
        transaction.onerror = () => reject(transaction.error);
        transaction.onabort = () => reject(transaction.error);
    });
};

/** 读取某个会话的缓存气泡（按时间排序） */
export const getCachedBubbles = async (
    conversationKey: string,
): Promise<CachedBubble[]> => {
    if (!isIndexedDBAvailable()) return [];

    try {
        const records = await runTransaction<CachedBubble[]>(
            "readonly",
            store => store.index("conversationKey").getAll(conversationKey),
        );
        return (records ?? []).sort((a, b) => a.ts - b.ts);
    } catch (error) {
        console.error("读取调试聊天缓存失败:", error);
        return [];
    }
};

/** 写入一条气泡，超过上限时裁掉最旧的 */
export const cacheBubble = async (bubble: CachedBubble) => {
    if (!isIndexedDBAvailable()) return;

    try {
        await runTransaction("readwrite", store => store.put(bubble));

        const records = await runTransaction<CachedBubble[]>(
            "readonly",
            store =>
                store.index("conversationKey").getAll(bubble.conversationKey),
        );
        const sorted = (records ?? []).sort((a, b) => a.ts - b.ts);
        const overflow = sorted.slice(
            0,
            Math.max(0, sorted.length - MAX_PER_CONVERSATION),
        );
        if (overflow.length) {
            await runTransaction("readwrite", store => {
                overflow.forEach(item => {
                    if (item.id !== undefined) store.delete(item.id);
                });
            });
        }
    } catch (error) {
        console.error("写入调试聊天缓存失败:", error);
    }
};

/** 清空某个会话的缓存 */
export const clearCachedBubbles = async (conversationKey: string) => {
    if (!isIndexedDBAvailable()) return;

    try {
        const records = await runTransaction<CachedBubble[]>(
            "readonly",
            store => store.index("conversationKey").getAll(conversationKey),
        );
        await runTransaction("readwrite", store => {
            (records ?? []).forEach(item => {
                if (item.id !== undefined) store.delete(item.id);
            });
        });
    } catch (error) {
        console.error("清空调试聊天缓存失败:", error);
    }
};

/** 删除某个会话的缓存（删群时联动） */
export const removeCachedConversation = clearCachedBubbles;
