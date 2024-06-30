import * as socket from 'socket.io-client';
import { ref } from 'vue'
import { ServerToClientEvents, ClientToServerEvents, Player, } from '../server/MultiplayerTypes';
import { useLogStore } from "../stores/logs";

type Auth = {
  token: string | undefined
}

export class MultiplayerClient {

  connection: socket.Socket<ServerToClientEvents, ClientToServerEvents>;
  playersOnline = ref("");
  localPlayerDisplayString = ref("");
  localPlayer: Player = { member_id: "", skin: -1, level: '' };
  playerList: Player[] = [];
  serverTimeOffset: number = 0;
  auth: Auth;

  constructor(auth: Auth, skin: number, requestedLevel: string) {
    this.auth = auth
    const logs = useLogStore()
    console.log('setting up multiplayer client...')

    if (import.meta.env.PROD) {
      this.connection = socket.io(window.location.hostname, { auth, query: { skin, requestedLevel } });
    } else {
      this.connection = socket.io(window.location.hostname + ':3000', { auth, query: { skin, requestedLevel } });
    }

    this.connection.on('connect', () => {
      console.log('connected to multiplayer server')
      logs.add(`ENTERED ROOM: ${requestedLevel}`)
    })

    this.connection.on('serverInfo', (serverDateNow) => {
      this.computeServerTimeOffset(serverDateNow);
    })

    this.connection.on('playerList', (playerList) => {
      this.playersOnline.value = `ASSOCIATES: ${playerList.length - 1}`;
      this.playerList = playerList;
    })

    this.connection.on('chatKeystroke', (message: string, id: string) => {
      this.receiveChatKeystrokeCallbacks.forEach(cb => cb(message, id));
    })

    this.connection.on('playerConnected', newPlayer => {
      logs.add(`HELLO.....${newPlayer.member_id.slice(0, 9)}`);
      const isLocalPlayer = newPlayer.member_id == this.auth.token
      if (isLocalPlayer) {
        this.localPlayer = newPlayer;
        this.localPlayerDisplayString.value = `ID: ${newPlayer.member_id}`;

        // Check players list and instantiate necessary information of other players
        this.playerList.forEach(player => {
          if (player.member_id != this.localPlayer.member_id)
            this.processNewRemotePlayer(player);
        });
      }
      else this.processNewRemotePlayer(newPlayer);
    })
    this.connection.on('playerDisconnected', (id) => {
      logs.add(`GOODBYE...${id.slice(0, 9)}`);
      this.onRemotePlayerDisconnectedCallbacks.forEach(cb => cb(id));
    })
    this.connection.on('serverSentPlayerFrameData', (serverTime, id, data, sentTime) => {
      this.computeServerTimeOffset(serverTime);
      this.onRemotePlayerFrameDataCallbacks.forEach(cb => cb(id, data, sentTime));
    })
  }

  processNewRemotePlayer(player: Player) {
    this.onRemotePlayerConnectedCallbacks.forEach(cb => cb(player));
  }

  private onRemotePlayerConnectedCallbacks: ((player: Player) => void)[] = [];

  onPlayerConnected(cb: (player: Player) => void) {
    this.onRemotePlayerConnectedCallbacks.push(cb);
  }

  private onRemotePlayerDisconnectedCallbacks: ((id: string) => void)[] = [];
  onRemotePlayerDisconnected(cb: (id: string) => void) {
    this.onRemotePlayerDisconnectedCallbacks.push(cb);
  }

  // Frame data
  sendLocalPlayerFrameData(data: any) {
    this.connection.emit('playerSentFrameData', data, Date.now());
  }

  private onRemotePlayerFrameDataCallbacks: ((id: string, data: any, sentTime: number) => void)[] = [];
  onRemotePlayerFrameData(cb: (id: string, data: any, sentTime: number) => void) {
    this.onRemotePlayerFrameDataCallbacks.push(cb);
  }

  private receiveChatKeystrokeCallbacks: ((message: string, id: string) => void)[] = [];
  onChatFromPlayer(cb: (message: string, id: string) => void) {
    this.receiveChatKeystrokeCallbacks.push(cb);
  }

  disconnect() {
    if (this.connection)
      this.connection.close();
  }

  serverTimeMs() {
    return Date.now() + this.serverTimeOffset;
  }

  chat(message: string) {
    this.connection.emit('chatKeystroke', message)
  }

  private computeServerTimeOffset(serverMessageTime: number) {
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
