import express from 'express';
import { createServer } from 'node:http';
import { Server } from "socket.io";
import { ServerToClientEvents, ClientToServerEvents, } from './MultiplayerTypes';
import cors from 'cors'
import { Player } from './MultiplayerTypes'


const app = express();
app.use(cors())
const server = createServer(app);
const playerList : Player[] = []
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
  const level = socket.handshake.query.requestedLevel?.toString() || 'lab'
  socket.join(level)
  const skinNumber = parseInt(<string>socket.handshake.query.skin || "0", 10)
  playerList.push({ id: socket.id, skin: skinNumber, level })
  console.log(playerList)
  console.log(`CLIENT CONNECTED.    total sockets: ${playerList.length}`)
  io.emit('serverInfo', Date.now());
  io.to(level).emit('playerList', playerList.filter((p) => p.level === level));
  io.to(level).emit('playerConnected', { id: socket.id, skin: skinNumber, level });

  socket.on('disconnect', async () => {
    const disconnectedPlayerIndex = playerList.findIndex((p) => p.id === socket.id)
    playerList.splice(disconnectedPlayerIndex, 1)
    console.log(playerList)
    console.log(`CLIENT DISCONNECTED. total sockets: ${playerList.length}`)
    io.to(level).emit('playerList', playerList.filter((p) => p.level === level))
    io.to(level).emit('playerDisconnected', socket.id);
  });

  socket.on('squeak', (n : number) => {
    socket.broadcast.to(level).emit('squeak', socket.id, n)
  })

  socket.on('playerSentFrameData', (data : any, sentTime : number) => {
    socket.broadcast.to(level).emit('serverSentPlayerFrameData', Date.now(), socket.id, data, sentTime);
  });

  socket.on('playerChat', (message: string) => {
    socket.broadcast.to(level).emit('chatFromPlayer', message, socket.id);
  });
});

server.listen(3000, () => {
  console.log('server running at http://localhost:3000');
});
