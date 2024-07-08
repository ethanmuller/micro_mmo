<script setup lang="ts">
import * as THREE from 'three';
import { Time } from './game/Time';
import { onMounted, ref } from 'vue';
import { Mouse, MouseSkin } from './game/Mouse2'
import toonTexture from "./assets/threeTone_bright.jpg";

let t = 0

const gamecanvas = ref<HTMLDivElement>();
const camera = new THREE.PerspectiveCamera(20, 1, 0.1, 1000);
camera.position.y = 15
const renderer = new THREE.WebGLRenderer();
const scene = new THREE.Scene();
scene.background = new THREE.Color(0xddddee)

const imgLoader = new THREE.TextureLoader();

const toonRamp = imgLoader.load(toonTexture, (texture) => {
	texture.minFilter = THREE.NearestFilter;
	texture.magFilter = THREE.NearestFilter;
});


const skinList: Array<MouseSkin> = [
	{ skinColor: 0xeeaaaa, eyeColor: 0xaa0000, furColor: 0xffeeaa }, // spooky
	{ skinColor: 0x000000, eyeColor: 0xffaaaa, furColor: 0x111111 }, // spooky
	{ skinColor: 0xffaaaa, eyeColor: 0x880000, furColor: 0xffffff }, // lab mouse
	{ skinColor: 0xffaaaa, eyeColor: 0x000000, furColor: 0x453a38 }, // dark gray
	{ skinColor: 0xffaaaa, eyeColor: 0x000000, furColor: 0xb95b48 }, // light brown
	{ skinColor: 0xffaaaa, eyeColor: 0x000000, furColor: 0x542c24 }, // dark brown
	{ skinColor: 0xca7373, eyeColor: 0x000000, furColor: 0xc3c3c3 }, // light gray
	{ skinColor: 0xffaaaa, eyeColor: 0x000000, furColor: 0xc29e7c }, // cardboard brown
	{ skinColor: 0xcc8888, eyeColor: 0x000000, furColor: 0x646464 }, // classic gray
]

const sun = new THREE.DirectionalLight();
sun.intensity = Math.PI
sun.quaternion.setFromAxisAngle(new THREE.Vector3(0, 0, 1), Math.PI * 0.1);
scene.add(sun);

const p1 = new Mouse(scene, skinList[8], toonRamp)
p1.object.position.set(0, 0, -1)
//p1.velocity.set(0, 0, -1)
p1.object.add(p1.headPivot);
p1.butt.position.copy(p1.object.position);
p1.butt.position.z += p1.bodyLength;
p1.butt.position.y = p1.radius;

const g = new THREE.Group()
g.add(p1.object)
g.add(p1.butt)
scene.add(g)

const cylGeo = new THREE.CylinderGeometry(5, 5, 5, 16, 1, true)
const geo = new THREE.EdgesGeometry(cylGeo)
const mat = new THREE.LineBasicMaterial( { color: 0x000000, linewidth: 4 } );

const wheel = new THREE.LineSegments(geo, mat)

wheel.position.y = 4.8
wheel.rotateY(Math.PI/2)
wheel.rotateX(Math.PI/2)
scene.add(wheel)


function updateWheel(wheel: THREE.LineSegments) {
  const mult = 3
  wheel.rotateY(-gameTime.deltaTime * mult)
}

function updateCamera(time: Time, camera: THREE.Camera) {
  const mult = 0.1
  camera.position.x = Math.sin(Math.PI/4+time.time*mult)*70
  camera.position.z = Math.cos(Math.PI/4+time.time*mult)*70
  camera.lookAt(wheel.position)
}

camera.position.z = 0
camera.position.x = -70
camera.lookAt(wheel.position)

var gameTime = <Time>({
  deltaTimeMs: 0,
  deltaTime: 0,
  time: 0,
  timeMs: 0,
});

let lastTickTime = new Date().getTime();

onMounted(() => {
	if (gamecanvas.value) {
		gamecanvas.value.appendChild(renderer.domElement);
		onWindowResize();
		mainLoop();
	}
})

function onWindowResize(): void {
	const width = window.innerWidth;
	const height = window.innerHeight;
	const ar = width / height;
	camera.aspect = ar;
	camera.updateProjectionMatrix();
	renderer.setSize(width, height)
	renderer.setPixelRatio(window.devicePixelRatio);
	renderer.setSize(width, height);
	renderer.setPixelRatio(window.devicePixelRatio);
}

window.addEventListener('resize', onWindowResize)

function mainLoop() {
	let now = new Date().getTime();

	gameTime.deltaTimeMs = Math.min(90, now - lastTickTime);// Prevent big time jumps
	gameTime.timeMs += gameTime.deltaTimeMs;
	gameTime.deltaTime = gameTime.deltaTimeMs / 1000;
	gameTime.time += gameTime.deltaTime;
	lastTickTime = now;
  t += gameTime.deltaTimeMs

  p1.update(gameTime)
  updateWheel(wheel)
  updateCamera(gameTime, camera)

  renderer.render(scene, camera)

  requestAnimationFrame(mainLoop);
}

</script>

<template>
  <div>
		<div ref="gamecanvas" id="gamecanvas"></div>
  </div>
</template>

<style scoped>
</style>
