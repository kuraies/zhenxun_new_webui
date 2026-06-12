import type { ChatMessage } from "@/types";

const DB_NAME = "zhenxun-chat-cache";
const DB_VERSION = 1;
const STORE_NAME = "messages";
const DEFAULT_LIMIT = 300;

export interface CachedChatMessage extends ChatMessage {
    conversationKey: string;
    cachedAt: number;
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
            const store = db.objectStoreNames.contains(STORE_NAME)
                ? request.transaction?.objectStore(STORE_NAME)
                : db.createObjectStore(STORE_NAME, { keyPath: "id" });

            if (!store) return;

            if (!store.indexNames.contains("conversationKey")) {
                store.createIndex("conversationKey", "conversationKey", {
                    unique: false,
                });
            }

            if (!store.indexNames.contains("cachedAt")) {
                store.createIndex("cachedAt", "cachedAt", { unique: false });
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

export const getCachedMessages = async (
    conversationKey: string,
    limit = DEFAULT_LIMIT,
) => {
    if (!isIndexedDBAvailable()) return [];

    try {
        const records = await runTransaction<CachedChatMessage[]>(
            "readonly",
            (store) => store.index("conversationKey").getAll(conversationKey),
        );

        return (records ?? [])
            .sort(
                (a, b) =>
                    new Date(a.timestamp).getTime() -
                    new Date(b.timestamp).getTime(),
            )
            .slice(-limit)
            .map(
                ({ conversationKey: _key, cachedAt: _cachedAt, ...message }) =>
                    message,
            );
    } catch (error) {
        console.error("读取聊天缓存失败:", error);
        return [];
    }
};

export const cacheMessage = async (
    conversationKey: string,
    message: ChatMessage,
) => {
    if (!isIndexedDBAvailable()) return;

    try {
        await runTransaction("readwrite", (store) =>
            store.put({
                ...message,
                conversationKey,
                cachedAt: Date.now(),
            } satisfies CachedChatMessage),
        );
    } catch (error) {
        console.error("写入聊天缓存失败:", error);
    }
};

export const removeCachedMessage = async (id: number) => {
    if (!isIndexedDBAvailable()) return;

    try {
        await runTransaction("readwrite", (store) => store.delete(id));
    } catch (error) {
        console.error("删除聊天缓存失败:", error);
    }
};

export const trimCachedMessages = async (
    conversationKey: string,
    limit = DEFAULT_LIMIT,
) => {
    if (!isIndexedDBAvailable()) return;

    try {
        const records = await runTransaction<CachedChatMessage[]>(
            "readonly",
            (store) => store.index("conversationKey").getAll(conversationKey),
        );
        const overflow = (records ?? [])
            .sort(
                (a, b) =>
                    new Date(a.timestamp).getTime() -
                    new Date(b.timestamp).getTime(),
            )
            .slice(0, Math.max(0, (records ?? []).length - limit));

        if (overflow.length === 0) return;

        await runTransaction("readwrite", (store) => {
            overflow.forEach((message) => store.delete(message.id));
        });
    } catch (error) {
        console.error("裁剪聊天缓存失败:", error);
    }
};
