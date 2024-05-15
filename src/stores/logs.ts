import { defineStore } from 'pinia'

export const useLogStore = defineStore('logs', {
  state: () => {
    return {
      messages: [],
    }
  },
  getters: {
  },
  actions: {
    add(msg: string) {
      this.messages.unshift(msg)
    },
  },
})
