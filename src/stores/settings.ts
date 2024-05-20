import { defineStore } from 'pinia'

export const cameraModes = ['iso', 'topdown', 'wholemap', 'mazecam', 'nothing'] as const;
export type CameraMode = typeof cameraModes[number];

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
