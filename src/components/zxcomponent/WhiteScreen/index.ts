import { createApp, h } from "vue";
import WhiteScreen from "./WhiteScreen.vue";

let vm: any = null;

function ensure() {
    if (vm) return vm;

    const container = document.createElement("div");
    document.body.appendChild(container);

    const app = createApp({
        render() {
            return h(WhiteScreen, {
                ref: (el: any) => (vm = el),
            });
        },
    });

    app.mount(container);
    return vm;
}

export const whiteScreen = {
    async in() {
        const vm = ensure();
        await vm.show({ color: "#fff", mode: "normal" });
    },

    async out() {
        if (!vm) return;
        // 红屏（未检测到协议端）只能通过它自己的按钮或模拟端接入流程关闭，
        // 首页挂载时的自动揭开不能把红屏带掉（否则红屏一闪而过直接进首页）
        if (vm.visible && vm.mode === "error") return;
        await vm.hide();
    },

    async error() {
        const vm = ensure();
        await vm.show({
            color: "#D1383B",
            mode: "error",
        });
    },
};
