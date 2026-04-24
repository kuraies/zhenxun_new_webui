import { defineStore } from "pinia";
import { ref } from "vue";

export const useFilesStore = defineStore("files", () => {
    const showNewDialog = ref(false);

    return {
        showNewDialog,
    };
});
