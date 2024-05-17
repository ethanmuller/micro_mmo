import { BoxGeometry, Mesh, MeshToonMaterial, Object3D, PlaneGeometry, Texture, TextureLoader, Vector2, Vector3, NearestFilter, SRGBColorSpace } from "three";
import wallImage from "../assets/mc/grassdirt.png"
import topImage from "../assets/mc/grass.png"
import floorImage from "../assets/mc/dirt.png";

const TILE_SIZE = 5;
const WALL_HEIGHT = 5;

const CARDINAL = [new Vector2(0, 1), new Vector2(1, 0), new Vector2(0, -1), new Vector2(-1, 0)];
const DIAGONAL = [new Vector2(1, 1), new Vector2(1, -1), new Vector2(-1, -1), new Vector2(-1, 1)];

export { CARDINAL, DIAGONAL };

export class Level {
    object: Object3D = new Object3D();
    start: Vector2 = new Vector2();
    levelData: string[][] = [];
    rows = 0;
    columns = 0;
    tileSize: number = TILE_SIZE;
    wallHeight: number = WALL_HEIGHT;

    constructor(levelString: string, toonRamp: Texture) {
        console.log("Loading level.. ");
        console.log(levelString);

        let currentRow: string[] = [];

        for (let s = 0; s < levelString.length; ++s) {
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

        const texLoader = new TextureLoader();
        const wallTexture = texLoader.load(wallImage)
        wallTexture.colorSpace = SRGBColorSpace
        wallTexture.minFilter = NearestFilter
        wallTexture.magFilter = NearestFilter

        const floorTexture = texLoader.load(floorImage)
        floorTexture.colorSpace = SRGBColorSpace
        floorTexture.minFilter = NearestFilter
        floorTexture.magFilter = NearestFilter
        const floorMaterial = new MeshToonMaterial({ color: 0xffffff, gradientMap: toonRamp, map: floorTexture })

        const topTexture = new TextureLoader().load(topImage);
        topTexture.colorSpace = SRGBColorSpace
        topTexture.minFilter = NearestFilter;
        topTexture.magFilter = NearestFilter;

        // Load the brick texture
        const sideTexture = new TextureLoader().load(wallImage);
        sideTexture.colorSpace = SRGBColorSpace;
        sideTexture.minFilter = NearestFilter;
        sideTexture.magFilter = NearestFilter;

        // Create materials for each face of the wall
        const wallMaterials = [
            new MeshToonMaterial({ color: 0xffffff, gradientMap: toonRamp, map: sideTexture }), // Front face
            new MeshToonMaterial({ color: 0xffffff, gradientMap: toonRamp, map: sideTexture }), // Back face
            new MeshToonMaterial({ color: 0xffffff, gradientMap: toonRamp, map: topTexture }), // Top face
            new MeshToonMaterial({ color: 0xffffff, gradientMap: toonRamp, map: sideTexture }), // Bottom face
            new MeshToonMaterial({ color: 0xffffff, gradientMap: toonRamp, map: sideTexture }), // Right face
            new MeshToonMaterial({ color: 0xffffff, gradientMap: toonRamp, map: sideTexture })  // Left face
        ];

        // Create a geometry for the wall
        const wallGeometry = new BoxGeometry(TILE_SIZE, WALL_HEIGHT, TILE_SIZE, 1, 1, 1);

        // Create a mesh for the wall using the materials array
        const wallMesh = new Mesh(wallGeometry, wallMaterials);
        const floorMesh = new Mesh(new PlaneGeometry(TILE_SIZE, TILE_SIZE, 1, 1), floorMaterial);
        //const ceilingMesh = new Mesh(new PlaneGeometry(TILE_SIZE, TILE_SIZE, 1, 1), ceilingMaterial);
        const wall = new Object3D();
        wallMesh.position.y = WALL_HEIGHT * 0.5;
        wall.add(wallMesh);
        const floor = new Object3D();
        floorMesh.rotation.x -= Math.PI * 0.5;
        // ceilingMesh.rotation.x += Math.PI * 0.5;
        // ceilingMesh.position.y = TILE_SIZE;
        floor.add(floorMesh);
        //floor.add(ceilingMesh);
        this.object.matrixAutoUpdate = false;

        // extremely simple instantiation (not the most efficient, too many vertices and meshes)
        let needsWall: Map<number, Set<number>> = new Map<number, Set<number>>();
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

        needsWall.forEach((s: Set<number>, j: number) => {
            s.forEach(i => {
                let w = wall.clone();
                w.position.set(i * TILE_SIZE, 0, j * TILE_SIZE);
                this.object.add(w);
            });
        });

        this.object.position.set(TILE_SIZE * 0.5, 0, TILE_SIZE * 0.5);
        this.object.updateMatrixWorld(true);
    }

    isTileWalkable(i: number, j: number) {
        return i >= 0 && j >= 0 && j < this.levelData.length && i < this.levelData[j].length && this.levelData[j][i] != ' ';
    }

    getWorldPositionFromTile(p: Vector2, out: Vector3): Vector3 {
        out.set(p.x * this.tileSize, 0, p.y * this.tileSize);
        return out;
    }

    getTileFromWorldPosition(p: Vector3, out: Vector2): Vector2 {
        out.set(Math.floor((p.x + 0.5 * this.tileSize) / this.tileSize), Math.floor((p.z + 0.5 * this.tileSize) / this.tileSize));
        return out;
    }

    collisionV2 = new Vector2();
    collisionV22 = new Vector2();
    collideCircle(p: Vector3, r: number): boolean {   // PRECONDITION: r < TILE_SIZE
        let tile = this.getTileFromWorldPosition(p, this.collisionV2);

        if (!this.isTileWalkable(tile.x, tile.y)) {
            return true;
        }

        let halfTileSize = this.tileSize * 0.5;
        let collided = false;
        CARDINAL.forEach(v => {
            let tileX = tile.x + v.x;
            let tileY = tile.y + v.y;
            if (!this.isTileWalkable(tileX, tileY)) {
                let tileCenterX = tileX * this.tileSize;
                let tileCenterZ = tileY * this.tileSize;
                if (v.x > 0 && p.x + r > tileCenterX - halfTileSize) {
                    p.x = tileCenterX - halfTileSize - r;
                    collided = true;
                }
                else if (v.x < 0 && p.x - r < tileCenterX + halfTileSize) {
                    p.x = tileCenterX + halfTileSize + r;
                    collided = true;
                }
                if (v.y > 0 && p.z + r > tileCenterZ - halfTileSize) {
                    p.z = tileCenterZ - halfTileSize - r;
                    collided = true;
                }
                else if (v.y < 0 && p.z - r < tileCenterZ + halfTileSize) {
                    p.z = tileCenterZ + halfTileSize + r;
                    collided = true;
                    //console.log(`collided with tile (${tileX}, ${tileY})`);
                }
            }
        });

        let r2 = r * r;
        let deltaPos = this.collisionV22;
        DIAGONAL.forEach(v => {
            let tileX = tile.x + v.x;
            let tileY = tile.y + v.y;
            if (!this.isTileWalkable(tileX, tileY)) {
                let closestCornerX = tileX * this.tileSize - v.x * halfTileSize;
                let closestCornerZ = tileY * this.tileSize - v.y * halfTileSize;

                deltaPos.set(p.x - closestCornerX, p.z - closestCornerZ);
                if (deltaPos.lengthSq() < r2) {
                    collided = true;

                    deltaPos.normalize().multiplyScalar(r);
                    p.x = closestCornerX + deltaPos.x;
                    p.z = closestCornerZ + deltaPos.y;
                }
            }
        });

        return collided;
    }

    findClosestWalkableTile(p: Vector2): Vector2 {
        let v = p.clone();





        return v;
    }
}
