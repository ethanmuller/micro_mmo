import { defineStore } from 'pinia'
import { CameraMode } from '../game/CameraMovement.ts'

interface Session {
  previousRoom: string,
  cameraMode: CameraMode,
}

export const useSessionStore = defineStore('session', {
  state: (): Session => {
    return {
      previousRoom: "",
      cameraMode: 'iso',
    }
  },
  getters: {
  },
  actions: {
  },
  persist: true,
})
