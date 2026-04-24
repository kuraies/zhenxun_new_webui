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
