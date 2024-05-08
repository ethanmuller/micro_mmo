export interface ServerToClientEvents {
  sendEverybody: (list : Array<string>) => void;
  serverInfo: (time : number) => void;
  playerList: (playerList : Player[]) => void;
  playerConnected: (player : Player) => void;
  playerDisconnected: ( id : string ) => void;
  serverSentPlayerFrameData: (time : number, id : string, data : any, sentTime : number) => void;
}

export interface ClientToServerEvents {
  howdy: (player : Player ) => void;
  
  playerSentFrameData: (data : any, sentTime : number) => void;
  playerConnected: (id : string, skinNumber : number) => void;
}


export type Player = {
  id : string,
  skin : number,
}