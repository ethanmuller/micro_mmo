<script setup lang="ts">
import { onMounted } from 'vue'
import * as Tone from 'tone'

const sampler = new Tone.Sampler({
	urls: {
		A1: 'mouse-step-a.wav',
		A2: 'mouse-step-b.wav',
	},
	baseUrl: "https://mush.network/files/sfx/",
}).toDestination()

const seq = new Tone.Sequence((time, note) => {
	sampler.triggerAttackRelease(note, 0.1, time);
}, ['a1', 'a2']).start(0);

const transport = Tone.getTransport()
transport.bpm.value = 500


onMounted(() => {
	console.log('mounted')
})

function click() {
	transport.start()
}
</script>

<template>
	<button @click="click">click me</button>
</template>

<style scoped></style>
