<template>
    <Teleport to="body">
        <div class="LocationAddress  fixed inset-0  flex items-center justify-center z-50">
            <div v-if="bg_visible" ref="bgRef" class="bg bg-black/50 w-full h-full absolute -z-1"
                 @click="onCancel"></div>
            <div ref="cardRef"
                 class=" bg-white rounded-4xl flex outline-8 outline-white relative  w-260 h-160  z-1  max-md:h-screen max-md:flex-col">
                <div
                    class="backdrop rounded-l-2xl bg-white flex justify-center flex-col overflow-hidden min-w-50 w-100 h-full max-md:w-full">
                    <img :src="poster"
                         alt=""
                         class="h-full object-cover object-center filter url(#remove-white) max-md:object-top">
                </div>
                <div
                    class="right-area flex-1 flex flex-col px-[10%] pt-16 pb-8 z-2 rounded-r-4xl space-y-8  max-md:rounded-t-4xl max-md:shadow-[0_3px_10px_rgb(0,0,0,0.2)]">
                    <div class="title text-4xl font-bold text-slate-800 tracking-wide">
                        API地址设置
                    </div>
                    <div class="ip-port text-gray-700 mb-8 text-sm   relative space-y-6">
                        <div class="ip space-y-2">
                            <div class="title font-bold ">
                                地址
                            </div>
                            <div class="w-full relative min-w-[200px]">
                                <ZXInput
                                    v-model="url"
                                    :icon="true"
                                    :message="message.url"
                                    placeholder="请输入地址"
                                    @blur="changeUrl(url)"
                                />
                            </div>
                        </div>
                        <div class="port space-y-2">
                            <div class="title font-bold">
                                端口
                            </div>
                            <div class="w-full relative  min-w-[200px]">
                                <ZXInput
                                    v-model="port"
                                    :icon="showIcon.port"
                                    :message="message.port"
                                    :type="validate.port"
                                    placeholder="请输入端口"
                                    @blur="changePort(port)"
                                />
                                <!--                                <input v-model="port" @blur="changePort(port)"-->
                                <!--                                       class="w-full font-light pl-6 bg-white placeholder:text-slate-400 text-slate-700 text-sm border border-slate-300 rounded-md px-3 py-2 transition duration-300 ease focus:outline-none focus:border-slate-400 hover:border-slate-300 focus:shadow"-->
                                <!--                                       placeholder="请输入端口" />-->
                                <!--                                <span-->
                                <!--                                    class="pointer-events-none absolute top-1/2 -translate-y-1/2 text-red-500 inline-flex  w-6 h-6 data-[placement=start]:left-2.5 data-[placement=end]:right-2.5 data-[show=false]:hidden data-[success=true]:text-green-500"-->
                                <!--                                    :data-show="showIcon.port" :data-success="validate.port" data-placement="end">-->
                                <!--                                    <svg v-if="validate.port" xmlns="http://www.w3.org/2000/svg" fill="none"-->
                                <!--                                         viewBox="0 0 24 24"-->
                                <!--                                         stroke-width="1.5" stroke="currentColor" class="size-6">-->
                                <!--                                          <path stroke-linecap="round" stroke-linejoin="round"-->
                                <!--                                                d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />-->
                                <!--                                        </svg>-->
                                <!--                                    <svg v-else xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"-->
                                <!--                                         stroke-width="1.5" stroke="currentColor" class="size-6">-->
                                <!--                                      <path stroke-linecap="round" stroke-linejoin="round"-->
                                <!--                                            d="m9.75 9.75 4.5 4.5m0-4.5-4.5 4.5M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />-->
                                <!--                                    </svg>-->
                                <!--                                </span>-->
                                <!--                                <span v-if="!validate.port"-->
                                <!--                                      class="absolute right-0 bottom-0 translate-y-full text-red-500">-->
                                <!--                                    {{ message.port }}-->
                                <!--                                </span>-->
                            </div>
                        </div>
                        <div class="test my-0 flex justify-end items-center space-x-6">
                            <div class="result">
                                <div :data-success="connect.state"
                                     class=" text-green-600 data-[success=false]:text-red-500">
                                    {{ connect.msg }}
                                </div>
                            </div>
                            <button
                                class="w-20 cursor-pointer  items-center rounded-xl bg-green-600 py-1 px-4 border border-transparent text-center text-lg text-white transition-all shadow-sm hover:shadow-md hover:bg-green-500  disabled:pointer-events-none disabled:opacity-50 disabled:shadow-none"
                                type="button"
                                @click="testAddress">
                                测试
                            </button>
                        </div>
                        <div class="warning mb-8">
                            <div class="title font-bold text-2xl text-red-400 mb-4">
                                ⚠注意事项
                            </div>
                            <ul class="content space-y-2">
                                <li class="flex space-x-2"><p>1.</p>
                                    <p>开发环境中修改api地址一样生效，即覆盖代理服务器的转发</p></li>
                                <li class="flex space-x-2"><p>2.</p>
                                    <p>如果生产环境部署的资源和真寻本体不在
                                        同一个机器上，则输入你的服务器接口地址以及真寻的端口。最后记得修改防火墙设置哦</p>
                                </li>
                            </ul>
                        </div>
                        <div class="change-button flex justify-between">
                            <button class="w-20 cursor-pointer font-bold items-center rounded-xl bg-red-400 py-2 px-4 border border-transparent text-center text-lg text-white transition-all shadow-sm hover:shadow-md hover:bg-slate-700  disabled:pointer-events-none disabled:opacity-50 disabled:shadow-none"
                                    type="button"
                                    @click="onCancel">
                                取消
                            </button>
                            <button class="w-50 cursor-pointer font-bold items-center rounded-xl bg-slate-800 py-2 px-4 border border-transparent text-center text-lg text-white transition-all shadow-sm hover:shadow-md hover:bg-slate-700  disabled:pointer-events-none disabled:opacity-50 disabled:shadow-none"
                                    type="button"
                                    @click="onConfirm">
                                修改
                            </button>
                        </div>
                    </div>
                </div>
                <div ref="targetEl" class="rt absolute right-0 top-0 -translate-y-5/8 translate-1/5 z-2  max-md:hidden">
                    <img :src="right_top_img" alt="" class="w-50">
                </div>
            </div>
        </div>
    </Teleport>
