import { Camera, PerspectiveCamera, Vector2, Vector3 } from "three";
import { Time } from "./Time";
import { CARDINAL, Level } from "./Level";
import { Mouse } from "./Mouse";
import { Utils } from "./Utils";

export class CameraMovement
{
    camera : PerspectiveCamera;
    distanceFromFloor : number;
    distanceFromWall : number;
    distanceFromPlayer : number;

    constructor(cam : PerspectiveCamera, player: Mouse, level: Level)
    {
        this.camera = cam;
        this.distanceFromFloor = level.wallHeight * 0.5;
        this.distanceFromWall = level.tileSize * 0.5;
        this.distanceFromPlayer = level.tileSize;

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
        this.camera.lookAt(player.object.position);
        this.camera.updateProjectionMatrix();
    }

    currentPlayerTile : Vector2 = new Vector2();
    previousPlayerTile : Vector2 = new Vector2();
    currentTile : Vector2 = new Vector2();
    cameraDeltaTile : Vector2 = new Vector2();
    cameraDeltaPosition : Vector3 = new Vector3();
    wantedDeltaPosition : Vector3 = new Vector3();
    
    lerping = false;

    cameraSpeed = 20;

    update(time: Time, player: Mouse, level: Level)
    {
        level.getTileFromWorldPosition(player.object.position, this.currentPlayerTile);

        if (this.currentPlayerTile.x != this.previousPlayerTile.x || this.currentPlayerTile.y != this.previousPlayerTile.y)
        {
            let walkingIntoCamera = (this.currentPlayerTile.x == this.currentTile.x && this.currentPlayerTile.y == this.currentTile.y);

            this.currentTile.copy(this.currentPlayerTile).add(this.cameraDeltaTile);
            if (!level.isTileWalkable(this.currentTile.x, this.currentTile.y)) {

                let foundCurrentTile = false;
                if (walkingIntoCamera) {
                    CARDINAL.forEach((d) => {
                        if (foundCurrentTile)
                            return;
                        if (d.x != -this.cameraDeltaTile.x || d.y != -this.cameraDeltaTile.y)
                        {   // Only consider tiles that don't force the camera over the player first
                            this.currentTile.copy(this.currentPlayerTile).add(d);

                            if (level.isTileWalkable(this.currentTile.x, this.currentTile.y))
                                foundCurrentTile = true;
                        }
                    });
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

            this.previousPlayerTile.copy(this.currentPlayerTile);
        }

        if (this.lerping) {

            let maxFrameDisplacement = time.deltaTime * this.cameraSpeed;
            this.lerping = Utils.MoveTowards(this.cameraDeltaPosition, this.wantedDeltaPosition, maxFrameDisplacement);

            if (!this.lerping) {
                this.cameraDeltaPosition.copy(this.wantedDeltaPosition);
            }
        }

        this.camera.position.copy(player.object.position).add(this.cameraDeltaPosition);
        this.camera.lookAt(player.object.position);
        this.camera.updateProjectionMatrix();
    }
}