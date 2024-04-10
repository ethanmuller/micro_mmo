<script setup lang="ts">
import {ref, onMounted} from 'vue'
import * as THREE from 'three';
import { GreenCube } from './game/greencube';
import { Time } from './game/Time';
import skyTexture from './assets/sky_gradient.png';

const gamecanvas = ref<HTMLDivElement>();

const camera = new THREE.PerspectiveCamera( 75, 1, 0.1, 1000 );
const renderer = new THREE.WebGLRenderer();
renderer.setSize( 512, 512 );


const scene = new THREE.Scene();
const imgLoader = new THREE.TextureLoader();
imgLoader.loadAsync(skyTexture).then((tex) => {
  tex.magFilter = THREE.LinearFilter;
  scene.background = tex;
});
const player = new GreenCube(scene);

camera.position.z = 7;
camera.position.y = 7;
camera.lookAt(new THREE.Vector3(0,0,0));
camera.updateProjectionMatrix();
const cameraPivot = new THREE.Object3D();
cameraPivot.add(camera);
scene.add(cameraPivot);

const floor = new THREE.Object3D();
const worldBoundaries = new THREE.Box2(new THREE.Vector2(-5, -3), new THREE.Vector2(5, 3));
var worldSize = new THREE.Vector2();
worldBoundaries.getSize(worldSize);
floor.add(new THREE.Mesh(new THREE.PlaneGeometry(worldSize.width,worldSize.height), new THREE.MeshBasicMaterial({color : 0x775577})));
floor.rotation.x -= Math.PI/2;
scene.add(floor);

var gameTime = <Time>({
  deltaTime: 0,
  time: 0,
  serverTime: 0
});

var lastTickTime = new Date().getTime();

function mainLoop()
{
  var now = new Date().getTime();
  gameTime.deltaTime = (now - lastTickTime) / 1000;
  gameTime.time += gameTime.deltaTime;
  gameTime.serverTime += gameTime.deltaTime;
  lastTickTime = now;

  // update
	player.update(gameTime, worldBoundaries);

  cameraPivot.position.copy(player.object.position);
  //cameraPivot.updateMatrix();
  camera.updateProjectionMatrix();

  // draw
	renderer.render( scene, camera );

  // TODO send info to the server every X milliseconds

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
  <div ref="gamecanvas" id="gamecanvas"></div>
</template>

<style scoped>
  #gamecanvas {
    position:absolute;
    left: 0;
    top:0;
  }
</style>
