import { useWebSocketStore } from '@/store/websocket.js'

const socketStore = useWebSocketStore()

const system_status = {
    name:'system_status',
    init(store) {
        const socketManager =socketStore.socketManger
        // 系统状态命名空间
        const statusSocket = socketManager.of(this.name)
        statusSocket.on('message', (data) => {
            // console.log(data)
            store.addMessage(this.name,data)
            localStorage.setItem("system_status", JSON.stringify(data));
        })
        statusSocket.on('disconnect', () => {
            console.log("断开连接")
            // store.addMessage(this.name,data)
        })
        statusSocket.on('error', (data) => {
            // console.log("发生错误",data)
            // store.addMessage(this.name,data)
        })
        statusSocket.on('reconnecting', (data) => {

            console.log(data)
            // store.addMessage(this.name,data)
        })
        statusSocket.on('reconnect_failed', (data) => {

            console.log("重连失败，停止连接")
            // store.addMessage(this.name,data)
        })

    },
    disconnect() {

    }
}

export default system_status