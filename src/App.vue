<script setup lang="ts">
import {ref, onMounted, onBeforeUnmount} from 'vue';
import * as THREE from 'three';
import { Mouse, SerializedPlayerData } from './game/Mouse';
import { Time } from './game/Time';
import skyTexture from './assets/sky_gradient.png';
import mouseTexture from "./assets/mouse_texture.png";
import { MultiplayerClient } from './game/MultiplayerClient';
import { InputManager } from './game/InputManager';
import { FreeCamera } from './game/FreeCamera';
const NETWORK_TIME_BETWEEN_UPDATES = 1/15; // 1/timesPerSecond
let lastNetworkUpdate = 0;

const logs = ref("Not connected to the multiplayer server")

const gamecanvas = ref<HTMLDivElement>();
const trackballEl = ref<HTMLDivElement>();

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
const player = new Mouse(scene, imgLoader);

//camera.position.x = 10;
const cameraWantedDisplacement = new THREE.Vector3(0,10,10);
camera.position.copy(cameraWantedDisplacement);
camera.lookAt(new THREE.Vector3(0,0,0));
camera.updateProjectionMatrix();
const freeCamera = new FreeCamera(camera);
const cameraPivot = new THREE.Object3D();
cameraPivot.add(camera);
cameraPivot.quaternion.setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI*0.75)
scene.add(cameraPivot);

const mp = new MultiplayerClient()
let playerIdToPlayerObj : Map<string, Mouse> = new Map<string, Mouse>();
mp.onRemotePlayerConnected((id) => {
  playerIdToPlayerObj.set(id, new Mouse(scene, imgLoader));
});
mp.onRemotePlayerFrameData((id, data, sentTimeMs) => {
  let playerObj = playerIdToPlayerObj.get(id);
  if (playerObj) {
    
    let info = data as SerializedPlayerData;
    playerObj.onRemotePlayerData(info, (mp.serverTimeMs() - sentTimeMs)/1000, gameTime);
  }
});
mp.onRemotePlayerDisconnected((id) => {
  let pO = playerIdToPlayerObj.get(id);
  if (pO) {
    pO.dispose();
  }
  playerIdToPlayerObj.delete(id);
});

const sun = new THREE.DirectionalLight();
sun.quaternion.setFromAxisAngle(new THREE.Vector3(0,0,1), Math.PI * 0.1);
scene.add(sun);

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
let input: InputManager

function mainLoop()
{
  var now = new Date().getTime();
  gameTime.deltaTime = (now - lastTickTime) / 1000;
  gameTime.deltaTime = Math.min(1/12, gameTime.deltaTime); // Prevent big time jumps
  gameTime.time += gameTime.deltaTime;
  //gameTime.serverTime += gameTime.deltaTime; Maybe unessesary?
  gameTime.serverTime = mp.serverTimeMs()/1000;
  lastTickTime = now;

  // update
	player.update(gameTime, worldBoundaries, input, camera);

  playerIdToPlayerObj.forEach((plObj : Mouse, id: string) => {
    plObj.update(gameTime, worldBoundaries);
  })

  // Camera updates
  player.object.getWorldPosition(cameraPivot.position);
  //cameraPivot.position.copy(player.object.position);
  if (input.flyCameraButton.pressedThisFrame) {
    freeCamera.enabled = !freeCamera.enabled;
    console.log(`Free camera ${freeCamera.enabled? "enabled" : "disabled"}`);

    if (!freeCamera.enabled) {
      // camera.removeFromParent();
      // cameraPivot.add(camera);
      camera.position.copy(cameraWantedDisplacement);
      camera.lookAt(player.object.position);
      camera.updateProjectionMatrix();
    }
    else {
      // camera.removeFromParent();
      // scene.add(camera);
    }
  }

  if (freeCamera.enabled) {
    freeCamera.update(gameTime, input);
    camera.updateMatrix();
    camera.updateProjectionMatrix();
  }

  // draw
	renderer.render( scene, camera );

  // send info to the server if it's time
  if (gameTime.time - lastNetworkUpdate > NETWORK_TIME_BETWEEN_UPDATES)
  {
    mp.sendLocalPlayerFrameData(player.serializePlayerData());

    lastNetworkUpdate = gameTime.time;
  }

  input.update(gameTime);
  //
  requestAnimationFrame(mainLoop);
}

onMounted(() => {
  if (trackballEl.value) {
    input = new InputManager(trackballEl.value);
  }

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
    <div id="logbox">
      {{ mp.localPlayerDisplayString.value }}
      {{ mp.playersOnline.value }}
    </div>
    <div ref="trackballEl" id="trackball"></div>
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
  #trackball {
    position:absolute;
    left: 0;
    top:0;
    width: 100%;
    height: 100dvh;
  }
</style>
