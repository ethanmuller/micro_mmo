<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, nextTick } from 'vue';
import * as THREE from 'three';
import { Mouse, MouseSkin, SerializedPlayerData } from './game/Mouse';
import { Time } from './game/Time';
import { MultiplayerClient } from './game/MultiplayerClient';
import { InputManager } from './game/InputManager';
import { Battery } from './game/Battery.ts';
import { Player } from './server/MultiplayerTypes'
import { DEFAULT_LEVEL, Level, LevelMetaData, levels } from './game/Level';
import { useSessionStore } from "./stores/session.ts";
import { useSettingsStore } from "./stores/settings.ts";
import { useCrumbStore } from "./stores/crumb.ts";
import { useSeedStore } from "./stores/seed.ts";
import { useLogStore } from "./stores/logs";
import toonTexture from "./assets/threeTone_bright.jpg";
import { NearestFilter } from 'three';
import QrcodeVue from 'qrcode.vue'
import { EffectComposer, RenderPass, RGBELoader, ShaderPass, GammaCorrectionShader, CSS2DRenderer, } from 'three/examples/jsm/Addons.js';
import { CameraMovement } from './game/CameraMovement.ts';
import { CircleTransitionShader } from './game/shaders/CircleTransitionShader';
import * as TWEEN from '@tweenjs/tween.js';
import * as Tone from "tone";

const NETWORK_TIME_BETWEEN_UPDATES = 1 / 15; // 1/timesPerSecond
let lastNetworkUpdate = 0;

const minimapText = ref<string>();
const gamecanvas = ref<HTMLDivElement>();
const chat_renderer = ref<HTMLDivElement>();
const trackballEl = ref<HTMLDivElement>();
const chat_input = ref<HTMLInputElement>();
const host = ref<string>();
const playerChatInput = ref<string>();
const settingsPanelOpen = ref<boolean>(false);
const chatBoxOpen = ref<boolean>(false);
const qrCodeBigger = ref<boolean>(false);
const settings = useSettingsStore()
const logs = useLogStore()

let str = 'ESTABLISHING ENCRYPTED CONNECTION...'
str += window.location.toString().match(/^https/) ? 'OK' : 'ERROR'
logs.add(str)

const camera = new THREE.PerspectiveCamera(110, 1, 0.1, 1000);
const renderer = new THREE.WebGLRenderer();
const scene = new THREE.Scene();
const composer = new EffectComposer(renderer);
composer.setPixelRatio(window.devicePixelRatio);
composer.setSize(256, 256);
composer.addPass(new RenderPass(scene, camera));
const gammaCorrectionPass = new ShaderPass(GammaCorrectionShader);  
composer.addPass(gammaCorrectionPass);
const circleFade = new ShaderPass(CircleTransitionShader);
composer.addPass(circleFade);
circleFade.uniforms.fadeOut.value = 0.0;


scene.background = new THREE.Color(0xddddee)

const urlParams = new URLSearchParams(window.location.search);
const requestedLevelString = urlParams.get('level')
const levelName = requestedLevelString || DEFAULT_LEVEL;
const requestedLevelMetadata: LevelMetaData = levels[levelName]

let textRenderer: CSS2DRenderer

let closestObj: THREE.Object3D | THREE.Group | null = null;

new RGBELoader()
	.load(requestedLevelMetadata.sky.toString(), function (texture) {

    // trying to make the colors look less overexposed, but this doesn't seem to work
    texture.colorSpace = THREE.LinearSRGBColorSpace

		texture.mapping = THREE.EquirectangularReflectionMapping;

		scene.background = texture;
		scene.environment = texture;
		scene.backgroundBlurriness = 0.0
	});

const imgLoader = new THREE.TextureLoader();

const toonRamp = imgLoader.load(toonTexture, (texture) => {
	texture.minFilter = NearestFilter;
	texture.magFilter = NearestFilter;
});

let level = new Level(requestedLevelMetadata, toonRamp);
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
let loadingNewLevel = false;

const seedStore = useSeedStore()

if (!seedStore.seed) {
  seedStore.generateSeed(skinList.length - 1)
}

