import { defineAsyncComponent } from 'vue'

const PluginConfigModal = defineAsyncComponent(() => import('./PluginConfigModal.vue'))

export default PluginConfigModal
export type PluginConfigModalInstance = InstanceType<typeof PluginConfigModal>
