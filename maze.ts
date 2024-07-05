import { nmg } from 'node-maze-generator'

const generator = new nmg.generators.maze({}, { width: 10, height: 10 });
const renderer = new nmg.renderer(generator);
