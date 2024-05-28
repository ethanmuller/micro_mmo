import { defineStore } from 'pinia'
import { CameraMode } from '../game/CameraMovement'

interface Settings {
  showLogs: boolean,
  invertControls: boolean,
  cameraMode: CameraMode
}

export const useSettingsStore = defineStore('settings', {
  state: (): Settings => {
    return {
      showLogs: true,
      invertControls: false,
      cameraMode: 'topdown',
    }
  },
  getters: {
  },
  actions: {
  },
  persist: true,
})

