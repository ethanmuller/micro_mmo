<script setup lang="ts">
import {ref, onMounted, onBeforeUnmount} from 'vue'
import * as THREE from 'three';
import { GreenCube, SerializedPlayerData } from './game/greencube';
import { Time } from './game/Time';
import skyTexture from './assets/sky_gradient.png';
import mouseTexture from "./assets/mouse_texture.png";
import { MultiplayerClient } from './game/MultiplayerClient';
import { InputManager } from './game/InputManager';

const NETWORK_TIME_BETWEEN_UPDATES = 1/15; // 1/timesPerSecond
let lastNetworkUpdate = 0;

const logs = ref("Not connected to the multiplayer server")

const gamecanvas = ref<HTMLDivElement>();

const camera = new THREE.PerspectiveCamera( 75, 1, 0.1, 1000 );
const renderer = new THREE.WebGLRenderer();
renderer.setSize( 256, 256 );
renderer.setPixelRatio(2)

const scene = new THREE.Scene();
const imgLoader = new THREE.TextureLoader();
imgLoader.loadAsync(skyTexture).then((tex) => {
  tex.magFilter = THREE.LinearFilter;
  scene.background = tex;
});
const player = new GreenCube(scene, imgLoader);

camera.position.z = 7;
camera.position.y = 7;
camera.lookAt(new THREE.Vector3(0,0,0));
camera.updateProjectionMatrix();
const cameraPivot = new THREE.Object3D();
cameraPivot.add(camera);
scene.add(cameraPivot);

const mp = new MultiplayerClient()
let playerIdToPlayerObj : Map<string, GreenCube> = new Map<string, GreenCube>();
mp.onRemotePlayerConnected((id) => {
  playerIdToPlayerObj.set(id, new GreenCube(scene, imgLoader));
});
mp.onRemotePlayerFrameData((id, data) => {
  let playerObj = playerIdToPlayerObj.get(id);
  if (playerObj) {
    
    let info = data as SerializedPlayerData;
    playerObj.onRemotePlayerData(info);
  }
});
mp.onRemotePlayerDisconnected((id) => {
  let pO = playerIdToPlayerObj.get(id);
  if (pO) {
    pO.dispose();
  }
  playerIdToPlayerObj.delete(id);
});

camera.position.z = 5;

//scene.add(new THREE.DirectionalLight());

const floor = new THREE.Object3D();
const worldBoundaries = new THREE.Box2(new THREE.Vector2(-50, -30), new THREE.Vector2(50, 30));
var worldSize = new THREE.Vector2();
worldBoundaries.getSize(worldSize);
floor.add(new THREE.Mesh(new THREE.PlaneGeometry(worldSize.width,worldSize.height), new THREE.MeshBasicMaterial({color : 0x775577, map: imgLoader.load(mouseTexture), })));
floor.rotation.x -= Math.PI/2;
scene.add(floor);

var gameTime = <Time>({
  deltaTime: 0,
  time: 0,
  serverTime: 0
});

let lastTickTime = new Date().getTime();
let input = new InputManager();

function mainLoop()
{
  var now = new Date().getTime();
  gameTime.deltaTime = (now - lastTickTime) / 1000;
  gameTime.deltaTime = Math.min(1/12, gameTime.deltaTime); // Prevent big time jumps
  gameTime.time += gameTime.deltaTime;
  gameTime.serverTime += gameTime.deltaTime;
  lastTickTime = now;

  input.update();

  // update
	player.update(gameTime, worldBoundaries, input);

  playerIdToPlayerObj.forEach((plObj : GreenCube, id: string) => {
    plObj.update(gameTime, worldBoundaries);
  })

  // Camera updates
  cameraPivot.position.copy(player.object.position);
  camera.updateProjectionMatrix();

  // draw
	renderer.render( scene, camera );

  // send info to the server if it's time
  if (gameTime.time - lastNetworkUpdate > NETWORK_TIME_BETWEEN_UPDATES)
  {
    mp.sendLocalPlayerFrameData(player.serializePlayerData());

    lastNetworkUpdate = gameTime.time;
  }
  //
  requestAnimationFrame(mainLoop);
}

onMounted(() => {
  if (gamecanvas.value) {
    gamecanvas.value.appendChild( renderer.domElement );
    onWindowResize();
    mainLoop();
  }
});

onBeforeUnmount(() => {
  mp.disconnect();
})

function onWindowResize () : void {
    renderer.setSize(window.innerWidth, window.innerHeight);
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
}

addEventListener("resize",onWindowResize,false);

</script>

<template>
  <div>
    <div ref="gamecanvas" id="gamecanvas"></div>
    <div id="logbox">{{ mp.localPlayerDisplayString.value }} {{ mp.playersOnline.value }}</div>
  </div>
</template>

<style scoped>
  #gamecanvas {
    position:absolute;
    left: 0;
    top:0;
  }
  #logbox {
    position:absolute;
    left: 0;
    top:0;
    mix-blend-mode: difference;
    font-family: monospace;
    font-size: 1rem;
    padding: 1rem;
  }
</style>
