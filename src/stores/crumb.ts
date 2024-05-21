import { defineStore } from 'pinia'
interface CrumbPouch {
    crumbs: number,
    lastSeen: Date,
}
export const useCrumbStore = defineStore('crumbs', {
  state: (): CrumbPouch => {
    const now = new Date()
    return {
      crumbs: 0,
      lastSeen: now,
    }
  },
  getters: {
  },
  actions: {
    see() {
      const now = new Date()
      this.lastSeen = now
    }
  },
  persist: true,
})
