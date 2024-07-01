<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, nextTick, watch } from 'vue';
import * as THREE from 'three';
import { Mouse, MouseSkin, SerializedPlayerData } from './game/Mouse';
import { Time } from './game/Time';
import { MultiplayerClient } from './game/MultiplayerClient';
import { InputManager } from './game/InputManager';
import { Battery } from './game/Battery.ts';
import { Item, Player } from './server/MultiplayerTypes'
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

const store = useSeedStore()

if (!store.token) {
	store.generateToken()
}

if (!store.seed) {
	store.generateSeed(skinList.length - 1)
}

let localPickedUpItem: string | undefined | null

const player = new Mouse(scene, toonRamp, skinList[0], true);
let circleFadeTween: TWEEN.Tween<{ value: number }>;
player.onDoorEnterCallback = (d: string) => {
	const playerIsHoldingItem = itemList.some((i) => i.parent === store.token)
	circleFade.uniforms.fadeOut.value = 0;
	circleFadeTween = new TWEEN.Tween(circleFade.uniforms.fadeOut).to({ value: 1 }, 300).onComplete(() => {
		const u = new URL(window.location.toString())
		let newLevelName = level.getDoorName(d);
		u.searchParams.set('level', newLevelName)
		window.location.href = u.toString();
		loadingNewLevel = true;
		console.log(`loading level ${newLevelName}...`);
	}).start()
}

// this maps socket IDs to this client's instances of player objects
let playerIdToPlayerObj: Map<string, Mouse> = new Map<string, Mouse>();

// this maps thingdex IDs to this client's instances of item objects (e.g. the groups containing geometry)
const thingdexIdToThreeObject = new Map<string, THREE.Object3D>()

// this maps three's object id to the thingdex ID
const threeObjIdToThingdexId = new Map<number, string>()

function findClosestObject(player: Mouse, items: Array<Item>): THREE.Object3D | THREE.Group | null {
	let closestObject = null;
	let closestDistance = Infinity;

	items.forEach((item: Item) => {
		const object = thingdexIdToThreeObject.get(item.id)
		if (!object) return
		const distance = player.object.position.distanceTo(object.position);
		if (distance < closestDistance) {
			closestDistance = distance;
			closestObject = object;
		}
	});

	return closestObject;
}

let itemList: Array<Item> = []

const pickupCursor = new THREE.Mesh(
	new THREE.RingGeometry(1.3, 1.4),
	new THREE.MeshBasicMaterial({ color: 0x00ff00 })
)
pickupCursor.position.set(30, 0.5, 60)
pickupCursor.renderOrder = 1;
pickupCursor.material.depthTest = false;
const pickupRadius = 6
scene.add(pickupCursor)

// const b = new Battery()
// b.rotateX(Math.PI/2)
// const g = new THREE.Group()
// g.position.set(30, 0.5, 60)
// // g.rotation.y = (Math.random()*10)
// g.add(b)
// scene.add(g)
// contextActionableItems.push(g)
// 
// const b2 = new Battery()
// b2.rotateX(Math.PI/2)
// const g2 = new THREE.Group()
// g2.position.set(32, 0.5, 40)
// // g2.rotation.y = (Math.random()*10)
// g2.add(b2)
// scene.add(g2)
// contextActionableItems.push(g2)
// 
// const b3 = new Battery()
// b3.rotateX(Math.PI/2)
// const g3 = new THREE.Group()
// g3.position.set(27, 0.5, 32)
// // g3.rotation.y = (Math.random()*10)
// g3.add(b3)
// scene.add(g3)
// contextActionableItems.push(g3)

watch(playerChatInput, function() {
  playerChatInput.value = playerChatInput.value?.slice(0, 42) || ''
})

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
		circleFadeTween = new TWEEN.Tween(circleFade.uniforms.fadeOut).to({ value: 0 }, 2000).start();
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
	const seconds = ms / 1000
	const minutes = seconds / 60
	const hours = minutes / 60


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

const mp = new MultiplayerClient({ token: store.token }, store.seed || 0, requestedLevelMetadata.name || DEFAULT_LEVEL)

const sfxPickup = new Tone.Player('https://mush.network/files/sfx/sfx-pickup.wav', () => {
	mp.connection.on('sfxPickup', () => {
    if (settings.enableSound) {
      sfxPickup.stop()
      sfxPickup.start()
    }
	})
}).toDestination()

const sfxPutdown = new Tone.Player('https://mush.network/files/sfx/sfx-putdown.wav', () => {
	mp.connection.on('sfxPutdown', () => {
    if (settings.enableSound) {
      sfxPutdown.stop()
      sfxPutdown.start()
    }
	})
}).toDestination()

