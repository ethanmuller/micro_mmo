<script setup lang="ts">
import {ref, onMounted} from 'vue'
import * as THREE from 'three';
import { GreenCube } from './game/greencube';
import { Time } from './game/Time';

const gamecanvas = ref<HTMLDivElement>();

const scene = new THREE.Scene();
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
    mainLoop();
  }
})

</script>

<template>
  <div ref="gamecanvas"></div>
</template>

<style scoped>
</style>
