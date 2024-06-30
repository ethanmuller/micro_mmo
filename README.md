# Installation & Development

To start vite:

```
npm install
npm run dev
```

This will start vite, and will hot-reload changes.
It will also concurrently run the multiplayer server.

Starting this process will print out an IP address that you can use to visit the game client via other devices on the same network as your server. If your phone shares a network with the computer running a server, you can scan the QR code in the terminal to join the game.

# Deploy
You must have ssh access to mush.network. From a local machine, run:

```
npm run build
scp -r dist/* me@mush.network:public/mouse
```

This will build the client statically, then copy the built files up to the server.
