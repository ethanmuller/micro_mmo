import express from 'express';
import { createServer } from 'node:http';
import { Server } from "socket.io";
import { ServerToClientEvents, ClientToServerEvents, } from './MultiplayerTypes';
import cors from 'cors'


const app = express();
app.use(cors())
const server = createServer(app);
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
  const sockets = await io.fetchSockets();
  console.log(`CLIENT CONNECTED.    total sockets: ${sockets.length}`)
  console.log(sockets)
  const idList = sockets.map((socket) => socket.id);
  io.emit('serverInfo', Date.now());
  io.emit('clientList', idList);

  const skinNumber = parseInt(<string>socket.handshake.query.skin || "0", 10)
  console.log(skinNumber)
  io.emit('playerConnected', socket.id, skinNumber);

  socket.on('disconnect', async () => {
    const sockets = await io.fetchSockets();
    console.log(`CLIENT DISCONNECTED. total sockets: ${sockets.length}`)
    io.emit('clientList', idList)
    io.emit('playerDisconnected', socket.id);
  });

  socket.on('playerSentFrameData', (data : any, sentTime : number) => {
    socket.broadcast.emit('serverSentPlayerFrameData', Date.now(), socket.id, data, sentTime);
  });
});

server.listen(3000, () => {
  console.log('server running at http://localhost:3000');
});
