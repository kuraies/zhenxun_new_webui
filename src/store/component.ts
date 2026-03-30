import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useComponentStore = defineStore('component', () => {
    const LocationAddress = ref(false)

    return { LocationAddress }
})
