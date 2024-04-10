<script setup lang="ts">
import {ref, onMounted} from 'vue'
import * as THREE from 'three';
import { GreenCube } from './game/greencube';
import { Time } from './game/Time';
import skyTexture from './assets/sky_gradient.png';

const gamecanvas = ref<HTMLDivElement>();

const scene = new THREE.Scene();
const imgLoader = new THREE.TextureLoader();
imgLoader.loadAsync(skyTexture).then((tex) => {
  tex.magFilter = THREE.LinearFilter;
  scene.background = tex;
});
const camera = new THREE.PerspectiveCamera( 75, 1, 0.1, 1000 );

const renderer = new THREE.WebGLRenderer();
renderer.setSize( 512, 512 );

const cube = new GreenCube(scene);

camera.position.z = 5;

var GameTime = <Time>({
  deltaTime: 0,
  time: 0
});

var lastTickTime = new Date().getTime();;

function mainLoop() {
  var now = new Date().getTime();
  GameTime.deltaTime = (now - lastTickTime) / 1000;
  GameTime.time += GameTime.deltaTime;
  lastTickTime = now;


  // update
	cube.update(GameTime);

  // draw
	renderer.render( scene, camera );

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
