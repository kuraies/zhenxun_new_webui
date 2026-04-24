import { defineStore } from "pinia";
import { ref } from "vue";
import { ZXNotification } from "@/components";
import { pluginApi } from "@/utils/api-next";
import { PluginInfo } from "@/types";

export const usePluginStore = defineStore("plugin", () => {
    const loading = ref(false);

    // 插件列表
    const plugins = ref<PluginInfo[]>([]);

    // 搜索关键词
    const searchKeyword = ref("");

    // 状态过滤
    const statusFilter = ref<"all" | "active" | "inactive">("all");

    // 类型过滤
    const typeFilter = ref<"all" | "builtin" | "third">("all");
    // 加载插件列表
    const loadPlugins = async () => {
        loading.value = true;
        try {
            const res = await pluginApi.getPluginList({
                search: searchKeyword.value || undefined,
                status:
                    statusFilter.value === "all"
                        ? undefined
                        : statusFilter.value === "active",
                // plugin_type:
                //     typeFilter.value === "all"
                //         ? undefined
                //         : typeFilter.value === "builtin"
                //           ? "builtin"
                //           : "third",
                page: 1,
                page_size: 100,
            });
            if (res?.success && res?.data) {
                if (res?.success && res?.data) {
                    let items = res.data.items || [];

                    // 前端处理 builtin / third 过滤
                    if (typeFilter.value === "builtin") {
                        items = items.filter((p) => p.is_builtin);
                    }

                    if (typeFilter.value === "third") {
                        items = items.filter((p) => !p.is_builtin);
                    }

                    plugins.value = items;
                }
            }
        } catch (error) {
            ZXNotification({
                title: "呜呼~",
                message: "插件列表加载失败了 (っ °Д °;) っ",
                type: "😭",
                position: "top-right",
            });
        } finally {
            loading.value = false;
        }
    };

    return {
        loading,
        plugins,
        searchKeyword,
        statusFilter,
        typeFilter,
        loadPlugins,
    };
});
