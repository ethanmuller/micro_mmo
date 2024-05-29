import { defineStore } from 'pinia'



interface Messages {
  messages: string[]
}

export const useLogStore = defineStore('logs', {
  state: (): Messages => {
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
