type Callback<T> = (payload: T) => void;

export class EventBus<Events extends Record<string, any>> {
    private events: Map<keyof Events, Callback<any>[]> = new Map();

    // 订阅
    on<K extends keyof Events>(
        eventName: K,
        callback: Callback<Events[K]>,
    ): () => void {
        if (!this.events.has(eventName)) {
            this.events.set(eventName, []);
        }
        this.events.get(eventName)!.push(callback);
        // 返回取消订阅函数
        return () => this.off(eventName, callback);
    }

    // 一次性订阅
    once<K extends keyof Events>(
        eventName: K,
        callback: Callback<Events[K]>,
    ): void {
        const wrapper: Callback<Events[K]> = (payload) => {
            callback(payload);
            this.off(eventName, wrapper);
        };
        this.on(eventName, wrapper);
    }

    // 取消订阅
    off<K extends keyof Events>(
        eventName: K,
        callback: Callback<Events[K]>,
    ): void {
        const cbs = this.events.get(eventName);
        if (!cbs) return;
        this.events.set(
            eventName,
            cbs.filter((cb) => cb !== callback),
        );
    }

    // 发布消息
    emit<K extends keyof Events>(eventName: K, payload?: Events[K]): void {
        const cbs = this.events.get(eventName);
        if (!cbs) return;
        cbs.forEach((cb) => cb(payload));
    }
}

// 全局 EventBus 实例
export const eventBus = new EventBus();
