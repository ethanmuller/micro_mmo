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
    lookAtPosition : Vector3 = new Vector3();

    playerTop(time: Time, player: Mouse, level: Level) {
      this.camera.position.copy(player.object.position)
      this.camera.position.y += 10
      this.camera.position.z += 10

      this.lookAtPosition.copy(player.object.position);
      this.camera.lookAt(this.lookAtPosition);
      this.camera.updateProjectionMatrix();
    }

    update(time: Time, player: Mouse, level: Level)
    {
      this.playerTop(time, player, level)
    }
}
