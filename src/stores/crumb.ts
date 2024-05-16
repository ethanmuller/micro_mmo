import { defineStore } from 'pinia'
interface CrumbPouch {
    lastCrumb: Date,
}
export const useCrumbStore = defineStore('rtc', {
  state: (): CrumbPouch => {
    const now = new Date()
    return {
      lastCrumb: now,
    }
  },
  getters: {
  },
  actions: {
    getNugget() {
        const now = new Date()
        this.lastCrumb = now
    }
  },
  persist: true,
})
