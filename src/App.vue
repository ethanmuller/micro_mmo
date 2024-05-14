<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue';
import * as THREE from 'three';
import { Mouse, MouseSkin, SerializedPlayerData } from './game/Mouse';
import { Time } from './game/Time';
import { MultiplayerClient } from './game/MultiplayerClient';
import { InputManager } from './game/InputManager';
import { FreeCamera } from './game/FreeCamera';
import { Player } from './server/MultiplayerTypes'
import { Level } from './game/Level';
import level_ascii from './assets/level_ascii.txt?raw'
import toonTexture from "./assets/threeTone_bright.jpg";
import { NearestFilter } from 'three';
import QrcodeVue from 'qrcode.vue'
import { RGBELoader } from 'three/examples/jsm/Addons.js';
import { CameraMovement } from './game/CameraMovement';
const NETWORK_TIME_BETWEEN_UPDATES = 1 / 15; // 1/timesPerSecond
let lastNetworkUpdate = 0;

const gamecanvas = ref<HTMLDivElement>();
const trackballEl = ref<HTMLDivElement>();
const messages = ref<string[]>([]);
const host = ref<string>();

function log(msg: string) {
  messages.value.unshift(msg)
}

log('logging enabled')
document.addEventListener('press', (e) => {
//   log(`${e.oldVelocity.length()}`)
})

function formatDecimalPlaces(num: number) {
  return (Math.round(num * 100) / 100).toFixed(2);
}
document.addEventListener('flick', (e) => {
	// TODO: make a proper custom flick event that lets us pass velocity around, without complaining about the fact that there's no velocity on the Event type.
  log(`FLICK VECTOR: x:${formatDecimalPlaces( e.velocity.x )} y: ${formatDecimalPlaces(e.velocity.y)}`)
})

const camera = new THREE.PerspectiveCamera(110, 1, 0.1, 1000);
const renderer = new THREE.WebGLRenderer();
renderer.setSize(256, 256);
renderer.setPixelRatio(2)
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 0.6;

const scene = new THREE.Scene();

scene.background = new THREE.Color(0xddddee)

new RGBELoader()
	.load('/vintage_measuring_lab_1k.hdr', function ( texture ) {

		texture.mapping = THREE.EquirectangularReflectionMapping;

		scene.background = texture;
		scene.environment = texture;
		scene.backgroundBlurriness = 0.06
	});

const imgLoader = new THREE.TextureLoader();

const toonRamp = imgLoader.load(toonTexture, (texture) => {
	texture.minFilter = NearestFilter;
	texture.magFilter = NearestFilter;
});

let level = new Level(level_ascii, toonRamp);
scene.add(level.object);

const skinList: Array<MouseSkin> = [
	{ skinColor: 0xffaaaa, eyeColor: 0x880000, furColor: 0xffffff }, // lab mouse
	{ skinColor: 0xffaaaa, eyeColor: 0x000000, furColor: 0x453a38 }, // dark gray
	{ skinColor: 0xffaaaa, eyeColor: 0x000000, furColor: 0xb95b48 }, // light brown
	{ skinColor: 0xffaaaa, eyeColor: 0x000000, furColor: 0x542c24 }, // dark brown
	{ skinColor: 0xca7373, eyeColor: 0x000000, furColor: 0xc3c3c3 }, // light gray
	{ skinColor: 0xffaaaa, eyeColor: 0x000000, furColor: 0xc29e7c }, // cardboard brown
	{ skinColor: 0xcc8888, eyeColor: 0x000000, furColor: 0x646464 }, // classic gray
]
const seed = getRandomInt(skinList.length - 1)
const player = new Mouse(scene, toonRamp, skinList[seed], true);
level.getWorldPositionFromTile(level.start, player.object.position);

// let cameraWantedDisplacement: THREE.Vector3
// // TODO: check for param change while game is running, not only while initializing
// if (URLParams.get('cam') === 'top') {
// 	cameraWantedDisplacement = new THREE.Vector3(0, 30, 0);
// } else {
// 	cameraWantedDisplacement = new THREE.Vector3(0, 10, 10);
// }

const cameraMovement = new CameraMovement(camera);
const freeCamera = new FreeCamera(camera);

// camera.position.copy(cameraWantedDisplacement);
// camera.lookAt(new THREE.Vector3(0, 0, 0));
// camera.updateProjectionMatrix();

const mp = new MultiplayerClient(seed)
let playerIdToPlayerObj: Map<string, Mouse> = new Map<string, Mouse>();

mp.onPlayerConnected((newPlayer: Player) => {
	if (mp.localPlayer.id == newPlayer.id) { // Local Player

	}
	else { // Remote players
		if (!playerIdToPlayerObj.has(newPlayer.id)) {
			playerIdToPlayerObj.set(newPlayer.id, new Mouse(scene, toonRamp, skinList[newPlayer.skin], false));
		}
	}
});