</template>

<script setup>
import { ref, watch } from 'vue'
import { getBaseUrl, setUrl } from '@/utils/api/index.js'
import { ZXNotification } from 'components'
import { throttle } from '@/utils/util.js'
import { useComponentStore } from '@/store/componet.js'
import { systemApi } from '@/utils/api/system.js'
import { gsap } from 'gsap'

const componentStore = useComponentStore()


/*
图片导入区
 */

import poster from '@/assets/img/img.png'
import right_top_img from '@/assets/img/2.png'
import ZXInput from 'components/zxcomponent/ZXInput.vue'

/*
图片导入区结束
 */


const props = defineProps({
    modelValue: Boolean,
    bg_visible: Boolean
})


const bgRef = ref(null)
const cardRef = ref(null)
// console.log(baseApiUrl)
const url = ref(null)
const port = ref(null)


const validate = reactive({
    url: false,
    port: false
})
const showIcon = reactive({
    url: false,
    port: false
})

const message = reactive({
    url: '',
    port: ''
})

const connect = reactive({
    msg: '',
    show: false,
    state: false
})


const emit = defineEmits(['update:modelValue'])

const visible = ref(props.modelValue)

watch(() => props.modelValue, val => {
    visible.value = val
    componentStore.LocationAddress = val
})
watch(visible, val => {
    emit('update:modelValue', val)
})


onMounted(() => {
    enterAnimation()
    url.value = getBaseUrl()
    changeUrl(url.value)
})

onUnmounted(() => {
})


// 动画相关方法
const enterAnimation = () => {
    nextTick(() => {
        if (bgRef.value && props.bg_visible) {
            gsap.fromTo(bgRef.value,
                { opacity: 0 },
                { opacity: 1, duration: 0.2 }
            )
        }
        if (cardRef.value) {
            gsap.fromTo(cardRef.value,
                { scale: 0.8, opacity: 0 },
                { scale: 1, opacity: 1, duration: 0.5, ease: 'back.out(2)' }
            )
        }
    })
}

const leaveAnimation = async () => {
    if (cardRef.value) {
        if (bgRef.value && props.bg_visible) {
            await Promise.all([
                gsap.to(cardRef.value, { scale: 0.8, opacity: 0, duration: 0.25 }),
                gsap.to(bgRef.value, { opacity: 0, duration: 0.2 })
            ])
        } else {
            await gsap.to(cardRef.value, { scale: 0.8, opacity: 0, duration: 0.5, ease: 'back.in(2)' })
        }
    }
}

// 修改确认逻辑
const onConfirm = async () => {
    if (!validate.url || !validate.port) {
        notificationModify(false)
        return
    }

    let state = await handleTestAddress()
    if (state) {
        setUrl(url.value,port.value)
        notificationModify(true)
        await leaveAnimation()
        visible.value = false
    } else {
        notificationModify(false)
    }
}

function notificationConnect(state) {
    if (state) {
        ZXNotification({
            title: '成功😉',
            message: '连接测试成功ヾ(≧▽≦*)o',
            type: 'success',
            confetti: true
        })
    } else {
        ZXNotification({
            title: '失败🥲',
            message: '连接测试失败（；´д｀）ゞ',
            type: 'error'
        })
    }

}

function notificationModify(state) {
    if (state) {
        ZXNotification({
            title: '成功🥳',
            message: '地址修改成功╰(*°▽°*)╯',
            type: 'success',
            position: 'top-right',
            confetti: true
        })
    } else {
        ZXNotification({
            title: '失败😵‍💫',
            message: '地址修改失败ヽ(*。>Д<)o゜',
            type: 'error'
        })
    }
}

const onCancel = async () => {
    await leaveAnimation()
    visible.value = false
}


