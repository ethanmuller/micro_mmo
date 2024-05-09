import { Box2, BoxGeometry, Mesh, MeshBasicMaterial, Object3D, PlaneGeometry, Vector2 } from "three";

const TILE_SIZE = 7;
const WALL_HEIGHT = 3;

export class Level
{
    object : Object3D = new Object3D();
    start : Vector2 = new Vector2();
    levelData : string[][] = [];
    rows = 0;
    columns = 0;

    constructor(levelString : string)
    {
        console.log("Loading level.. ");
        console.log(levelString);

        let currentRow : string[] = [];

        for (let s = 0; s < levelString.length; ++s)
        {
            let v = levelString[s];
            if (v == '\r') continue;
            if (v == '\n') {
                this.levelData.push(currentRow);
                this.rows++;
                currentRow = [];
                continue;
            }
            currentRow.push(v);
            this.columns = Math.max(this.columns, currentRow.length);

            if (v == 's') { // Start
                this.start.set(this.levelData.length, currentRow.length - 1)
            }
        }

        const wallMesh = new Mesh(new BoxGeometry(TILE_SIZE, WALL_HEIGHT, TILE_SIZE, 1, 1, 1), new MeshBasicMaterial({color: 0xffd154}));
        const floorMesh = new Mesh(new PlaneGeometry(TILE_SIZE, TILE_SIZE, 1, 1), new MeshBasicMaterial({color: 0x8a72a8}));
        const wall = new Object3D();
        wallMesh.position.y = WALL_HEIGHT * 0.5;
        wall.add(wallMesh);
        const floor = new Object3D();
        floorMesh.rotation.x -= Math.PI * 0.5;
        floor.add(floorMesh);
        this.object.matrixAutoUpdate = false;

        // extremely simple instantiation (not the most efficient)
        for (let j = 0; j < this.levelData.length; ++j) {
            for (let i = 0; i < this.levelData[j].length; ++i) {
                if (this.levelData[j][i] != ' ') // if we are a floor
                {
                    let f = floor.clone();
                    f.position.set(i * TILE_SIZE, 0, j * TILE_SIZE);
                    this.object.add(f);
                }
            }
        }

        console.log(this.object.children.length);

        this.object.position.set(TILE_SIZE * 0.5, 0, TILE_SIZE * 0.5);
        this.object.updateMatrixWorld(true);
    }
}