
export const useGlobalStore = defineStore('global',()=>{
    const navMini = ref(false)
    const navHidden = ref(false)

    return {navMini,navHidden}
})