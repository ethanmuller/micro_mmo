import { PerspectiveCamera, Vector2, Vector3 } from "three";
import { Time } from "./Time";
import { Level } from "./Level";
import { Mouse } from "./Mouse";
import { Utils } from "./Utils";

export class CameraMovement
{
    camera : PerspectiveCamera;
    constructor(cam : PerspectiveCamera) {
        this.camera = cam;
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

    cameraSpeed = 100;

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
            this.wantedPosition.y += level.wallHeight * 0.5;
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