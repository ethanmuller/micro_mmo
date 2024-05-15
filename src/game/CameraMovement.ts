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

    constructor(cam : PerspectiveCamera, player: Mouse, level: Level)
    {
        this.camera = cam;
        this.distanceFromFloor = level.wallHeight * 0.5;
        this.distanceFromWall = level.tileSize * 0.5;

        // init
        level.getTileFromWorldPosition(player.object.position, this.currentPlayerTile);
        this.lookAtTile.copy(this.currentPlayerTile);

        let found = false;
        CARDINAL.forEach((d) => {
            if (!found) {
                this.currentTile.copy(this.currentPlayerTile).add(d);

                if (level.isTileWalkable(this.currentTile.x, this.currentTile.y))
                    found = true;
            }
        });

        level.getWorldPositionFromTile(this.currentTile, this.camera.position);
        this.wantedTile.copy(this.currentTile);
        this.camera.position.y += this.distanceFromFloor;
        level.getWorldPositionFromTile(this.lookAtTile, this.lookAtPosition);
        this.wantedLookAtTile.copy(this.lookAtTile);
        this.camera.lookAt(this.lookAtPosition);
        this.camera.updateProjectionMatrix();
    }

    currentPlayerTile : Vector2 = new Vector2();
    lookAtTile : Vector2 = new Vector2();
    lookAtPosition : Vector3 = new Vector3();
    currentTile : Vector2 = new Vector2();

    wantedLookAtTile : Vector2 = new Vector2();
    wantedTile : Vector2 = new Vector2();
    wantedPosition : Vector3 = new Vector3();
    wantedLookAtPosition : Vector3 = new Vector3();
    lerping = false;

    lookAtPlayer = false; // If false, we will look at the center of the tile we are facing

    cameraSpeed = 10;

    update(time: Time, player: Mouse, level: Level)
    {
        level.getTileFromWorldPosition(player.object.position, this.currentPlayerTile);

        if (this.currentPlayerTile.x != this.lookAtTile.x || this.currentPlayerTile.y != this.lookAtTile.y)
        {
            this.wantedLookAtTile.copy(this.currentPlayerTile);
            this.wantedTile.copy(this.lookAtTile);
        }

        if (this.wantedTile.x != this.currentTile.x || this.wantedTile.y != this.currentTile.y || this.wantedLookAtTile.x != this.lookAtTile.x || this.wantedLookAtTile.y != this.lookAtTile.y)
        {
            this.wantedTile.copy(this.wantedTile);
            this.lookAtTile.copy(this.wantedLookAtTile);
            level.getWorldPositionFromTile(this.wantedTile, this.wantedPosition);
            this.wantedPosition.y += this.distanceFromFloor;
            level.getWorldPositionFromTile(this.lookAtTile, this.wantedLookAtPosition);

            this.lerping = true;
        }

        if (this.lerping) {

            let maxFrameDisplacement = time.deltaTime * this.cameraSpeed;
            this.lerping = Utils.MoveTowards(this.camera.position, this.wantedPosition, maxFrameDisplacement);

            if (!this.lerping) {
                this.lookAtPosition.copy(this.wantedLookAtPosition);
            }
            else {
                Utils.MoveTowards(this.lookAtPosition, this.wantedLookAtPosition, maxFrameDisplacement);
            }
            if (!this.lookAtPlayer) {
                this.camera.lookAt(this.lookAtPosition);
                this.camera.updateProjectionMatrix();
            }
        }
        if (this.lookAtPlayer) {
            this.camera.lookAt(player.object.position);
            this.camera.updateProjectionMatrix();
        }
    }
}