const player = new Mouse(scene, toonRamp, skinList[seedStore.seed || 0], true);
let circleFadeTween : TWEEN.Tween<{value: number}>;
player.onDoorEnterCallback = (d : string) => {
	circleFade.uniforms.fadeOut.value = 0;
	circleFadeTween = new TWEEN.Tween(circleFade.uniforms.fadeOut).to({value: 1}, 300).onComplete(() => {
		const u = new URL(window.location.toString())
		let newLevelName = level.getDoorName(d);
		u.searchParams.set('level', newLevelName)
		window.location.href = u.toString();
		loadingNewLevel = true;
		console.log(`loading level ${newLevelName}...`);
	}).start()
}

function findClosestObject(player: Mouse, objects: Array<THREE.Object3D>): THREE.Object3D | THREE.Group | null {
    let closestObject = null;
    let closestDistance = Infinity;

    objects.forEach((object: THREE.Object3D) => {
        const distance = player.object.position.distanceTo(object.position);
        if (distance < closestDistance) {
            closestDistance = distance;
            closestObject = object;
        }
    });

    return closestObject;
}

const contextActionableItems: Array<THREE.Object3D> = []

const contextCursor = new THREE.Mesh(
new THREE.RingGeometry(1.3, 1.4),
new THREE.MeshBasicMaterial({ color: 0x00ff00 })
)
contextCursor.position.set(30, 0.5, 60)
contextCursor.renderOrder = 1;
contextCursor.material.depthTest = false;
const pickupRadius = 3
scene.add(contextCursor)

const b = new Battery()
b.rotateX(Math.PI/2)
const g = new THREE.Group()
g.position.set(30, 0.5, 60)
// g.rotation.y = (Math.random()*10)
g.add(b)
scene.add(g)
contextActionableItems.push(g)

const b2 = new Battery()
b2.rotateX(Math.PI/2)
const g2 = new THREE.Group()
g2.position.set(32, 0.5, 40)
// g2.rotation.y = (Math.random()*10)
g2.add(b2)
scene.add(g2)
contextActionableItems.push(g2)

const b3 = new Battery()
b3.rotateX(Math.PI/2)
const g3 = new THREE.Group()
g3.position.set(27, 0.5, 32)
// g3.rotation.y = (Math.random()*10)
g3.add(b3)
scene.add(g3)
contextActionableItems.push(g3)

// watch(playerChatInput, function(_, newMessage) {
//   player.div.textContent = newMessage || ''
// })

const sessionInfo = useSessionStore();
let foundEntryPoint = false;
if (sessionInfo.previousRoom != null && sessionInfo.previousRoom != "") {
  if (level.getDoorChar(sessionInfo.previousRoom) != '') {
    console.log(`coming from level ${sessionInfo.previousRoom}`);
    foundEntryPoint = true;
    let dt = level.getDoorTile(sessionInfo.previousRoom);
    level.getWorldPositionFromTile(dt, player.object.position);

    player.animateOutOfDoor(level.getDoorChar(sessionInfo.previousRoom));
    circleFade.uniforms.fadeOut.value = 1;
    circleFadeTween = new TWEEN.Tween(circleFade.uniforms.fadeOut).to({value: 0}, 2000).start();
  }
}

if (!foundEntryPoint)
  level.getWorldPositionFromTile(level.start, player.object.position);

sessionInfo.previousRoom = levelName;
sessionInfo.cameraMode = requestedLevelMetadata.cameraType

const crumbs = useCrumbStore()

function welcomeBack() {
  const lastSeen = new Date(crumbs.lastSeen)
  const now = new Date()
  const msSinceLastSeen = now.getTime() - lastSeen.getTime()
  logs.add(`${secondsMinutesHours(msSinceLastSeen)} since last clock in`)
}

let presenceTimer = window.setInterval(crumbs.see, 1000)

window.addEventListener('blur', () => {
  window.clearInterval(presenceTimer)
})
window.addEventListener('focus', () => {
  welcomeBack()
  presenceTimer = window.setInterval(crumbs.see, 1000)
})

function formatDecimalPlaces(num: number) {
  return (Math.round(num * 100) / 100).toFixed(2);
}

