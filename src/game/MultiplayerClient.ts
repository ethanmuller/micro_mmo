import * as socket from 'socket.io-client';
import { ref } from 'vue'

export class MultiplayerClient {

  connection: socket.Socket;
  playersOnline = ref("");

  constructor() {
    console.log('setting up multiplayer client...')
    this.connection = socket.io(`localhost:3000`);
    this.connection.on('clientList', (payload) => {
      this.playersOnline.value = `Players online: ${payload}`
    })
  }
}
