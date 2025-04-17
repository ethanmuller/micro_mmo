import { BoxGeometry, Mesh, MeshToonMaterial, Object3D, PlaneGeometry, Texture, TextureLoader, Vector2, Vector3, NearestFilter, SRGBColorSpace, MeshBasicMaterial, } from "three";
import { Mouse } from './Mouse';
import { MouseholeGeometry } from "./extensions/MouseholeGeometry"
import { CameraMode } from '../game/CameraMovement'
import { Item } from "../server/MultiplayerTypes";

import { cdn_path } from "../cdn_path";


type LowercaseAlpha = 'a' | 'b' | 'c' | 'd' | 'e' | 'f' | 'g' | 'h' | 'i' | 'j' | 'k' | 'l' | 'm' | 'n' | 'o' | 'p' | 'q' | 'r' | 's' | 't' | 'u' | 'v' | 'w' | 'x' | 'y' | 'z';
type DoorChar = LowercaseAlpha
type CharToDoor = Map<DoorChar, string>

type UppercaseAlpha = 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G' | 'H' | 'I' | 'J' | 'K' | 'L' | 'M' | 'N' | 'O' | 'P' | 'Q' | 'R' | 'S' | 'T' | 'U' | 'V' | 'W' | 'X' | 'Y' | 'Z';
type ButtonChar = UppercaseAlpha
type CharToButton = Map<ButtonChar, Function>

// levels are defined by authoring a LevelMetaData
// whereas the Level class is used to load and represent a level at runtime
export interface LevelMetaData {
    name: LevelName,
    doors: CharToDoor,
    buttons?: CharToButton,
    cameraType: CameraMode
    tileSize: number,
    wallHeight: number,
    sky: URL,
    ascii: string,
    floorImage: string,
    wallImage: string,
    topImage?: string,
}

export class Level {
    object: Object3D = new Object3D();
    start: Vector2 = new Vector2();
    levelData: string[][] = [];
    rows = 0;
    columns = 0;
    tileSize: number;
    cameraType: CameraMode;
    wallHeight: number;
    mouseholeWidth: number;

    doors: Map<string, string>;
    doorTiles: Map<string, Vector2> = new Map<string, Vector2>();
    tempTile: Vector2;

