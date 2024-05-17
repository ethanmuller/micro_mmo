import { PerspectiveCamera, Vector2, Vector3 } from "three";
import { Time } from "./Time";
import { CARDINAL, DIAGONAL, Level } from "./Level";
import { Mouse } from "./Mouse";
import { Utils } from "./Utils";
import { useSettingsStore } from "../stores/settings";


export class CameraMovement {
    camera: PerspectiveCamera;
    distanceFromFloor: number;
    distanceFromWall: number;
    distanceFromPlayer: number;
    lookAtShift: Vector3;

    constructor(cam: PerspectiveCamera, player: Mouse, level: Level) {
        this.camera = cam;
        this.distanceFromFloor = 3.5;
        this.distanceFromWall = 1; // Maximum level.tileSize * 0.5, can be less
        this.distanceFromPlayer = 6; // Minimum should be level.tileSize, can be more
        this.lookAtShift = new Vector3(0, 2, 0); // To tilt the camera up or down mainly

        // init
        level.getTileFromWorldPosition(player.object.position, this.currentPlayerTile);
        this.previousPlayerTile.copy(this.currentPlayerTile);

        let found = false;
        CARDINAL.forEach((d) => {
            if (!found) {
                this.currentTile.copy(this.currentPlayerTile).add(d);

                if (level.isTileWalkable(this.currentTile.x, this.currentTile.y))
                    found = true;
            }
        });

        this.cameraDeltaTile.copy(this.currentTile).sub(this.currentPlayerTile);

        this.cameraDeltaPosition.set(this.cameraDeltaTile.x * this.distanceFromPlayer, this.distanceFromFloor, this.cameraDeltaTile.y * this.distanceFromPlayer);
        this.camera.position.copy(player.object.position).add(this.cameraDeltaPosition);
        this.currentClampedPosition.copy(this.camera.position);
        this.camera.lookAt(player.object.position);
        this.camera.updateProjectionMatrix();
        this.lastFramePlayerPosition.copy(player.object.position);
    }

    currentPlayerTile: Vector2 = new Vector2();
    previousPlayerTile: Vector2 = new Vector2();
    currentTile: Vector2 = new Vector2();
    cameraDeltaTile: Vector2 = new Vector2();
    cameraDeltaPosition: Vector3 = new Vector3();
    wantedDeltaPosition: Vector3 = new Vector3();

    clampedPlayerPosition: Vector3 = new Vector3();
    currentClampedPosition: Vector3 = new Vector3();

    lerping = false;
    lookAtPlayer = false;

    cameraSpeed = 20;

    // variables
    wallTileCheck: Vector2 = new Vector2();
    wallPosition: Vector3 = new Vector3();
    wallTileActual: Vector2 = new Vector2();
    cornerDelta: Vector3 = new Vector3();
    lastFramePlayerPosition: Vector3 = new Vector3();
    walkingIntoCameraCount = 0;