function secondsMinutesHours(ms: number): string {
  // given a number of milliseconds, return it in terms of seconds, minutes, or hours
  const seconds = ms/1000
  const minutes = seconds/60
  const hours = minutes/60


  if (minutes > 60) {
    return `${formatDecimalPlaces(hours)} hours`
  } else if (seconds > 60) {
    return `${formatDecimalPlaces(minutes)} minutes`
  }

  return `${seconds} seconds`
}


if (crumbs.lastSeen) {
  welcomeBack()
}

const cameraMovement = new CameraMovement(camera, player, level);

const mp = new MultiplayerClient(seedStore.seed || 0, requestedLevelMetadata.name || DEFAULT_LEVEL)
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

mp.connection.on('squeak', (id: string, _: number) => {
	let playerObj = playerIdToPlayerObj.get(id);
	if (playerObj) {
    playerObj.squeak()
  }
})

mp.onRemotePlayerDisconnected((id) => {
	let pO = playerIdToPlayerObj.get(id);
	if (pO) {
		pO.dispose();
	}
	playerIdToPlayerObj.delete(id);
});

mp.onChatFromPlayer((message: string, id: string) => {
	let thatPlayer = playerIdToPlayerObj.get(id);
  if (thatPlayer && thatPlayer.div) {
    thatPlayer.div.textContent = message
  }
});

const sun = new THREE.DirectionalLight();
sun.intensity = Math.PI
sun.quaternion.setFromAxisAngle(new THREE.Vector3(0, 0, 1), Math.PI * 0.1);
scene.add(sun);
let axesHelper = new THREE.AxesHelper();
//scene.add(axesHelper);

var gameTime = <Time>({
	deltaTimeMs : 0,
	deltaTime: 0,
	time: 0,
	timeMs: 0,
	serverTime: 0
});

let lastTickTime = new Date().getTime();
let input: InputManager


let axesHelperV2 = new THREE.Vector2();

function mainLoop(reportedTime : number) {
	let now = new Date().getTime();

  closestObj = findClosestObject(player, contextActionableItems)

  if (closestObj && closestObj.position.distanceTo(player.object.position) < pickupRadius) {
    contextCursor.position.copy(closestObj.position)
  } else {
    contextCursor.position.set(-999, 0, -999)
  }

  contextCursor.lookAt(camera.position)

	gameTime.deltaTimeMs = Math.min(90, now - lastTickTime);// Prevent big time jumps
	gameTime.timeMs += gameTime.deltaTimeMs;
	gameTime.deltaTime = gameTime.deltaTimeMs / 1000;
	gameTime.time += gameTime.deltaTime;
	//gameTime.serverTime += gameTime.deltaTime; Maybe unessesary?
	gameTime.serverTime = mp.serverTimeMs() / 1000;
	lastTickTime = now;

	// update
	TWEEN.update(reportedTime);

  //let mouseTiles: [number, number]
  //const reusableTile = new THREE.Vector2()

	playerIdToPlayerObj.forEach((mouse: Mouse) => {
    // loop through all players and update them
		mouse.update(gameTime, level);
	})

	player.update(gameTime, level, input, camera, playerIdToPlayerObj);

  if (settings.showMinimap) {
    minimapText.value = level.renderMinimap(player)
  }

	// Camera updates
	let axesTile = level.getTileFromWorldPosition(player.object.position, axesHelperV2);
	level.getWorldPositionFromTile(axesTile, axesHelper.position);



  cameraMovement.update(player, level);

	// draw
	//circleFade.uniforms.fadeOut.value = (Math.sin(gameTime.time) + 1) / 2;
	
	circleFade.enabled = circleFade.uniforms.fadeOut.value > 0;
	composer.render();

  if (settings.enableChat) {
    textRenderer?.render(scene, camera)
  }

	// send info to the server if it's time
	if (gameTime.time - lastNetworkUpdate > NETWORK_TIME_BETWEEN_UPDATES) {
		mp.sendLocalPlayerFrameData(player.serializePlayerData());

		lastNetworkUpdate = gameTime.time;
	}

	input.update();
	//
	if (!loadingNewLevel)
		requestAnimationFrame(mainLoop);
}

