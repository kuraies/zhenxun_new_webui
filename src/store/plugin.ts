import { defineStore } from "pinia";
import { ref } from "vue";
import { ZXNotification } from "@/services/ui";
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

    // 类型过滤：内置 / 三方 独立开关（内置默认不显示）
    const showBuiltin = ref(false);
    const showThird = ref(true);

    // 置顶 / 常驻插件（客户端偏好，localStorage 持久化）
    const readModuleList = (key: string): string[] => {
        try {
            const parsed = JSON.parse(localStorage.getItem(key) || "[]");
            return Array.isArray(parsed)
                ? parsed.filter((m) => typeof m === "string")
                : [];
        } catch {
            return [];
        }
    };
    const pinnedModules = ref<string[]>(readModuleList("plugin.pinnedModules"));
    const residentModules = ref<string[]>(
        readModuleList("plugin.residentModules"),
    );
    const togglePinned = (module: string) => {
        const next = pinnedModules.value.includes(module)
            ? pinnedModules.value.filter((m) => m !== module)
            : [module, ...pinnedModules.value];
        pinnedModules.value = next;
        localStorage.setItem("plugin.pinnedModules", JSON.stringify(next));
        // 同步到后端
        pluginApi
            .savePluginMarks(pinnedModules.value, residentModules.value)
            .catch(() => {});
    };
    const toggleResident = (module: string) => {
        const next = residentModules.value.includes(module)
            ? residentModules.value.filter((m) => m !== module)
            : [...residentModules.value, module];
        residentModules.value = next;
        localStorage.setItem("plugin.residentModules", JSON.stringify(next));
        // 同步到后端
        pluginApi
            .savePluginMarks(pinnedModules.value, residentModules.value)
            .catch(() => {});
    };
    // 加载插件列表
    const loadPlugins = async () => {
        loading.value = true;
        try {
            const res = await pluginApi.getPluginList({
                search: searchKeyword.value || undefined,
                page: 1,
                page_size: 100,
            });
            if (res?.success && res?.data) {
                plugins.value = res.data.items || [];
            }

            // 拉取后端置顶/常驻标记（后端为准，localStorage 作即时缓存）
            pluginApi
                .getPluginMarks()
                .then((marksRes) => {
                    if (marksRes?.success && marksRes?.data) {
                        pinnedModules.value = marksRes.data.pinned ?? [];
                        residentModules.value = marksRes.data.resident ?? [];
                        localStorage.setItem(
                            "plugin.pinnedModules",
                            JSON.stringify(pinnedModules.value),
                        );
                        localStorage.setItem(
                            "plugin.residentModules",
                            JSON.stringify(residentModules.value),
                        );
                    }
                })
                .catch(() => {});
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
        showBuiltin,
        showThird,
        pinnedModules,
        residentModules,
        togglePinned,
        toggleResident,
        loadPlugins,
    };
});