// const sfx = new Tone.Players({
// 	pickup: 'http://mush.network/files/sfx/sfx-pickup.wav',
// 	putdown: 'http://mush.network/files/sfx/sfx-putdown.wav',
// }, () => {
// 		mp.connection.on('sfxPickup', () => {
// 			sfx.get('pickup')
// 		})
// 	}).toMaster()
//
mp.connection.on('itemListInit', (list: Array<Item>) => {
	itemList = list

	list.forEach((item) => {
		const itemObj = new Battery()
		itemObj.rotateX(Math.PI / 2)
		const itemObjGroup = new THREE.Group()
		itemObjGroup.add(itemObj)
		itemObjGroup.rotation.y = Math.PI * 0.25
		scene.add(itemObjGroup)

		threeObjIdToThingdexId.set(itemObjGroup.id, item.id)
		thingdexIdToThreeObject.set(item.id, itemObjGroup)

		itemObjGroup.position.set(item.location.x, item.location.y, item.location.z)
	})
})

mp.connection.on('itemListUpdate', (list: Array<Item>) => {
	itemList = list
	list.forEach((item) => {
		const obj = thingdexIdToThreeObject.get(item.id)
		if (!obj) return
		obj.position.set(item.location.x, item.location.y, item.location.z)
	})
})

