import { defineStore } from 'pinia'

interface Session {
  previousRoom: string,
}

export const useSessionStore = defineStore('session', {
  state: (): Session => {
    return {
      previousRoom: "",
    }
  },
  getters: {
  },
  actions: {
  },
  persist: true,
})
