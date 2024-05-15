import { defineStore } from 'pinia'

export const useSettingsStore = defineStore('settings', {
  state: () => {
    return {
      showLogs: false,
      invertControls: false,
    }
  },
  getters: {
  },
  actions: {
  },
  persist: true,
})