mp.onRemotePlayerFrameData((id, data) => {
	let playerObj = playerIdToPlayerObj.get(id);
	if (playerObj) {
		let info = data as SerializedPlayerData;
		playerObj.onRemotePlayerData(info, gameTime);
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
sun.intensity = Math.PI
sun.quaternion.setFromAxisAngle(new THREE.Vector3(0, 0, 1), Math.PI * 0.1);
scene.add(sun);
let axesHelper = new THREE.AxesHelper();
//scene.add(axesHelper);

var gameTime = <Time>({
	deltaTime: 0,
	time: 0,
	serverTime: 0
});

let lastTickTime = new Date().getTime();
let input: InputManager

function getRandomInt(max: number) {
	return Math.floor(Math.random() * Math.floor(max + 1));
}

let axesHelperV2 = new THREE.Vector2();
function mainLoop() {
	var now = new Date().getTime();
	gameTime.deltaTime = (now - lastTickTime) / 1000;
	gameTime.deltaTime = Math.min(1 / 12, gameTime.deltaTime); // Prevent big time jumps
	gameTime.time += gameTime.deltaTime;
	//gameTime.serverTime += gameTime.deltaTime; Maybe unessesary?
	gameTime.serverTime = mp.serverTimeMs() / 1000;
	lastTickTime = now;

	// update

	playerIdToPlayerObj.forEach((plObj: Mouse) => {
		plObj.update(gameTime, level);
	})

	player.update(gameTime, level, input, camera, playerIdToPlayerObj);

	// Camera updates
	let axesTile = level.getTileFromWorldPosition(player.object.position, axesHelperV2);
	level.getWorldPositionFromTile(axesTile, axesHelper.position);

	
	
	if (input.flyCameraButton.pressedThisFrame) {
		freeCamera.enabled = !freeCamera.enabled;
		log(`Free camera ${freeCamera.enabled ? "enabled" : "disabled"}`);

		if (!freeCamera.enabled) {
			// camera.removeFromParent();
			// cameraPivot.add(camera);
			// camera.position.copy(cameraWantedDisplacement);
			// camera.lookAt(player.object.position);
			// camera.updateProjectionMatrix();
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
	else {
		cameraMovement.update(gameTime, player, level);
	}

	// draw
	renderer.render(scene, camera);

	// send info to the server if it's time
	if (gameTime.time - lastNetworkUpdate > NETWORK_TIME_BETWEEN_UPDATES) {
		mp.sendLocalPlayerFrameData(player.serializePlayerData());

		lastNetworkUpdate = gameTime.time;
	}

	input.update();
	//
	requestAnimationFrame(mainLoop);
}

onMounted(() => {
	host.value = 'http://'.concat(window.location.host)

	if (trackballEl.value) {
		input = new InputManager(trackballEl.value);
	}

	if (gamecanvas.value) {
		gamecanvas.value.appendChild(renderer.domElement);
		onWindowResize();
		mainLoop();
	}
});

onBeforeUnmount(() => {
	mp.disconnect();
})

function onWindowResize(): void {
	const minFov = 80
	const maxFov = 100
	const fov = Math.max(Math.min(window.innerHeight / window.innerWidth * 90, maxFov), minFov)
	renderer.setSize(window.innerWidth, window.innerHeight);
	camera.fov = fov
	camera.aspect = window.innerWidth / window.innerHeight;
	camera.updateProjectionMatrix();
	renderer.setSize(window.innerWidth, window.innerHeight);
	renderer.setPixelRatio(window.devicePixelRatio);
}

addEventListener("resize", onWindowResize, false);

</script>

<template>
	<div>
		<div ref="gamecanvas" id="gamecanvas"></div>
		<canvas id="auxcanvas"></canvas>
		<div ref="trackballEl" id="trackball"></div>
		<div class="nametag">
			<qrcode-vue :value="host" class="qr" :size="50"></qrcode-vue>
			<div class="nametag__text">
				<span class="longstring">{{ mp.localPlayerDisplayString.value }}</span><br />{{
					mp.playersOnline.value }}
			</div>
		</div>
		<div class="logs">
      <span v-for="message in messages.slice(0,5).reverse()">{{ message }}</span>
		</div>
	</div>
</template>

<style scoped>
.logs {
  box-sizing: border-box;
  width: 100%;
  position: absolute;
	color: white;
  transform: translate3d(0,0,0);
	pointer-events: none;
	top: 0;
	left: 0;
	z-index: 3;
	padding: 1rem;
	font-family: monospace;
  color: #00ff00;
	font-size: 0.8rem;
  text-align: left;
}

.logs span {
  display: block;
}

#gamecanvas {
	position: absolute;
	left: 0;
	top: 0;
}

#auxcanvas {
	display: none;
}

.nametag__text {
	font-family: monospace;
	font-size: 0.8rem;
	display: flex;
	flex-direction: column;
	justify-content: center;
	opacity: 0.8
}

.longstring {
	display: block;
	width: 13ch;
	overflow: hidden;
}

#trackball {
	position: absolute;
	left: 0;
	top: 0;
	width: 100%;
	height: 100dvh;
}

.nametag {
	display: flex;
	text-align: left;
	padding: 0em;
	color: black;
	position: fixed;
	bottom: 0;
	left: 0;
	background: #ffffcc;
	border: 0.75em #ffffcc solid;
	pointer-events: none;
	white-space: pre;
}

.qr {
	padding: 0 0.75em 0 0;
	mix-blend-mode: multiply;
	opacity: 0.8
}
</style>
