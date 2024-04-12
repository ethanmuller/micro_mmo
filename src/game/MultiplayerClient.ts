import * as socket from 'socket.io-client';
import { ref } from 'vue'
import { MessageType } from '../server/MessageType';

export class MultiplayerClient {

  connection: socket.Socket;
  playersOnline = ref("");
  localPlayerDisplayString = ref("");
  localPlayerId : string = "player";
  playerList: string[] = [];

  constructor() {
    console.log('setting up multiplayer client...')
    //TODO should we do better than hostname here
    this.connection = socket.io(window.location.hostname+`:3000`);
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
        console.log(this.playerList);
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

  disconnect() {
    if (this.connection)
      this.connection.close();
  }
}
