import { BoxGeometry, Mesh, MeshToonMaterial, Object3D, PlaneGeometry, Texture, TextureLoader, Vector2, Vector3, NearestFilter, SRGBColorSpace, } from "three";
import { MouseholeGeometry } from "./extensions/MouseholeGeometry"


import ohioAscii from '../assets/ohio.txt?raw'
import labAscii from '../assets/lab.txt?raw'
import taiwanAscii from '../assets/taiwan.txt?raw'

export interface LevelMetaData {
    name: LevelName,
    tileSize: number,
    wallHeight: number,
    sky: URL,
    ascii: string,
    floorImage: string,
    wallImage: string,
    topImage?: string,
}

export const DEFAULT_LEVEL: LevelName = 'lab'

type LevelName = 'ohio' | 'lab' | 'taiwan'


const ohio: LevelMetaData = {
    name: 'ohio',
    tileSize: 3,
    wallHeight: 3,
    ascii: `
l: lab
---
l                 
#s#################
                 #
                 #
                 #
                 #
                 #
           #######
           #######
           #######
           #######
           #######
           #######
           #######
           #######
           #######
           #######
           #######
           #######
    `,
    sky: new URL('https://mush.network/files/sky/aerodynamics_workshop_1k.hdr'),
    topImage: "https://mush.network/files/textures/mc/grass.png",
    wallImage: "https://mush.network/files/textures/mc/grassdirt.png",
    floorImage: "https://mush.network/files/textures/mc/dirt.png",
}

const lab: LevelMetaData = {
    name: 'lab',
    tileSize: 7,
    wallHeight: 7,
    ascii: `
o: ohio
---

##########          
####     #          
####  #  #          
####  #  #          
##### ####          
######      
#######      
########     
########o     
#######s   
###########
########  ###
########### #
########    #          
       ######       
    `,
    sky: new URL('https://mush.network/files/sky/vintage_measuring_lab_1k.hdr'),
    wallImage: "https://mush.network/files/textures/etc/plywood.png",
    floorImage: "https://mush.network/files/textures/etc/concrete.png",
}
const taiwan: LevelMetaData = {
    name: 'taiwan',
    tileSize: 3,
    wallHeight: 3,
    ascii: `
o: ohio
l: lab
---
       o       l  
       #       #  
       #       #  
       #       #  
       #########  
           #      
           #      
           #      
           s      
    `,
    sky: new URL('https://mush.network/files/sky/wasteland_clouds_puresky_1k.hdr'),
    topImage: "https://mush.network/files/textures/mc/grass.png",
    wallImage: "https://mush.network/files/textures/mc/grassdirt.png",
    floorImage: "https://mush.network/files/textures/mc/dirt.png",
}

export const levels: { [index: string]: any } = { ohio, lab, taiwan }

const CARDINAL = [new Vector2(0, 1), new Vector2(1, 0), new Vector2(0, -1), new Vector2(-1, 0)];
const DIAGONAL = [new Vector2(1, 1), new Vector2(1, -1), new Vector2(-1, -1), new Vector2(-1, 1)];

export { CARDINAL, DIAGONAL };

export class Level {
    object: Object3D = new Object3D();
    start: Vector2 = new Vector2();
    levelData: string[][] = [];
    rows = 0;
    columns = 0;
    tileSize: number;
    wallHeight: number;

    // this TS weirdness lets us index by string
    doors: { [index: string]: any };

