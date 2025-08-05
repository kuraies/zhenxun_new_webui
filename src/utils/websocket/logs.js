
import {useWebSocketStore} from '@/store/websocket.js'
const socketStore = useWebSocketStore()
const logs = {
    name:'logs',
    init(store) {
        const socketManager =socketStore.socketManger
        // 系统状态命名空间
        const logsSocket = socketManager.of(this.name)
        logsSocket.on('message', (data) => {
            // console.log(data)
            // store.addMessage(this.name,data)
        })
        logsSocket.on('disconnect', () => {
            console.log("断开连接")
            // store.addMessage(this.name,data)
        })
        logsSocket.on('error', (data) => {
            // console.log("发生错误",data)
            // store.addMessage(this.name,data)
        })
        logsSocket.on('reconnecting', (data) => {

            console.log(data)
            // store.addMessage(this.name,data)
        })
        logsSocket.on('reconnect_failed', (data) => {

            console.log("重连失败，停止连接")
            // store.addMessage(this.name,data)
        })

        return socketManager
    }
}

export default logs