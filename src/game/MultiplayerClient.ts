import * as socket from 'socket.io-client';
import { ref } from 'vue'

export class MultiplayerClient {

  connection: socket.Socket;
  playersOnline = ref("");

  constructor() {
    console.log('setting up multiplayer client...')
    //TODO should we do better than hostname here
    this.connection = socket.io(window.location.hostname+`:3000`);
    this.connection.on('clientList', (payload) => {
      this.playersOnline.value = `Players online: ${payload}`
    })
  }

  disconnect() {
    if (this.connection)
      this.connection.close();
  }
}