function contextAction() {
  closestObj = findClosestObject(player, contextActionableItems)

  if (closestObj && closestObj.position.distanceTo(player.object.position) < pickupRadius) {
    pickup(closestObj)
  } else {
    sendSqueak()
  }
}

function pickup(thing: THREE.Object3D) {
              alert(thing.id)
}

function sendSqueak() {
  Tone.start()
  player.squeak()
  mp.connection.emit('squeak', player.chirpIndex)
}

function sendItemListChangeRequest() {
}

onMounted(() => {
  textRenderer = new CSS2DRenderer({ element: chat_renderer.value })
  textRenderer.setSize(window.innerWidth, window.innerHeight)
  textRenderer.domElement.style.position = 'absolute';
  textRenderer.domElement.style.top = '0px';
  textRenderer.domElement.style.left = '0px';
  textRenderer.domElement.style.zIndex = '1';
  textRenderer.domElement.style.color = 'white';
  textRenderer.domElement.style.textShadow = '0 0 10px black';
  textRenderer.domElement.style.pointerEvents = 'none';
  textRenderer.domElement.textContent = ''
  document.getElementById('app')?.appendChild( textRenderer.domElement );

  document.addEventListener('contextAction', contextAction)

	host.value = window.location.toString()

	if (trackballEl.value) {
		input = new InputManager(trackballEl.value);
	}

	if (gamecanvas.value) {
		gamecanvas.value.appendChild(renderer.domElement);
		onWindowResize();
		mainLoop(0);
	}
});

onBeforeUnmount(() => {
	mp.disconnect();
  document.removeEventListener('contextAction', contextAction)
})

function onWindowResize(): void {
	const minFov = 80
	const maxFov = 100
	const width = window.innerWidth;
	const height = window.innerHeight;
	const ar = width / height;
	const fov = Math.max(Math.min(90 / ar, maxFov), minFov)
	camera.fov = fov
	camera.aspect = ar;
	camera.updateProjectionMatrix();
	renderer.setSize(width, height)
	renderer.setPixelRatio(window.devicePixelRatio);
	composer.setSize(width, height);
	composer.setPixelRatio(window.devicePixelRatio);

	circleFade.uniforms.aspectRatio.value = ar;
	circleFade.uniforms.halfHeightRelativeRadius.value = Math.sqrt(width * width + height * height)/height/2;

  textRenderer?.setSize(window.innerWidth, window.innerHeight)
}

addEventListener("resize", onWindowResize, false);

function settingsToggle() {
	settingsPanelOpen.value = !settingsPanelOpen.value
}

function updateChat(e: Event) {
  const message = (e.target as HTMLInputElement).value
  player.div.textContent = message
  mp.chat(message)
}

function handleKey(e: KeyboardEvent) {
  if (e.key === 'Enter') {
    if (playerChatInput.value === '') {
      chatBoxOpen.value = false
    } else {
      playerChatInput.value = ''
      player.div.textContent = ''
      mp.chat('')
      return 0
    }
  }
}

function openChatBox() {
  chatBoxOpen.value = true
  
  nextTick(() => {
    chat_input.value?.focus()
  })

  window.setTimeout(() => {
  }, 10)
}

</script>