    constructor(level: LevelMetaData, toonRamp: Texture) {
        this.tempTile = new Vector2()
        this.tileSize = level.tileSize
        this.wallHeight = level.wallHeight
        this.cameraType = level.cameraType

        this.doors = level.doors

        let currentRow: string[] = [];

        for (let s = 0; s < level.ascii.length; ++s) {
            let v = level.ascii[s];
            if (v == '\r') continue;
            if (v == '\n') {
                this.levelData.push(currentRow);
                this.rows++;
                currentRow = [];
                continue;
            }
            currentRow.push(v);
            this.columns = Math.max(this.columns, currentRow.length);

            if (v == '@') { // Start
                this.start.set(currentRow.length - 1, this.levelData.length);
            }
            else {
                let d = this.doors.get(v);
                if (d !== undefined)
                    this.doorTiles.set(d, new Vector2(currentRow.length - 1, this.levelData.length))
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

        this.mouseholeWidth = 2;
        const holeGeometry = new MouseholeGeometry(this.tileSize, this.wallHeight, this.mouseholeWidth, 7 * 0.3);


        // Create a mesh for the wall using the materials array
        const wallMesh = new Mesh(wallGeometry, wallMaterials);
        const floorMesh = new Mesh(new PlaneGeometry(this.tileSize, this.tileSize, 1, 1), floorMaterial);
        floorMesh.rotation.x -= Math.PI * 0.5;
        const holeMesh = new Mesh(holeGeometry, [mouseholeMaterial, mouseholeFloorMaterial, mouseholeTopMaterial, mouseholeInsideMaterial]);
        const wall = new Object3D();

        wallMesh.position.y = this.wallHeight * 0.5;
        wall.add(wallMesh);
        const floor = new Object3D();
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
                    if (this.levelData[j][i].match(/[a-z]/)) { // considering any other character a potential hole to another level
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

        const OutOfBoundsFloorMesh = new Mesh(new PlaneGeometry(this.tileSize * 1000, this.tileSize * 1000, 1, 1), new MeshBasicMaterial({ color: 0x110011 }));
        OutOfBoundsFloorMesh.position.y -= 1
        OutOfBoundsFloorMesh.rotation.x -= Math.PI * 0.5;
        this.object.add(OutOfBoundsFloorMesh)

        this.object.position.set(this.tileSize * 0.5, 0, this.tileSize * 0.5);
        this.object.updateMatrixWorld(true);
    }

    public renderMinimap(player: Mouse, playerMap: Map<string, Mouse>, itemList: Array<Item>) {
        let result = ''

        const playerTile = new Vector2()
        this.getTileFromWorldPosition(player.object.position, playerTile)

        for (let row = 0; row < this.rows; row++) {
            for (let column = 0; column < this.columns; column++) {
                let char = this.getCharAtTilePosition(column, row)
                char = char.replace(/@/g, '.')
                char = char.replace(/#/g, '.')
                char = char.replace(/[a-z]/g, 'o')

                // if an item is on this tile, draw as a =
                if (char !== 'o') {
                    itemList.forEach((item) => {
                        this.getTileFromWorldPosition(item.location, this.tempTile)
                        if (!item.parent && this.tempTile.x === column && this.tempTile.y === row) {
                            char = '='
                        }
                    })
                }

                // if another player is on this tile, draw as an &
                playerMap?.forEach((v) => {
                    this.getTileFromWorldPosition(v.object.position, this.tempTile)
                    if (this.tempTile.x === column && this.tempTile.y === row) {
                        char = '&'
                    }
                })

                // if I am on on this tile, draw as an @
                if (playerTile.x === column && playerTile.y === row) {
                    char = '@'
                }
                result += char
            }
            result += '\n'
        }

        return result
    }

    isTileWalkable(i: number | Vector2, j?: number, isCamera: boolean = false): boolean {
        if (typeof i === "number") {
            if (j === undefined)
                return false;
            return i >= 0 && j >= 0 && j < this.levelData.length && i < this.levelData[j].length &&
                (this.levelData[j][i] != ' ' && (!isCamera || !this.isCharDoor(this.levelData[j][i])));
        }
        else {
            return this.isTileWalkable(i.x, i.y, isCamera);
        }
    }

    isTileAccessibleV(from: Vector2, to: Vector2, isCamera: boolean = false): boolean {
        return this.isTileAccessible(from.x, from.y, to.x, to.y, isCamera);
    }

    public getFreeTileDirection(baseTile: Vector2) {
        for (let i = 0; i <= CARDINAL.length; i++) {
            if (this.isTileWalkable(baseTile.x + CARDINAL[i].x, baseTile.y + CARDINAL[i].y)) {
                return CARDINAL[i]
            }
        }
    }

    // This function tries to check for straight accessibility: it does not pathfind, it just checks straight & diagonal path
    isTileAccessible(fromX: number, fromY: number, toX: number, toY: number, isCamera: boolean = false): boolean {
        if (!this.isTileWalkable(toX, toY, isCamera))
            return false;
        if (fromX == toX && fromY == toY)
            return true;
        let signX = Math.sign(toX - fromX);
        let signY = Math.sign(toY - fromY);
        if (signX == 0 || signY == 0)
            return this.isTileAccessible(fromX + signX, fromY + signY, toX, toY, isCamera);
        else {
            return this.isTileAccessible(fromX + signX, fromY, toX, toY, isCamera)
                || this.isTileAccessible(fromX, fromY + signY, toX, toY, isCamera);
        }
    }

    isTileDoor(x: number, y: number) {
        return this.isCharDoor(this.getCharAtTilePosition(x, y));
    }

    isCharDoor(c: string): boolean {
        return !!this.doors.get(c)
    }

    getDoorChar(fullName: string) {
        let d = '';
        for (let [k, v] of this.doors) {
            if (v == fullName) {
                d = k;
            }
        }
        return d;
    }

    getDoorName(d: string): string { // this function exists just to get rid of undefined from .get(d)
        let t = this.doors.get(d);
        if (t !== undefined)
            return t;
        else return "";
    }

    getDoorTile(d: string): Vector2 {
        let t = this.doorTiles.get(d);
        if (t !== undefined)
            return t;
        else return this.start;
    }

    getCharAtTilePosition(i: number, j: number): string {
        return i >= 0 && j >= 0 && j < this.levelData.length && i < this.levelData[j].length && this.levelData[j][i] || '';
    }

    getWorldPositionFromTile(p: Vector2, out: Vector3): Vector3 {
        out.set(p.x * this.tileSize, 0, p.y * this.tileSize);
        return out;
    }

    getCharFromWorldPosition(p: Vector3): string {
        // given a position, return the level's character living at the tile the position lands on
        // this bypasses the need for an output vector
        const x = Math.floor((p.x + 0.5 * this.tileSize) / this.tileSize)
        const y = Math.floor((p.z + 0.5 * this.tileSize) / this.tileSize);
        return this.getCharAtTilePosition(x, y);
    }


    getTileFromWorldPosition(p: Vector3, out: Vector2): Vector2 {
        out.set(Math.floor((p.x + 0.5 * this.tileSize) / this.tileSize), Math.floor((p.z + 0.5 * this.tileSize) / this.tileSize));
        return out
    }

    collisionV2 = new Vector2();
    collisionV22 = new Vector2();
    collideCircle(p: Vector3, r: number): boolean {   // PRECONDITION: r < this.tileSize * 0.5, r < this.mouseholeWidth * 0.5
        if (r >= this.tileSize * 0.5 || r >= this.mouseholeWidth * 0.5) {
            console.warn(`trying to collide a circle with a radius, r = ${r}, that is too big! results of collision uncertain!, ensure that r < ${this.tileSize * 0.5}, r < ${this.mouseholeWidth * 0.5}`);
        }

        let tile = this.getTileFromWorldPosition(p, this.collisionV2);

        if (!this.isTileWalkable(tile.x, tile.y)) {
            return true;
        }

        let halfTileSize = this.tileSize * 0.5;
        let collided = false;

        let r2 = r * r;
        let deltaPos = this.collisionV22;

        CARDINAL.forEach(v => {
            let tileX = tile.x + v.x;
            let tileY = tile.y + v.y;
            if (!this.isTileAccessible(tile.x, tile.y, tileX, tileY)) {
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
                }
            }
            else if (this.isTileDoor(tileX, tileY)) {
                let currentTileCenterX = tile.x * this.tileSize;
                let currentTileCenterZ = tile.y * this.tileSize;
                let deltaCenterX = p.x - currentTileCenterX;
                let deltaCenterZ = p.z - currentTileCenterZ;
                let currentTileCornerDirectionX = Math.sign(deltaCenterX);
                let currentTileCornerDirectionZ = Math.sign(deltaCenterZ);

                let closestCornerX = 0;
                let closestCornerZ = 0;
                let checkCorner = false;
                const halfHole = this.mouseholeWidth * 0.5;
                if (v.x != 0 && v.x == currentTileCornerDirectionX) {
                    if (Math.abs(deltaCenterZ) >= halfHole) {
                        if (v.x > 0 && p.x + r > currentTileCenterX + halfTileSize) {
                            p.x = currentTileCenterX + halfTileSize - r;
                            collided = true;
                        }
                        else if (v.x < 0 && p.x - r < currentTileCenterX - halfTileSize) {
                            p.x = currentTileCenterX - halfTileSize + r;
                            collided = true;
                        }
                    }
                    else {
                        closestCornerX = tileX * this.tileSize - v.x * halfTileSize;
                        closestCornerZ = tileY * this.tileSize + currentTileCornerDirectionZ * halfHole;
                        checkCorner = true;
                    }
                }
                else if (v.y != 0 && v.y == currentTileCornerDirectionZ) {
                    if (Math.abs(deltaCenterX) >= halfHole) {
                        if (v.y > 0 && p.z + r > currentTileCenterZ + halfTileSize) {
                            p.z = currentTileCenterZ + halfTileSize - r;
                            collided = true;
                        }
                        else if (v.y < 0 && p.z - r < currentTileCenterZ - halfTileSize) {
                            p.z = currentTileCenterZ - halfTileSize + r;
                            collided = true;
                        }
                    }
                    else {
                        closestCornerZ = tileY * this.tileSize - v.y * halfTileSize;
                        closestCornerX = tileX * this.tileSize + currentTileCornerDirectionX * halfHole;
                        checkCorner = true;
                    }
                }

                if (checkCorner) {
                    deltaPos.set(p.x - closestCornerX, p.z - closestCornerZ);
                    if (deltaPos.lengthSq() < r2) {
                        collided = true;

                        deltaPos.normalize().multiplyScalar(r);
                        p.x = closestCornerX + deltaPos.x;
                        p.z = closestCornerZ + deltaPos.y;
                    }
                }
            }
        });

        DIAGONAL.forEach(v => {
            let tileX = tile.x + v.x;
            let tileY = tile.y + v.y;
            if (!this.isTileAccessible(tile.x, tile.y, tileX, tileY)) {
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
export const DEFAULT_LEVEL: LevelName = 'lab'

export type LevelName = 'ohio' | 'lab' | 'the_cheddaverse'

const ohio: LevelMetaData = {
    name: 'ohio',
    cameraType: 'topdown',
    tileSize: 3,
    wallHeight: 3,
    doors: new Map([['l', 'lab'], ['t', 'the_cheddaverse']]),
    ascii: `
 
      l
######@
#######
#######
#######
##   ##
##   ##
## t ##
#######
#######
#######
  `,
    sky: new URL(`${cdn_path}/sky/furry_clouds_1k.hdr`),
    topImage: `${cdn_path}/textures/mc/grass.png`,
    wallImage: `${cdn_path}/textures/mc/grassdirt.png`,
    floorImage: `${cdn_path}/textures/mc/dirt.png`,
}

const lab: LevelMetaData = {
    name: 'lab',
    cameraType: 'topdown',
    tileSize: 5,
    wallHeight: 3,
    ascii: `
#######      
#######      
#######      
#######      
########     
   ###### o   
   #########  
   #########  
   ## ######    
   ###@# ###      
   #########      
   #### ####      
   #########   
   #########
            
  `,
    doors: new Map([['o', 'ohio'],]),
    sky: new URL(`${cdn_path}/sky/vintage_measuring_lab_1k.hdr`),
    wallImage: `${cdn_path}/textures/etc/plywood.png`,
    floorImage: `${cdn_path}/textures/etc/concrete.png`,
}
const the_cheddaverse: LevelMetaData = {
    name: 'the_cheddaverse',
    cameraType: 'topdown',
    tileSize: 24,
    wallHeight: 24,
    doors: new Map([
        ['o', 'ohio'],
    ]),
    ascii: `
                 
                 
     #  #        
   #########     
   #       #     
   # o     ##
   ####@####      
       #   #      
       #####      
    `,
    sky: new URL(`${cdn_path}/sky/wasteland_clouds_puresky_1k.hdr`),
    topImage: `${cdn_path}/textures/win95/wall.png`,
    wallImage: `${cdn_path}/textures/win95/wall.png`,
    floorImage: `${cdn_path}/textures/win95/floor.png`,
}

export const levels: { [index: string]: any } = { ohio, lab, the_cheddaverse }

const CARDINAL = [new Vector2(0, 1), new Vector2(1, 0), new Vector2(0, -1), new Vector2(-1, 0)];
const DIAGONAL = [new Vector2(1, 1), new Vector2(1, -1), new Vector2(-1, -1), new Vector2(-1, 1)];

export { CARDINAL, DIAGONAL };

