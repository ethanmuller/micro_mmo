import express from 'express';
import { createServer } from 'node:http';
import { Server } from "socket.io";
import { ServerToClientEvents, ClientToServerEvents, } from './MultiplayerTypes';
import cors from 'cors'
import { Player, Item } from './MultiplayerTypes'
import { generateUUID } from 'three/src/math/MathUtils.js';
import { Euler, Vector3 } from 'three';
import { LevelName } from '../game/Level';


const app = express();
app.use(cors())
const server = createServer(app);
const playerList: Player[] = []
const itemList: Item[] = []
const io = new Server<
  ClientToServerEvents,
  ServerToClientEvents
>(server, {
  cors: {}
});

function makeEulerWithRandomYRotation() {
  return new Euler(0, Math.PI * Math.random(), 0)
}

const b1 = {
  id: generateUUID(),
  level: 'lab' as LevelName,
  location: new Vector3(30, 0.5, 60),
  rotation: makeEulerWithRandomYRotation(),
}
itemList.push(b1)

const b2 = {
  id: generateUUID(),
  level: 'lab' as LevelName,
  location: new Vector3(30, 0.5, 55),
  rotation: makeEulerWithRandomYRotation(),
}
itemList.push(b2)

itemList.push({
  id: generateUUID(),
  level: 'lab' as LevelName,
  location: new Vector3(4, 0.5, 12),
  rotation: makeEulerWithRandomYRotation(),
})

itemList.push({
  id: generateUUID(),
  level: 'lab' as LevelName,
  location: new Vector3(13, 0.5, 15),
  rotation: makeEulerWithRandomYRotation(),
})



const b3 = {
  id: generateUUID(),
  level: 'ohio' as LevelName,
  location: new Vector3(10, 0.5, 10),
  rotation: makeEulerWithRandomYRotation(),
}
itemList.push(b3)

itemList.push({
  id: generateUUID(),
  level: 'ohio' as LevelName,
  location: new Vector3(16, 0.5, 28),
  rotation: makeEulerWithRandomYRotation(),
})

// for (let i = 0; i < 5; i++) {
//   itemList.push({
//     id: generateUUID(),
//     level: 'the_cheddaverse' as LevelName,
//     location: new Vector3(170 - i * 5, 0.5, 166),
//     rotation: makeEulerWithRandomYRotation(),
//   })
// }

itemList.push({
  id: generateUUID(),
  level: 'the_cheddaverse' as LevelName,
  location: new Vector3(88, 0.5, 164),
  rotation: makeEulerWithRandomYRotation(),
})

itemList.push({
  id: generateUUID(),
  level: 'the_cheddaverse' as LevelName,
  location: new Vector3(94, 0.5, 171),
  rotation: makeEulerWithRandomYRotation(),
})

itemList.push({
  id: generateUUID(),
  level: 'the_cheddaverse' as LevelName,
  location: new Vector3(96, 0.5, 163),
  rotation: makeEulerWithRandomYRotation(),
})

itemList.push({
  id: generateUUID(),
  level: 'the_cheddaverse' as LevelName,
  location: new Vector3(157, 0.5, 167),
  rotation: makeEulerWithRandomYRotation(),
})

itemList.push({
  id: generateUUID(),
  level: 'the_cheddaverse' as LevelName,
  location: new Vector3(204, 0.5, 214),
  rotation: makeEulerWithRandomYRotation(),
})

itemList.push({
  id: generateUUID(),
  level: 'the_cheddaverse' as LevelName,
  location: new Vector3(118, 0.5, 74),
  rotation: makeEulerWithRandomYRotation(),
})

itemList.push({
  id: generateUUID(),
  level: 'the_cheddaverse' as LevelName,
  location: new Vector3(193, 0.5, 68),
  rotation: makeEulerWithRandomYRotation(),
})

itemList.push({
  id: generateUUID(),
  level: 'the_cheddaverse' as LevelName,
  location: new Vector3(297, 0.5, 145),
  rotation: makeEulerWithRandomYRotation(),
})

app.get('/', (_req, res) => {
  res.send('you are looking at the websocket server. this is the endpoint the socket.io client should connect to to send and receive messages.');
});

io.on('connection', async (socket) => {
  const level = socket.handshake.query.requestedLevel?.toString() || 'lab'
  socket.join(level)
  const skinNumber = parseInt(<string>socket.handshake.query.skin || "0", 10)
  playerList.push({ member_id: socket.handshake.auth.token, skin: skinNumber, level })
  console.log(playerList)
  console.log(`CLIENT CONNECTED.    total sockets: ${playerList.length}`)
  io.emit('serverInfo', Date.now());
  io.to(socket.id).emit('itemListInit', itemList);
  io.to(level).emit('playerList', playerList.filter((p) => p.level === level));
  io.to(level).emit('playerConnected', { member_id: socket.handshake.auth.token, skin: skinNumber, level });

  socket.on('disconnect', async () => {
    const disconnectedPlayerIndex = playerList.findIndex((p) => p.member_id === socket.handshake.auth.token)
    playerList.splice(disconnectedPlayerIndex, 1)
    console.log(playerList)
    console.log(`CLIENT DISCONNECTED. total sockets: ${playerList.length}`)
    io.to(level).emit('playerList', playerList.filter((p) => p.level === level))
    io.to(level).emit('playerDisconnected', socket.handshake.auth.token);
  });

  socket.on('squeak', (n: number) => {
    socket.broadcast.to(level).emit('squeak', socket.handshake.auth.token, n)
  })

  socket.on('playerSentFrameData', (data: any, sentTime: number) => {
    socket.broadcast.to(level).emit('serverSentPlayerFrameData', Date.now(), socket.handshake.auth.token, data, sentTime);
  });

  socket.on('pickupItem', (id: string) => {
    const item = itemList.find((i) => i.id === id)
    if (!item) return
    item.parent = socket.handshake.auth.token
    console.log('item picked up:', item)
    io.emit('itemListUpdate', itemList);
    socket.broadcast.to(level).emit('sfxPickup');
  });

  socket.on('dropItem', (position: Vector3, rotation: Euler) => {
    const i = itemList.find((i) => i.parent && i.parent === socket.handshake.auth.token)
    if (!i) return
    console.log('dropping item')
    delete i.parent
    i.location = position
    i.rotation = rotation
    console.log('item dropped:', i)
    io.emit('itemListUpdate', itemList);
    socket.broadcast.to(level).emit('sfxPutdown');
  });


  socket.on('chatKeystroke', (message: string) => {
    socket.broadcast.to(level).emit('chatKeystroke', message, socket.handshake.auth.token);
  });

  socket.on('chatSay', (message: string) => {
    socket.broadcast.to(level).emit('chatSay', message, socket.handshake.auth.token);
  });
});

server.listen(3000, () => {
  console.log('multiplayer server running at http://localhost:3000');
});
