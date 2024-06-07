import { defineStore } from 'pinia'
import { CameraMode } from '../game/CameraMovement'

interface Settings {
  showLogs: boolean,
  showMinimap: boolean,
  invertControls: boolean,
  enableSound: boolean,
  enableChat: boolean,
  cameraMode: CameraMode
}

export const useSettingsStore = defineStore('settings', {
  state: (): Settings => {
    return {
      showLogs: false,
      showMinimap: false,
      invertControls: false,
      cameraMode: 'topdown',
      enableSound: false,
      enableChat: false,
    }
  },
  getters: {
  },
  actions: {
  },
  persist: true,
})

