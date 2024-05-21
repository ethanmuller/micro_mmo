import { MouseSkin } from '../game/Mouse';
import { defineStore } from 'pinia'
interface Seed {
  seed: number | undefined
}
function getRandomInt(max: number) {
	return Math.floor(Math.random() * Math.floor(max + 1));
}

export const useSeedStore = defineStore('seed', {
  state: (): Seed => {
    return { seed: undefined }
  },
  getters: {
  },
  actions: {
    generateSeed(max: number) {
        this.seed = getRandomInt(max)
        return this.seed
    },
    clearSeed() {
      delete this.seed
    }
  },
  persist: true,
})
