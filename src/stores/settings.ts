import { defineStore } from 'pinia'
import { CameraMode } from '../game/CameraMovement'

interface Settings {
  showLogs: boolean,
  invertControls: boolean,
  enableSound: boolean,
  enableChat: boolean,
  cameraMode: CameraMode
}

export const useSettingsStore = defineStore('settings', {
  state: (): Settings => {
    return {
      showLogs: false,
      invertControls: false,
      cameraMode: 'topdown',
      enableSound: true,
      enableChat: true,
    }
  },
  getters: {
  },
  actions: {
  },
  persist: true,
})

