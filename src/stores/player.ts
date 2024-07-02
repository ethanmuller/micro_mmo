import { generateUUID } from 'three/src/math/MathUtils.js';
import { defineStore } from 'pinia'
interface Player {
  skin: number | undefined
  token: string | undefined
}
function getRandomInt(max: number) {
  return Math.floor(Math.random() * Math.floor(max + 1));
}

export const usePlayerStore = defineStore('player', {
  state: (): Player => {
    return { skin: undefined, token: undefined }
  },
  getters: {
  },
  actions: {
    generateToken() {
      this.token = generateUUID()
      return this.token
    },
    generateSkin(max: number) {
      this.skin = getRandomInt(max)
      return this.skin
    },
    clearSkin() {
      delete this.skin
    }
  },
  persist: true,
})