    update(time: Time, player: Mouse, level: Level) {
        const settings = useSettingsStore()

        if (settings.cameraMode === 'iso') {
            this.camera.fov = 30
            this.camera.position.copy(player.object.position);
            this.camera.position.add(new Vector3(90, 90, 90))
            this.camera.lookAt(player.object.position);
            this.camera.updateProjectionMatrix();
        }
        if (settings.cameraMode === 'topdown') {
          this.camera.fov = 17 * window.innerHeight/window.innerWidth
          this.camera.position.copy(player.object.position);
          this.camera.position.add(new Vector3(0, 90, 0))
          this.camera.lookAt(player.object.position);
          this.camera.updateProjectionMatrix();
        }
        if (settings.cameraMode === 'security_cam_1') {
          this.camera.fov = 6 * window.innerHeight/window.innerWidth
          // this.camera.position.copy(player.object.position);
          // this.camera.position.add(new Vector3(0, 90, 0))
          this.camera.position.set(40, 120, -40)
          this.camera.lookAt(player.object.position);
          this.camera.updateProjectionMatrix();
        }
        if (settings.cameraMode === 'mazecam') {
            this.camera.fov = 100
            level.getTileFromWorldPosition(player.object.position, this.currentPlayerTile);

            if (this.currentPlayerTile.x != this.previousPlayerTile.x || this.currentPlayerTile.y != this.previousPlayerTile.y) {
                let walkingIntoCamera = (this.currentPlayerTile.x == this.currentTile.x && this.currentPlayerTile.y == this.currentTile.y);

                if (!walkingIntoCamera)
                    this.walkingIntoCameraCount = 0;
                else this.walkingIntoCameraCount++;

                if (walkingIntoCamera && this.walkingIntoCameraCount > 1) {
                    this.currentTile.copy(this.previousPlayerTile); // let's try flipping

                    this.cameraDeltaTile.copy(this.currentTile).sub(this.currentPlayerTile);
                    this.wantedDeltaPosition.set(this.cameraDeltaTile.x * this.distanceFromPlayer, this.distanceFromFloor, this.cameraDeltaTile.y * this.distanceFromPlayer);
                    this.lerping = true;
                }
                else {
                    this.currentTile.copy(this.currentPlayerTile).add(this.cameraDeltaTile);

                    if (!level.isTileWalkable(this.currentTile.x, this.currentTile.y)) {

                        let foundCurrentTile = false;
                        if (walkingIntoCamera) {
                            let furthestDistance = 0;
                            let furthestDelta = CARDINAL[0];
                            CARDINAL.forEach((d) => {
                                if (d.x != -this.cameraDeltaTile.x || d.y != -this.cameraDeltaTile.y) {   // Only consider tiles that don't force the camera over the player first
                                    this.currentTile.copy(this.currentPlayerTile).add(d);

                                    if (level.isTileWalkable(this.currentTile.x, this.currentTile.y)) {
                                        level.getWorldPositionFromTile(this.currentTile, this.wallPosition);

                                        let deltaPos = this.wallPosition.sub(player.object.position);
                                        let dist = deltaPos.length();
                                        if (furthestDistance < dist) {
                                            furthestDelta = d;
                                            furthestDistance = dist;
                                            foundCurrentTile = true;
                                        }
                                    }
                                }
                            });

                            if (foundCurrentTile)
                                this.currentTile.copy(this.currentPlayerTile).add(furthestDelta);
                        }

                        if (!foundCurrentTile) {
                            this.currentTile.copy(this.previousPlayerTile); // the best bet is just use the previous player tile

                            if (!level.isTileWalkable(this.currentTile.x, this.currentTile.y)) // shouldn't happen, but just in case
                            {
                                CARDINAL.forEach((d) => {
                                    if (foundCurrentTile)
                                        return;

                                    this.currentTile.copy(this.currentPlayerTile).add(d);

                                    if (level.isTileWalkable(this.currentTile.x, this.currentTile.y))
                                        foundCurrentTile = true;
                                });
                            }
                        }

                        this.cameraDeltaTile.copy(this.currentTile).sub(this.currentPlayerTile);
                        this.wantedDeltaPosition.set(this.cameraDeltaTile.x * this.distanceFromPlayer, this.distanceFromFloor, this.cameraDeltaTile.y * this.distanceFromPlayer);
                        this.lerping = true;
                    }
                }

                this.previousPlayerTile.copy(this.currentPlayerTile);
            }

            let playerFrameDisplacement = this.lastFramePlayerPosition.sub(player.object.position);

            if (this.lerping) {

                let maxFrameDisplacement = playerFrameDisplacement.length() * 2;
                this.lerping = Utils.MoveTowards(this.cameraDeltaPosition, this.wantedDeltaPosition, maxFrameDisplacement);

                if (!this.lerping) {
                    this.cameraDeltaPosition.copy(this.wantedDeltaPosition);
                }
            }

            this.lastFramePlayerPosition.copy(player.object.position);

            this.clampedPlayerPosition.copy(player.object.position).add(this.cameraDeltaPosition);
            level.getTileFromWorldPosition(this.currentClampedPosition, this.wallTileActual);
            // stay away from walls
            let scope = this;

            CARDINAL.forEach(d => {
                let t = scope.wallTileCheck.copy(scope.wallTileActual).add(d);

                if (!level.isTileWalkable(t.x, t.y)) {
                    let p = level.getWorldPositionFromTile(t, scope.wallPosition);
                    if (d.x < 0)
                        scope.clampedPlayerPosition.x = Math.max(scope.clampedPlayerPosition.x, p.x + level.tileSize * 0.5 + scope.distanceFromWall);
                    else if (d.x > 0)
                        scope.clampedPlayerPosition.x = Math.min(scope.clampedPlayerPosition.x, p.x - level.tileSize * 0.5 - scope.distanceFromWall);
                    else if (d.y < 0)
                        scope.clampedPlayerPosition.z = Math.max(scope.clampedPlayerPosition.z, p.z + level.tileSize * 0.5 + scope.distanceFromWall);
                    else if (d.y > 0)
                        scope.clampedPlayerPosition.z = Math.min(scope.clampedPlayerPosition.z, p.z - level.tileSize * 0.5 - scope.distanceFromWall);
                }
            })

            let wallDistanceSqrd = this.distanceFromWall * this.distanceFromWall;
            let hitCorner = false;
            DIAGONAL.forEach(d => {
                if (hitCorner) return;
                let t = scope.wallTileActual;

                if (level.isTileWalkable(t.x + d.x, t.y + 0) && level.isTileWalkable(t.x + 0, t.y + d.y) && !level.isTileWalkable(t.x + d.x, t.y + d.y)) {
                    // take diagonal corner into account
                    let cornerPosition = level.getWorldPositionFromTile(t, scope.wallPosition);
                    cornerPosition.x += d.x * level.tileSize * 0.5;
                    cornerPosition.z += d.y * level.tileSize * 0.5;

                    let deltaCorner = scope.cornerDelta.copy(cornerPosition).sub(scope.clampedPlayerPosition).multiplyScalar(-1);
                    deltaCorner.y = 0;

                    if (deltaCorner.lengthSq() < wallDistanceSqrd) {
                        deltaCorner.normalize().multiplyScalar(scope.distanceFromWall);
                        scope.clampedPlayerPosition.copy(cornerPosition).add(deltaCorner);
                        scope.clampedPlayerPosition.y = scope.cameraDeltaPosition.y;
                        hitCorner = true;
                    }
                }
            })


            this.camera.position.copy(this.clampedPlayerPosition);//.add(this.cameraDeltaPosition);
            this.currentClampedPosition.copy(this.clampedPlayerPosition);
            let lookAtPosition = this.clampedPlayerPosition;
            if (this.lookAtPlayer) {
                lookAtPosition.copy(player.object.position);
            }
            else {
                lookAtPosition.sub(this.cameraDeltaPosition);
            }

            lookAtPosition.add(this.lookAtShift);
            this.camera.lookAt(lookAtPosition);
            this.camera.updateProjectionMatrix();
        }

    }
}
