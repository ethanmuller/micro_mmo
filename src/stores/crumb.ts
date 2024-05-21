import { defineStore } from 'pinia'
interface CrumbPouch {
    lastCrumb: Date,
}
export const useCrumbStore = defineStore('crumbs', {
  state: (): CrumbPouch => {
    const now = new Date()
    return {
      lastCrumb: now,
    }
  },
  getters: {
  },
  actions: {
    getCrumb() {
        const now = new Date()
        this.lastCrumb = now
    }
  },
  persist: true,
})
