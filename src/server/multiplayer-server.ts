import express from 'express';
import { createServer } from 'node:http';
import { Server } from "socket.io";
import cors from 'cors'
import { MessageType } from './MessageType.ts';

const app = express();
app.use(cors())
const server = createServer(app);
const io = new Server(server, {
  cors: {}
});

app.get('/', (_req, res) => {
  res.send('you are looking at the websocket server. this is the endpoint the socket.io client should connect to to send and receive messages.');
});

io.on('connection', async (socket) => {
  const sockets = await io.fetchSockets();
  console.log(`CLIENT CONNECTED.    total sockets: ${sockets.length}`)
  const idList = sockets.map((socket) => socket.id);
  io.emit(MessageType.clientList, idList)
  io.emit(MessageType.onPlayerConnected, socket.id);

  socket.on('disconnect', async () => {
    const sockets = await io.fetchSockets();
    console.log(`CLIENT DISCONNECTED. total sockets: ${sockets.length}`)
    io.emit(MessageType.clientList, idList)
    io.emit(MessageType.onPlayerDisconnected, socket.id);
  });
});

server.listen(3000, () => {
  console.log('server running at http://localhost:3000');
});
