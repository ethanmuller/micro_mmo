import { Euler, Vector3 } from "three";
import { LevelName } from "../game/Level";

export interface ServerToClientEvents {
  sendEverybody: (list: Array<string>) => void;
  serverInfo: (time: number) => void;
  playerList: (playerList: Player[]) => void;
  playerConnected: (player: Player) => void;
  playerDisconnected: (id: string) => void;
  serverSentPlayerFrameData: (time: number, id: string, data: any, sentTime: number) => void;
  chatKeystroke: (message: string, from: string) => void
  chatSay: (message: string, from: string) => void
  squeak: (id: string, n: number) => void;
  itemListInit: (list: Array<Item>) => void;
  itemListUpdate: (list: Array<Item>) => void;
  sfxPickup: () => void;
  sfxPutdown: () => void;
}

export interface ClientToServerEvents {
  squeak: (n: number) => void;
  playerSentFrameData: (data: any, sentTime: number) => void;
  playerConnected: (id: string, skinNumber: number) => void;
  chatKeystroke: (message: string) => void;
  chatSay: (message: string) => void;
  pickupItem: (id: string) => void;
  dropItem: (location: Vector3, rotation: Euler) => void;
}


export type Player = {
  member_id: string,
  skin: number,
  level: string,
}

export type Item = {
  id: string,
  parent?: string,
  level: LevelName,
  location: Vector3,
  rotation: Euler,
}
