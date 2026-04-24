import { defineStore } from "pinia";
import { ref } from "vue";
import { ZXNotification } from "@/components";
import { storeApi, StoreResponse } from "@/utils/api-next";
import { type StorePlugin } from "@/types";

export const useStoreStore = defineStore("store", () => {
    const loading = ref(false);
    // 商店数据
    const storeData = ref<StoreResponse | null>(null);

    // 加载插件商店数据
    const loadStoreData = async () => {
        loading.value = true;
        try {
            const res = await storeApi.getPluginStore();
            if (res?.success && res.data) {
                storeData.value = res.data;
                // 根据 install_module 标记已安装插件
                const installedModules = new Set(res.data.install_module || []);
                storeData.value.plugin_list.forEach((plugin: StorePlugin) => {
                    plugin.is_installed = installedModules.has(plugin.module);
                });
                ZXNotification({
                    title: "成功啦~",
                    message: "插件商店数据加载成功 ♪(´▽｀)",
                    type: "🥳",
                    position: "top-right",
                });
            }
        } catch (error) {
            ZXNotification({
                title: "呜呼~",
                message: "插件商店数据加载失败了 (っ °Д °;) っ",
                type: "😭",
                position: "top-right",
            });
        } finally {
            loading.value = false;
        }
    };

    return {
        loading,
        storeData,
        loadStoreData,
    };
});
