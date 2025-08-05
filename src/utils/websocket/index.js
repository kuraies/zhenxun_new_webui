class WebSocketConnection {
    constructor(url, options = {}) {
        this.url = url;
        this.options = {
            reconnection: true,
            reconnectionAttempts: 5,
            reconnectionDelay: 1000,
            reconnectionDelayMax: 30000,
            heartbeatInterval: 5000,
            ...options
        };

        this.socket = null;
        this.listeners = new Map();
        this.reconnectionAttempts = 0;
        this.heartbeatInterval = null;
        this.pendingMessages = [];
        this.connected = false;
        this.manuallyClosed = false;
        this.reconnectTimer = null;

        this.connect();
    }

    connect() {
        if (this.reconnectTimer) clearTimeout(this.reconnectTimer);

        if (this.socket && [WebSocket.CONNECTING, WebSocket.OPEN].includes(this.socket.readyState)) return;

        this._cleanupSocket();
        this.socket = new WebSocket(this.url);
        this._attachSocketEvents();
    }

    _attachSocketEvents() {
        this.socket.onopen = () => {
            this.connected = true;
            this.reconnectionAttempts = 0;
            this.manuallyClosed = false;
            this.emit('connect');
            this.startHeartbeat();
            this._flushPendingMessages();
        };

        this.socket.onclose = (event) => {
            const reason = event.reason || (this.manuallyClosed ? 'client_disconnect' : 'server_disconnect');
            this.connected = false;
            this.stopHeartbeat();
            this.emit('disconnect', reason);

            if (this.options.reconnection && !this.manuallyClosed) this.reconnect();
        };

        this.socket.onerror = (error) => {
            const isInitialFail = !this.connected && this.reconnectionAttempts === 0;
            this.emit('error', error);
            if (isInitialFail) this.emit('connect_error', error);
        };

        this.socket.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);

                if (data.event === '__disconnect') {
                    this.emit('disconnect', data.data);
                    this.disconnect();
                    return;
                }

                if (data.event) {
                    this.emit(data.event, data.data);
                } else if (data.ackId) {
                    this.emit(data.ackId, data.data);
                } else {
                    this.emit('message', data);
                }
            } catch {
                this.emit('message', event.data);
            }
        };
    }

    _cleanupSocket() {
        if (this.socket) {
            this.socket.onopen = null;
            this.socket.onclose = null;
            this.socket.onerror = null;
            this.socket.onmessage = null;
            this.socket.close();
            this.socket = null;
        }
    }

    _flushPendingMessages() {
        while (this.pendingMessages.length > 0) {
            this.send(this.pendingMessages.shift());
        }
    }

    disconnect() {
        this.manuallyClosed = true;
        this._cleanupSocket();
        if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    }

    reconnect() {
        if (this.manuallyClosed || this.reconnectTimer) return;

        if (this.reconnectionAttempts >= this.options.reconnectionAttempts) {
            this.emit('reconnect_failed');
            return;
        }

        this.reconnectionAttempts++;
        const delay = Math.min(
            this.options.reconnectionDelay * Math.pow(2, this.reconnectionAttempts - 1),
            this.options.reconnectionDelayMax
        );

        this.emit('reconnecting', {
            attempt: this.reconnectionAttempts,
            delay
        });

        this.reconnectTimer = setTimeout(() => {
            this.reconnectTimer = null;
            this.connect();
        }, Math.max(delay, 100));
    }

    startHeartbeat() {
        if (this.options.heartbeatInterval > 0) {
            this.stopHeartbeat();
            this.heartbeatInterval = setInterval(() => {
                this.send({ event: 'ping', justEvent: true });
            }, this.options.heartbeatInterval);
        }
    }

    stopHeartbeat() {
        if (this.heartbeatInterval) {
            clearInterval(this.heartbeatInterval);
            this.heartbeatInterval = null;
        }
    }

    on(event, callback) {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, new Set());
        }
        this.listeners.get(event).add(callback);
    }

    once(event, callback) {
        const wrapper = (data) => {
            this.off(event, wrapper);
            callback(data);
        };
        this.on(event, wrapper);
    }

    off(event, callback) {
        if (this.listeners.has(event)) {
            if (callback) {
                this.listeners.get(event).delete(callback);
            } else {
                this.listeners.delete(event);
            }
        }
    }

    emit(event, data) {
        if (this.listeners.has(event)) {
            this.listeners.get(event).forEach(cb => cb(data));
        }
    }

    /**
     * 新版 send - 对象形式传参
     * @param {object} options - { event: string, data?: any, justEvent?: boolean, ackId?: string }
     */
    send({ event, data = null, justEvent = false, ackId = null }) {
        const isOpen = this.connected && this.socket?.readyState === WebSocket.OPEN;

        let payload;
        if (justEvent) {
            payload = event;
        } else {
            const message = { event, data };
            if (ackId) message.ackId = ackId;
            payload = JSON.stringify(message);
        }

        if (isOpen) {
            try {
                this.socket.send(payload);
            } catch (err) {
                this.emit('error', err);
                this.pendingMessages.push({ event, data, justEvent, ackId });
            }
        } else {
            this.pendingMessages.push({ event, data, justEvent, ackId });
        }
    }

    /**
     * 发送并等待服务器回调确认（ack）
     */
    sendWithAck(event, data, timeout = 5000) {
        return new Promise((resolve, reject) => {
            const ackId = `__ack__${event}_${Date.now()}_${Math.random()}`;
            const timeoutId = setTimeout(() => {
                this.off(ackId, onAck);
                reject(new Error('ack timeout'));
            }, timeout);

            const onAck = (response) => {
                clearTimeout(timeoutId);
                this.off(ackId, onAck);
                resolve(response);
            };

            this.on(ackId, onAck);
            this.send({ event, data, ackId });
        });
    }

    isConnected() {
        return this.connected && this.socket?.readyState === WebSocket.OPEN;
    }

    get readyState() {
        return this.socket?.readyState;
    }
}

