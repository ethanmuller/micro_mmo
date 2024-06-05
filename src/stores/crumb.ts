import { defineStore } from 'pinia'
interface CrumbPouch {
    collectedCrumbs: number,
    availableCrumbs?: [number, number],
    lastSeen: Date,
}
export const useCrumbStore = defineStore('crumbs', {
  state: (): CrumbPouch => {
    const now = new Date()
    return {
      collectedCrumbs: 0,
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
