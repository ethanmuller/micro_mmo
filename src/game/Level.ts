import { Box2, BoxGeometry, Mesh, MeshBasicMaterial, MeshToonMaterial, Object3D, PlaneGeometry, Texture, Vector2, Vector3 } from "three";
import toonTexture from "../assets/threeTone_bright.jpg";

const TILE_SIZE = 7;
const WALL_HEIGHT = 3;

const CARDINAL = [new Vector2(0,1), new Vector2(1,0), new Vector2(0,-1), new Vector2(-1, 0)];

export class Level
{
    object : Object3D = new Object3D();
    start : Vector2 = new Vector2();
    levelData : string[][] = [];
    rows = 0;
    columns = 0;
    tileSize : number = TILE_SIZE;

    constructor(levelString : string, toonRamp : Texture)
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
                this.start.set(currentRow.length - 1, this.levelData.length);
            }
        }
        this.levelData.push(currentRow);
        this.rows++;

        const wallMesh = new Mesh(new BoxGeometry(TILE_SIZE, WALL_HEIGHT, TILE_SIZE, 1, 1, 1), new MeshToonMaterial({color: 0xffd154, gradientMap: toonRamp}));
        const floorMesh = new Mesh(new PlaneGeometry(TILE_SIZE, TILE_SIZE, 1, 1), new MeshToonMaterial({color: 0x8a72a8, gradientMap: toonRamp}));
        const wall = new Object3D();
        wallMesh.position.y = WALL_HEIGHT * 0.5;
        wall.add(wallMesh);
        const floor = new Object3D();
        floorMesh.rotation.x -= Math.PI * 0.5;
        floor.add(floorMesh);
        this.object.matrixAutoUpdate = false;

        // extremely simple instantiation (not the most efficient, too many vertices and meshes)
        let needsWall : Map<number, Set<number>> = new Map<number, Set<number>>();
        let setWallNeded = function(i: number, j: number) {
            if (!needsWall.has(j)) {
                let s = new Set<number>();
                s.add(i);
                needsWall.set(j, s);
            }
            else if (!needsWall.get(j)?.has(i)) {
                needsWall.get(j)?.add(i);
            }
        }
        for (let j = 0; j < this.levelData.length; ++j) {
            for (let i = 0; i < this.levelData[j].length; ++i) {
                if (this.levelData[j][i] != ' ') // if we have a floor
                {
                    let f = floor.clone();
                    f.position.set(i * TILE_SIZE, 0, j * TILE_SIZE);
                    this.object.add(f);

                    let scope = this;
                    CARDINAL.forEach(v => {
                        if (!scope.isTileWalkable(i + v.x, j + v.y))
                            setWallNeded(i + v.x, j + v.y);
                    })
                }
            }
        }

        needsWall.forEach((s : Set<number>, j : number) => {
            s.forEach(i => {
                let w = wall.clone();
                w.position.set(i * TILE_SIZE, 0, j * TILE_SIZE);
                this.object.add(w);
            });
        });

        console.log(this.object.children.length);

        this.object.position.set(TILE_SIZE * 0.5, 0, TILE_SIZE * 0.5);
        this.object.updateMatrixWorld(true);
    }

    isTileWalkable(i: number, j: number) {
        return i >= 0 && j >= 0 && j < this.levelData.length && i < this.levelData[j].length && this.levelData[j][i] != ' ';
    }

    getTileWorldPosition(p : Vector2, out : Vector3) : Vector3 {
        out.set(p.x * this.tileSize, 0, p.y * this.tileSize);
        return out;
    }
}