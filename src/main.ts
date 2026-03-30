import { createApp } from 'vue'
import './assets/style.css'
import App from './App.vue'
import { router } from "@/router"
import { createPinia } from 'pinia'
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'

// @ts-ignore - Element Plus locale file
import zhCn from 'element-plus/es/locale/lang/zh-cn'

const app = createApp(App)
const pinia = createPinia()

app.use(router)
app.use(pinia)
app.use(ElementPlus, { locale: zhCn })

app.mount('#app')
