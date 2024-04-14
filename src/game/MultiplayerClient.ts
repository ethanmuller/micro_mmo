import * as socket from 'socket.io-client';
import { ref } from 'vue'
import { MessageType } from '../server/MessageType';

export class MultiplayerClient {

  connection: socket.Socket;
  playersOnline = ref("");
  localPlayerDisplayString = ref("");
  localPlayerId : string = "player";
  playerList: string[] = [];
  serverTimeOffset : number = 0;

  constructor() {
    console.log('setting up multiplayer client...')
    //TODO should we do better than hostname here
    this.connection = socket.io(window.location.hostname+`:3000`);
    this.connection.on(MessageType.serverInfo, (serverDateNow) => {
      this.computeServerTimeOffset(serverDateNow);
    })
    this.connection.on(MessageType.clientList, (playerList) => {
      this.playersOnline.value = `Players online: ${playerList.length}`
      this.playerList = playerList as string[];
    })
    this.connection.on(MessageType.onPlayerConnected, (id) => {
      console.log(`player ${id} connected`);
      if (id == this.connection.id) {
        this.localPlayerId = id;
        this.localPlayerDisplayString.value = `Local player: ${id}`;

        // Check players list and instantiate necessary information of other players
        this.playerList.forEach(playerId => {
          if (playerId != this.localPlayerId)
            this.processNewRemotePlayer(playerId);
        });
      }
      else this.processNewRemotePlayer(id);
    })
    this.connection.on(MessageType.onPlayerDisconnected, (id) => {
      console.log(`player ${id} disconnected`);
      this.onRemotePlayerDisconnectedCallbacks.forEach(cb => cb(id));
    })
    this.connection.on(MessageType.serverSentPlayerFrameData, (serverTime, id, data, sentTime) => {
      this.computeServerTimeOffset(serverTime);
      this.onRemotePlayerFrameDataCallbacks.forEach(cb => cb(id, data, sentTime));
    })
  }

  processNewRemotePlayer(playerId : string) {
    this.onRemotePlayerConnectedCallbacks.forEach(cb => cb(playerId));
  }

  private onRemotePlayerConnectedCallbacks : ((id: string) => void)[] = [];
  onRemotePlayerConnected(cb : (id: string) => void) {
    this.onRemotePlayerConnectedCallbacks.push(cb);
  }

  private onRemotePlayerDisconnectedCallbacks : ((id: string) => void)[] = [];
  onRemotePlayerDisconnected(cb : (id: string) => void) {
    this.onRemotePlayerDisconnectedCallbacks.push(cb);
  }

  // Frame data
  sendLocalPlayerFrameData(data: any) {
    this.connection.emit(MessageType.playerSentFrameData, data, Date.now());
  }

  private onRemotePlayerFrameDataCallbacks : ((id: string, data: any, sentTime: number) => void)[] = [];
  onRemotePlayerFrameData(cb: (id: string, data: any, sentTime: number) => void) {
    this.onRemotePlayerFrameDataCallbacks.push(cb);
  }

  disconnect() {
    if (this.connection)
      this.connection.close();
  }

  serverTimeMs() {
    return Date.now() + this.serverTimeOffset;
  }

  private computeServerTimeOffset(serverMessageTime : number) {
    let clientTimeMs = Date.now();
    let clientTime = new Date(clientTimeMs);
    let serverTime = new Date(serverMessageTime);
    this.serverTimeOffset = 0;

    if (Math.abs(serverMessageTime - clientTimeMs) > 5 * 60 * 1000) // if we are off more than 5 minutes something is off, maybe client is at different time zone
    {
      // TODO acount for people setting phones on weird years and times that are not NOW

      this.serverTimeOffset = serverTime.getTimezoneOffset() - clientTime.getTimezoneOffset();
      console.log(`client is at an offset of ${this.serverTimeOffset}`);
    }
  }
}
