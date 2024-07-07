import express from 'express';
import { createServer } from 'node:http';
import { Server, } from "socket.io";
import { ServerToClientEvents, ClientToServerEvents, } from './MultiplayerTypes';
import cors from 'cors'
import { Player, Item } from './MultiplayerTypes'
import { generateUUID } from 'three/src/math/MathUtils.js';
import { Euler, Vector3 } from 'three';
import { LevelName } from '../game/Level';
import { Dungeon } from '../game/Dungeon.ts'

const app = express();
app.use(cors())
const server = createServer(app);
const playerList: Player[] = []
let mazeAsString: string = ''
const itemList: Item[] = []
const batteryList: Item[] = []
const io = new Server<
  ClientToServerEvents,
  ServerToClientEvents
>(server, {
  cors: {}
});

function makeEulerWithRandomYRotation() {
  return new Euler(0, Math.PI * Math.random(), 0)
}

const orb: Item = {
  thing: 'orb',
  id: generateUUID(),
  level: 'lab' as LevelName,
  location: new Vector3(7, 0.5, 8),
  rotation: makeEulerWithRandomYRotation(),
}

itemList.push(orb)


for (let i = 0; i < 5; i++) {
  const battery: Item = {
    thing: 'battery',
    id: generateUUID(),
    level: 'lab' as LevelName,
    location: new Vector3(6 + i * 1.5, 0.5, 11),
    rotation: new Euler(0, Math.PI * -0.25, 0),
  }
  batteryList.push(battery)
  itemList.push(battery)
}

let dungeon = new Dungeon(15, 15)

function distributeItems(dungeon: Dungeon) {
  const tileSize = 7;
  orb.location = new Vector3(dungeon.centerX * tileSize, 0.5, dungeon.centerY * tileSize)
  const deadEnds = dungeon.getDeadEnds()
  console.log(`shuffling ${itemList.length} items into ${deadEnds.length} slots`)
  deadEnds.forEach((p, i) => {
    const item = itemList[i % (itemList.length)]
    if (item === orb) return
    item.location = new Vector3(p.x * tileSize, 0.5, p.y * tileSize)
  })
}



app.get('/', (_req, res) => {
  res.send('you are looking at the websocket server. this is the endpoint the socket.io client should connect to to send and receive messages.');
});

io.on('connection', async (socket) => {
  const level = socket.handshake.query.requestedLevel?.toString() || 'lab'
  const itemsOwnedByPlayer = itemList.filter((i) => i.parent === socket.handshake.auth.token)

  itemsOwnedByPlayer.forEach((item) => {
    item.level = level as LevelName
  })

  socket.join(level)
  const skinNumber = parseInt(<string>socket.handshake.query.skin || "0", 10)
  playerList.push({ member_id: socket.handshake.auth.token, skin: skinNumber, level })
  console.log(playerList)
  console.log(`CLIENT CONNECTED.    total sockets: ${playerList.length}`)
  io.emit('serverInfo', Date.now());
  const playerListForThisLevel = playerList.filter((p) => p.level === level)
  io.to(level).emit('playerList', playerListForThisLevel);
  io.to(level).emit('playerConnected', { member_id: socket.handshake.auth.token, skin: skinNumber, level });

  if (playerListForThisLevel.length === 1) {
    dungeon = new Dungeon(15, 15)
    distributeItems(dungeon)
    mazeAsString = dungeon.asString().replace(/#/g, ' ').replace(/\./g, '#')
  }

  io.to(socket.id).emit('itemListInit', itemList);
  io.to(level).emit('newMaze', mazeAsString)

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
