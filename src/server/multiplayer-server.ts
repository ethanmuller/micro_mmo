import express from 'express';
import { createServer } from 'node:http';
import { Server } from "socket.io";
import { ServerToClientEvents, ClientToServerEvents, } from './MultiplayerTypes';
import cors from 'cors'
import { Player } from './MultiplayerTypes'


const app = express();
app.use(cors())
const server = createServer(app);
const playerList : Array<Player> = []
const io = new Server<
ClientToServerEvents,
ServerToClientEvents
>(server, {
  cors: {}
});

app.get('/', (_req, res) => {
  res.send('you are looking at the websocket server. this is the endpoint the socket.io client should connect to to send and receive messages.');
});

io.on('connection', async (socket) => {
  const skinNumber = parseInt(<string>socket.handshake.query.skin || "0", 10)
  playerList.push({ id: socket.id, skin: skinNumber })
  console.log(playerList)
  console.log(`CLIENT CONNECTED.    total sockets: ${playerList.length}`)
  io.emit('serverInfo', Date.now());
  socket.broadcast.emit('playerList', playerList);
  socket.broadcast.emit('playerConnected', { id: socket.id, skin: skinNumber });

  socket.on('disconnect', async () => {
    const disconnectedPlayerIndex = playerList.findIndex((p) => p.id === socket.id)
    playerList.splice(disconnectedPlayerIndex, 1)
    console.log(playerList)
    console.log(`CLIENT DISCONNECTED. total sockets: ${playerList.length}`)
    io.emit('playerList', playerList)
    io.emit('playerDisconnected', socket.id);
  });

  socket.on('playerSentFrameData', (data : any, sentTime : number) => {
    socket.broadcast.emit('serverSentPlayerFrameData', Date.now(), socket.id, data, sentTime);
  });
});

server.listen(3000, () => {
  console.log('server running at http://localhost:3000');
});