<template>
	<div>
		<div ref="gamecanvas" id="gamecanvas"></div>
		<canvas id="auxcanvas"></canvas>
		<div ref="trackballEl" id="trackball"></div>
    <div class="bottom-A" v-show="!chatBoxOpen">
      <button class="app-icon" v-if="settings.enableChat" @click="openChatBox">
        <div>💬</div>
      </button>
      <div class="nametag">
        <qrcode-vue :value="host" @click="qrCodeBigger = !qrCodeBigger" class="qr"
          :size="qrCodeBigger ? 150 : 50"></qrcode-vue>
        <div class="nametag__text">
          <span class="longstring">{{ mp.localPlayerDisplayString.value }}</span><br />{{
          mp.playersOnline.value }}
        </div>
      </div>
    </div>
    <div class="minimap" v-if="settings.showMinimap && !chatBoxOpen">{{ minimapText }}</div>
    <div class="chat-box" v-show="chatBoxOpen">
      <button arial-label="close chat" class="chat-box__close-button" @click="chatBoxOpen = false">&times;</button>
      <input ref="chat_input" class="chat-input" type="text" v-model="playerChatInput" @input="updateChat" @keydown="handleKey" />
    </div>
		<div class="logs" v-if="settings.showLogs">
			<span v-for="message in logs.messages.slice(0, 6).reverse()">{{ message }}</span>
		</div>
		<div class="settings">
			<div class="settings__panel" v-if="settingsPanelOpen">

				<label>
					<input type="checkbox" v-model="settings.showMinimap" />
					show minimap
				</label>

				<label>
					<input type="checkbox" v-model="settings.enableChat" />
					enable chat
				</label>

				<label>
					<input type="checkbox" v-model="settings.showLogs" />
					show logs
				</label>

				<div>
					<label>
						<input type="checkbox" v-model="settings.invertControls" />
						invert controls
					</label>
					<span class="settings__hint">{{ settings.invertControls ? `You control the
						level` : `You
						control the mouse`}}</span>
				</div>
			</div>
			<button class="settings__toggle" @click="settingsToggle">⚙️ settings</button>
		</div>
    <div ref="chat_renderer" v-show="settings.enableChat"></div>
	</div>
</template>

<style scoped>
.logs {
	box-sizing: border-box;
	width: 100%;
	position: absolute;
	color: white;
	transform: translate3d(0, 0, 0);
	pointer-events: none;
	top: 0;
	left: 0;
	padding: 1rem;
	font-family: monospace;
	color: #00ff00;
	font-size: 0.8rem;
	text-align: left;
	white-space: pre;
	min-height: 8rem;
	display: flex;
	flex-direction: column;
	justify-content: end;
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

.bottom-A {
	position: fixed;
	bottom: 0;
	left: 0;
  display: flex;
  flex-direction: column;
  align-items: start;
}

.nametag {
	display: flex;
	text-align: left;
	padding: 0em;
	color: black;
	background: #ffffcc;
	border: 0.75em #ffffcc solid;
	white-space: pre;
}

.app-icon {
  background: #14c131;
  border-radius: 6px;
  width: 4rem;
  height: 4rem;
  color: white;
  display: flex;
  justify-content: center;
  align-items: center;
  margin-bottom: 0.5rem;
  margin-left: 0.5rem;
  font-size: 2rem;
  user-select: none;
  border: none;
}

.qr {
	padding: 0 0.75em 0 0;
	mix-blend-mode: multiply;
	opacity: 0.8
}

.settings {
	position: absolute;
	width: 50%;
	top: 0;
	right: 0;
	display: flex;
	flex-direction: column;
	align-items: end;
}

.settings__panel {
	width: 100%;
	display: flex;
	flex-direction: column;
	align-items: start;
	background: white;
	color: black;
	padding: 1rem;
}

.settings__panel>* {
	margin-top: 1rem;
}

.settings__hint {
	font-size: 0.8rem;
	padding-left: 1.5rem;
	opacity: 0.5;
}

.settings__panel label {
	display: block;
	width: 100%;
	text-align: left;
}

.settings__toggle {
  font-size: 0.75rem;
	background: white;
	color: black;
	padding: 1rem;
	border: none;
	border-radius: 0 0 1rem 1rem;
	margin-right: 0.5rem;
}

.minimap {
  position: absolute;
  bottom: 0;
  right: 0;
  color: white;
  white-space: pre;
  text-align: left;
  line-height: 1;
  font-family: monospace;
  pointer-events: none;
  padding-right: 1em;
  padding-bottom: 1em;
}

.chat-box {
  position: fixed;
  bottom: 0;
  left: 0;
  width: 100%;
  padding-top: 3rem;
  padding-bottom: 4rem;
  background: white;
  z-index: 999; /* todo: don't do this */
}

.chat-box__close-button {
  position: absolute;
  top: 0;
  right: 0;
  padding: 0.3rem 1rem;
  font-size: 2rem;
  background: none;
  border: none;
}

.chat-input {
  appearance: none;
  font-size: 16px;
  background: #2f90f7;
  border: none;
  border-radius: 4rem;
  padding: 0.5rem 1rem;
  color: white;
  outline: none;
  width: 13rem;
}
</style>