    constructor(level: LevelMetaData, toonRamp: Texture) {
        this.tileSize = level.tileSize
        this.wallHeight = level.wallHeight

        const splitAscii = level.ascii.split(/[\r\n]+---[\r\n]+/)
        const hasFrontMatter = splitAscii.length > 1
        const chars = splitAscii[hasFrontMatter ? 1 : 0]

        const doorLines = splitAscii[0].split(/[\r\n]+/)

        this.doors = {}
        doorLines.forEach(l => {
            // split by a colon followed by one or more spaces
            const s = l.split(/:[ ]{1,}/)
            this.doors[s[0]] = s[1]
        })

        console.log(this.doors)

        // console.log("Loading level.. ");
        // console.log(chars);

        let currentRow: string[] = [];

        for (let s = 0; s < chars.length; ++s) {
            let v = chars[s];
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
        const wallTexture = texLoader.load(level.wallImage)
        wallTexture.colorSpace = SRGBColorSpace
        wallTexture.minFilter = NearestFilter
        wallTexture.magFilter = NearestFilter

        const floorTexture = texLoader.load(level.floorImage)
        floorTexture.colorSpace = SRGBColorSpace
        floorTexture.minFilter = NearestFilter
        floorTexture.magFilter = NearestFilter
        const floorMaterial = new MeshToonMaterial({ color: 0xffffff, gradientMap: toonRamp, map: floorTexture })

        const topTexture = new TextureLoader().load(level.topImage || level.wallImage);
        topTexture.colorSpace = SRGBColorSpace
        topTexture.minFilter = NearestFilter;
        topTexture.magFilter = NearestFilter;

        // Load the brick texture
        const sideTexture = new TextureLoader().load(level.wallImage);
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
        const mouseholeMaterial = new MeshToonMaterial({ color: 0xffffff, gradientMap: toonRamp, map: sideTexture });
        const mouseholeInsideMaterial = new MeshToonMaterial({ color: 0x444444, gradientMap: toonRamp, map: sideTexture });
        const mouseholeTopMaterial = new MeshToonMaterial({ color: 0xffffff, gradientMap: toonRamp, map: topTexture });
        const mouseholeFloorMaterial = new MeshToonMaterial({ color: 0x666666, gradientMap: toonRamp, map: floorTexture });

        // Create a geometry for the wall
        const wallGeometry = new BoxGeometry(this.tileSize, this.wallHeight, this.tileSize, 1, 1, 1);

        const holeGeometry = new MouseholeGeometry(this.tileSize, this.wallHeight, 5 * 0.4, 7 * 0.3);


        // Create a mesh for the wall using the materials array
        const wallMesh = new Mesh(wallGeometry, wallMaterials);
        const floorMesh = new Mesh(new PlaneGeometry(this.tileSize, this.tileSize, 1, 1), floorMaterial);
        const holeMesh = new Mesh(holeGeometry, [mouseholeMaterial, mouseholeFloorMaterial, mouseholeTopMaterial, mouseholeInsideMaterial]);
        const wall = new Object3D();
        wallMesh.position.y = this.wallHeight * 0.5;
        wall.add(wallMesh);
        const floor = new Object3D();
        floorMesh.rotation.x -= Math.PI * 0.5;
        // ceilingMesh.rotation.x += Math.PI * 0.5;
        // ceilingMesh.position.y = this.tileSize;
        floor.add(floorMesh);
        //floor.add(ceilingMesh);

        const exit = new Object3D();
        exit.add(holeMesh);

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
                    if (this.levelData[j][i] != '#' && this.levelData[j][i] != 's') { // considering any other character a potential hole to another level
                        let e = exit.clone();
                        e.position.set(i * this.tileSize, 0, j * this.tileSize);

                        let scope = this;
                        let foundExitDirection = false;
                        CARDINAL.forEach(v => {
                            if (foundExitDirection) return;

                            if (scope.isTileWalkable(i + v.x, j + v.y)) {
                                if (v.x == 1)
                                    e.rotation.y = Math.PI * 0.5;
                                else if (v.x == -1)
                                    e.rotation.y = -Math.PI * 0.5;
                                else if (v.y == -1)
                                    e.rotation.y = Math.PI;

                                foundExitDirection = true;
                            }
                        });
                        this.object.add(e);
                    }
                    else {
                        let f = floor.clone();
                        f.position.set(i * this.tileSize, 0, j * this.tileSize);
                        this.object.add(f);

                        let scope = this;
                        CARDINAL.forEach(v => {
                            if (!scope.isTileWalkable(i + v.x, j + v.y))
                                setWallNeded(i + v.x, j + v.y);
                        })
                    }
                }
            }
        }

        needsWall.forEach((s: Set<number>, j: number) => {
            s.forEach(i => {
                let w = wall.clone();
                w.position.set(i * this.tileSize, 0, j * this.tileSize);
                this.object.add(w);
            });
        });

        this.object.position.set(this.tileSize * 0.5, 0, this.tileSize * 0.5);
        this.object.updateMatrixWorld(true);
    }

    isTileWalkable(i: number, j: number) {
        return i >= 0 && j >= 0 && j < this.levelData.length && i < this.levelData[j].length && this.levelData[j][i] != ' ';
    }

    isCharDoor(c: string): boolean {
        return !!this.doors[c]
    }

    getCharAtTilePosition(i: number, j: number): string {
        return i >= 0 && j >= 0 && j < this.levelData.length && i < this.levelData[j].length && this.levelData[j][i] || '';
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
    collideCircle(p: Vector3, r: number): boolean {   // PRECONDITION: r < this.tileSize
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
