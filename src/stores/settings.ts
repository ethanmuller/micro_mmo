import { defineStore } from 'pinia'

export const useSettingsStore = defineStore('settings', {
  state: () => {
    return {
      showLogs: true,
      invertControls: false,
    }
  },
  getters: {
  },
  actions: {
  },
  persist: true,
})
