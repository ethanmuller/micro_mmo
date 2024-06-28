import { LevelName } from "../game/Level";

export interface ServerToClientEvents {
  sendEverybody: (list : Array<string>) => void;
  serverInfo: (time : number) => void;
  playerList: (playerList : Player[]) => void;
  playerConnected: (player : Player) => void;
  playerDisconnected: ( id : string ) => void;
  serverSentPlayerFrameData: (time : number, id : string, data : any, sentTime : number) => void;
  chatFromPlayer: (message: string, from: string) => void
  squeak: (id : string, n : number) => void;
}

export interface ClientToServerEvents {
  squeak: (n : number) => void;
  playerSentFrameData: (data : any, sentTime : number) => void;
  playerConnected: (id : string, skinNumber : number) => void;
  playerChat: (message : string) => void
}


export type Player = {
  id : string,
  skin : number,
  level : string,
}

export type Item = {
  id : string,
  parent?: string,
  level : LevelName,
}