mp.onPlayerConnected((newPlayer: Player) => {
	if (mp.localPlayer.member_id == newPlayer.member_id) { // Local Player

	}
	else { // Remote players
		if (!playerIdToPlayerObj.has(newPlayer.member_id)) {
			playerIdToPlayerObj.set(newPlayer.member_id, new Mouse(scene, toonRamp, skinList[0], false));
			console.log(playerIdToPlayerObj)
			console.log(playerIdToPlayerObj)
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

mp.connection.on('chatKeystroke', ((message: string, id: string) => {
	let thatPlayer = playerIdToPlayerObj.get(id);
	if (thatPlayer && thatPlayer.div) {
    if (message.length > 0) {
      thatPlayer.chit()
    }
		thatPlayer.div.textContent = message
    thatPlayer.div.classList.remove('fadeout')
	}
}));

mp.connection.on('chatSay', ((message: string, id: string) => {
	let thatPlayer = playerIdToPlayerObj.get(id);
	if (thatPlayer) {
    thatPlayer.squeak()
    thatPlayer.div.textContent = message
    thatPlayer.div.classList.add('fadeout')
	}
}));


const sun = new THREE.DirectionalLight();
sun.intensity = Math.PI
sun.quaternion.setFromAxisAngle(new THREE.Vector3(0, 0, 1), Math.PI * 0.1);
scene.add(sun);
let axesHelper = new THREE.AxesHelper();
//scene.add(axesHelper);

var gameTime = <Time>({
	deltaTimeMs: 0,
	deltaTime: 0,
	time: 0,
	timeMs: 0,
	serverTime: 0
});

let lastTickTime = new Date().getTime();
let input: InputManager


let axesHelperV2 = new THREE.Vector2();

function updateAllItems(itemList: Array<Item>) {
	itemList.forEach((item) => {
		const i = thingdexIdToThreeObject.get(item.id)
		if (!i) return

		// only show items in the same room as client
		i.visible = item.level === requestedLevelMetadata.name

    const optimisticPickup = item.id === localPickedUpItem

    if (optimisticPickup) {
        i.rotation.copy(player.butt.rotation)
        i.rotation.y += Math.PI
				i.position.copy(player.butt.position)
				i.position.y += 1.125
        return
    }

		if (item.parent) {
			let p
			const otherPlayer = playerIdToPlayerObj.get(item.parent)
      const parentOfItemIsLocalPlayer = item.parent === store.token

			if (parentOfItemIsLocalPlayer) {
				p = player
				i.rotation.copy(player.butt.rotation)
				i.rotation.y += Math.PI
			} else if (otherPlayer) {
				p = otherPlayer
				i.rotation.copy(otherPlayer.butt.rotation)
				i.rotation.y += Math.PI
			}
			if (i && p) {
				i.position.copy(p.butt.position)
				i.position.y += 1.125
			}
		} else {
			i.rotation.copy(item.rotation)
			i.rotation.y += Math.PI
		}
	})
}
function updatePickupCursor() {
	if (closestObj && closestObj.position.distanceTo(player.object.position) < pickupRadius) {
		pickupCursor.position.copy(closestObj.position)
	} else {
		pickupCursor.position.set(-999, 0, -999)
	}

	const playerIsHoldingItem = itemList.some((i) => i.parent === store.token)
	if (playerIsHoldingItem) {
		pickupCursor.position.set(-999, 0, -999)
	}

	pickupCursor.lookAt(camera.position)
}

function mainLoop(reportedTime: number) {
	let now = new Date().getTime();


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

	updateAllItems(itemList)

	const visibleItems = itemList.filter((item) => {
		const obj = thingdexIdToThreeObject.get(item.id)
		if (obj && obj.visible) {
			return obj
		}
	})

	closestObj = findClosestObject(player, visibleItems)

	updatePickupCursor()

	if (settings.showMinimap) {
		const itemsInRoom = itemList.filter((item) => item.level === requestedLevelMetadata.name)
		minimapText.value = level.renderMinimap(player, playerIdToPlayerObj, itemsInRoom)
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

	const playerIsHoldingItem = itemList.some((i) => i.parent === store.token)

	if (playerIsHoldingItem) {
		drop()
		return
	}

	const itemsInRoom = itemList.filter((item) => item.level === requestedLevelMetadata.name)
	closestObj = findClosestObject(player, itemsInRoom)

	if (closestObj && closestObj.position.distanceTo(player.object.position) < pickupRadius) {
		const i = threeObjIdToThingdexId.get(closestObj.id);
		if (i) {
			pickup(i)
		}
	} else {
		sendSqueak()
	}
}

function pickup(id: string) {
  if (settings.enableSound) {
    sfxPickup.stop()
    sfxPickup.start()
  }
  localPickedUpItem = id
	mp.connection.emit('pickupItem', id)
}

function drop() {
	const pos = new THREE.Vector3()
	pos.copy(player.object.position)
	pos.y = 0.5

  if (settings.enableSound) {
    sfxPutdown.stop()
    sfxPutdown.start()
  }
  localPickedUpItem = null
	mp.connection.emit('dropItem', pos, player.butt.rotation)
}

function sendSqueak() {
  if (settings.enableSound) {
    Tone.start()
  }
	player.squeak()
	mp.connection.emit('squeak', player.chirpIndex)
}

onMounted(() => {
	textRenderer = new CSS2DRenderer({ element: chat_renderer.value })
	textRenderer.setSize(window.innerWidth, window.innerHeight)
	textRenderer.domElement.style.position = 'absolute';
	textRenderer.domElement.style.top = '0px';
	textRenderer.domElement.style.marginTop = '-16px';
	textRenderer.domElement.style.left = '0px';
	textRenderer.domElement.style.zIndex = '1';
	textRenderer.domElement.style.color = 'white';
	textRenderer.domElement.style.textShadow = '0 0 7px black';
	textRenderer.domElement.style.pointerEvents = 'none';
	textRenderer.domElement.textContent = ''
	document.getElementById('app')?.appendChild(textRenderer.domElement);

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
	circleFade.uniforms.halfHeightRelativeRadius.value = Math.sqrt(width * width + height * height) / height / 2;

	textRenderer?.setSize(window.innerWidth, window.innerHeight)
}

addEventListener("resize", onWindowResize, false);

function settingsToggle() {
	settingsPanelOpen.value = !settingsPanelOpen.value
}

function updateChat(e: Event) {
	const message = (e.target as HTMLInputElement).value
  playerChatInput.value = message
	player.div.textContent = message
  if (message.length > 0) {
    player.chit()
  }
	mp.connection.emit('chatKeystroke', message)
  player.div.classList.remove('fadeout')
	//sendSqueak()
}

function handleKey(e: KeyboardEvent) {
	if (e.key === 'Enter') {
		if (playerChatInput.value === '') {
			chatBoxOpen.value = false
		} else if (playerChatInput.value) {
      mp.connection.emit('chatSay', playerChatInput.value)
      player.squeak()
      player.div.classList.add('fadeout')
			playerChatInput.value = ''
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

function clearChat() {
	mp.connection.emit('chatKeystroke', '')
  playerChatInput.value = ''
  player.div.textContent = ''

	nextTick(() => {
		chat_input.value?.focus()
	})
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
					<span class="longstring">{{ store.token }}</span><br />{{
						mp.playersOnline.value }}
				</div>
			</div>
		</div>
		<div class="minimap" v-if="settings.showMinimap && !chatBoxOpen">{{ minimapText }}</div>
		<div class="chat-box" v-show="chatBoxOpen">
			<button arial-label="close chat" class="chat-box__close-button"
				@click="chatBoxOpen = false">&rsaquo;</button>
      <div class="chat-input-wrapper">
        <input ref="chat_input" class="chat-input" type="text" v-model="playerChatInput"
        @input="updateChat" @keydown="handleKey" />
        <button v-if="playerChatInput && playerChatInput.length > 0" aria-label="clear" class="chat-box__clear-button" @click="clearChat">&times;</button>
      </div>
		</div>
		<div class="logs" v-if="settings.showLogs">
			<span v-for="message in logs.messages.slice(0, 6).reverse()">{{ message }}</span>
		</div>
		<div class="settings">
			<div class="settings__panel" v-if="settingsPanelOpen">

				<label>
					<input type="checkbox" v-model="settings.enableSound" />
					enable sounds
				</label>

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
	padding-bottom: 4rem;
	background: white;
	z-index: 999;
  display: flex;
  flex-direction: column;
	/* todo: don't do this */
}

.chat-box__close-button {
  align-self: end;
	top: 0;
	right: 0;
	padding: 0.3rem;
	font-size: 4rem;
	background: none;
	border: none;
  transform: rotateZ(90deg);
  line-height: 0;
  height: 4rem;
  width: 4rem;
}

.chat-box__clear-button {
  color: white;
  background: #bbb;
  border: none;
  border-radius: 99rem;
  display: flex;
  justify-content: center;
  align-items: center;
  font-size: 2rem;
  width: 2.25rem;
  height: 2.25rem;
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
  box-sizing: border-box;
}
.chat-input-wrapper {
  display: grid;
  gap: 0.5rem;
  grid-template-columns: 13rem 2.25rem;
  justify-content: center;
}
</style>