function changeUrl(newUrl) {
    // console.log(url)
    if (newUrl) {
        let result = validateUrl(newUrl)
        if (result.isValid) {
            url.value = result.protocol + '://' + result.host
            if (result.port) {
                port.value = result.port

            }
            validate.url = true
            message.url = ''
            changePort(port.value)
        } else {
            validate.url = false
            message.url = result.message
        }
        showIcon.url = true
    } else {
        showIcon.url = false
    }

}

function changePort(newPort) {
    if (newPort) {
        let result = validatePort(newPort)
        // console.log(result);
        if (result.isValid) {
            port.value = result.port

            validate.port = true
            message.port = ''
        } else {
            message.port = result.message
            validate.port = false
        }
        showIcon.port = true
    } else {
        showIcon.port = false
    }
}

function validatePort(port) {
    const result = {
        isValid: false,
        port: null,
        message: ''
    }
    if (port) {
        if (!/^\d+$/.test(port)) {
            result.message = '端口号必须为数字'
            return result
        }

        const portNum = parseInt(port)
        if (isNaN(portNum) || portNum < 1 || portNum > 65535) {
            result.message = '端口号无效（必须1-65535）'
            return result
        }
        result.port = portNum
        result.isValid = true

    }
    return result
}

function validateUrl(url) {
    const result = {
        isValid: false,
        protocol: null,
        host: null,
        port: null,
        isIp: false,
        message: '',
        portMessage: ''
    }

    if (url) {
        try {
            // 1. 基础URL解析
            const urlPattern = /^(?:(https?):\/\/)?([^\/:]+)(?::(\d+))?(\/.*)?$/i
            const match = url.match(urlPattern)

            if (!match) {
                result.message = 'URL格式不符合基本规则'
                return result
            }

            const [, protocol, host, port, path] = match

            // 2. 验证主机部分
            const isDomain = /^([a-z0-9-]+\.)+[a-z]{2,}$/i.test(host) || host === 'localhost'
            const isIpv4 = /^(25[0-5]|2[0-4][0-9]|1[0-9]{2}|[1-9]?[0-9])(\.(25[0-5]|2[0-4][0-9]|1[0-9]{2}|[1-9]?[0-9])){3}$/.test(host)
            const isIpv6 = /^\[([a-f0-9:]+)\]$/i.test(host) || /^[a-f0-9:]+$/i.test(host)
            result.isIp = isIpv4 || isIpv6

            if (!isDomain && !result.isIp) {
                result.message = '主机名/IP地址格式无效'
                return result
            }

            // 3. 严格IP验证
            if (result.isIp) {
                const ip = host.replace(/^\[|\]$/g, '')
                const ipv4Pattern = /^(25[0-5]|2[0-4][0-9]|1[0-9]{2}|[1-9]?[0-9])(\.(25[0-5]|2[0-4][0-9]|1[0-9]{2}|[1-9]?[0-9])){3}$/
                // 修正后的IPv6正则表达式
                const ipv6Pattern = /^(([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}|(:((:[0-9a-fA-F]{1,4}){1,6})|(([0-9a-fA-F]{1,4}:){1,6}:))|([0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,5}|:)))$/

                if ((isIpv4 && !ipv4Pattern.test(ip)) || (isIpv6 && !ipv6Pattern.test(ip))) {
                    result.message = 'IP地址格式无效'
                    return result
                }
            }

            // 4. 验证端口
            if (port) {
                const portNum = parseInt(port)
                if (portNum < 1 || portNum > 65535) {
                    result.portMessage = '端口号无效（必须1-65535）'
                    return result
                }
                result.port = portNum
            }

            // 5. 验证通过
            result.isValid = true
            result.protocol = protocol ? protocol.toLowerCase() : null
            result.host = host
            result.message = 'URL验证通过'

            return result
        } catch (e) {
            result.message = 'URL解析错误: ' + e.message
            return result
        }
    }
}

const handleTestAddress = throttle(() => {
    changeUrl(url.value)
    changePort(port.value)
    if (validate.url && validate.port) {
        return systemApi.ping({
            baseURL: url.value+':'+port.value+'/zhenxun/api',
        })
            .then((res) => {
                if (res?.suc) {
                    connect.msg = '连接成功'
                    connect.state = true
                    connect.show = true
                    return true // 返回 true
                }
                return false // 如果 res.suc 不存在，返回 false
            })
            .catch(error => {
                console.error(error)
                connect.msg = '连接失败'
                connect.state = false
                connect.show = true
                return false // 返回 false
            })
    } else {
        return Promise.resolve(false)
    }
}, 1000, () => {
    ZXNotification({
        title: '呜呜😭',
        message: '点慢点o(TヘTo)',
        position: 'top-right',
        type: 'warning'
    })
})

function testAddress() {
    handleTestAddress().then((res) => {
        if (res)
            notificationConnect(true)
        else
            notificationConnect(false)
    })
}


// 暴露ref给父组件
defineExpose({
    bgRef,
    cardRef,
    enterAnimation,
    leaveAnimation
})
</script>