class WebSocketClient {
    constructor(url, options = {}) {
        this.baseUrl = this._extractBaseUrl(url);
        this.basePath = this._extractBasePath(url);
        this.options = options;
        this.connections = new Map();
    }

    of(endpoint) {
        if (!this.connections.has(endpoint)) {
            const url = this._buildNamespaceUrl(endpoint);
            const connection = new WebSocketConnection(url, this.options);
            this.connections.set(endpoint, connection);
        }
        return this.connections.get(endpoint);
    }

    disconnect(endpoint) {
        if (this.connections.has(endpoint)) {
            this.connections.get(endpoint).disconnect();
            this.connections.delete(endpoint);
        }
    }

    disconnectAll() {
        for (const conn of this.connections.values()) {
            conn.disconnect();
        }
        this.connections.clear();
    }

    broadcast(event, data) {
        for (const conn of this.connections.values()) {
            conn.send({ event, data });
        }
    }

    _extractBaseUrl(url) {
        const match = url.match(/^(?:wss?:\/\/)?([^\/]+)/);
        return match ? match[1] : '';
    }

    _extractBasePath(url) {
        const match = url.match(/^(?:wss?:\/\/)?[^\/]+(\/[^?]*)/);
        return match ? match[1] : '';
    }

    _buildNamespaceUrl(endpoint) {
        const protocol = this.options.protocol || 'ws';
        const basePath = this.basePath.endsWith('/')
            ? this.basePath.slice(0, -1)
            : this.basePath;
        return `${protocol}://${this.baseUrl}${basePath}/${endpoint}`;
    }
}

/**
 * 创建 WebSocket 客户端
 * @param {string|object} config
 * @param {object} options
 * @returns {WebSocketClient}
 */
export function createWebSocket(config, options = {}) {
    if (typeof config === 'string') {
        return new WebSocketClient(config, options);
    }

    const { protocol = 'ws', host, port = '', path = '' } = config;
    let finalHost = host;
    if (port && !host.includes(':')) {
        finalHost = `${host}:${port}`;
    }

    const url = `${protocol}://${finalHost}${path}`;
    return new WebSocketClient(url, options);
}