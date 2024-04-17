import { Object3D, Quaternion, Vector3 } from "three";
import { Time } from "./Time";
import { InputManager } from "./InputManager";
import { Constants } from "./constants";

export class FreeCamera {
    public enabled : boolean = false;
    public speed : number = 5;
    cam : Object3D;
    constructor(camera : Object3D) {
        this.cam = camera;
    }

    forward : Vector3 = new Vector3();
    right : Vector3 = new Vector3();
    up : Vector3 = new Vector3();
    rotation : Quaternion = new Quaternion();

    update(time : Time, input: InputManager)
    {
        if (!this.enabled) return;

        let maxMovement = this.speed * time.deltaTime;

        this.forward.copy(Constants.forward).applyQuaternion(this.cam.quaternion).multiplyScalar(maxMovement);
        this.right.copy(Constants.right).applyQuaternion(this.cam.quaternion).multiplyScalar(maxMovement);
        this.up.copy(Constants.up).applyQuaternion(this.cam.quaternion).multiplyScalar(maxMovement);


        if (!input.shift.pressed) {
            if (input.forward.pressed)
                this.cam.position.add(this.up);
            if (input.backward.pressed)
                this.cam.position.sub(this.up);
            if (input.right.pressed)
                this.cam.position.add(this.right);
            if (input.left.pressed)
                this.cam.position.sub(this.right);
            if (input.up.pressed)
                this.cam.position.add(this.forward);
            if (input.down.pressed)
                this.cam.position.sub(this.forward);
        }
        else {
            maxMovement *= 0.3;
            if (input.forward.pressed)
                this.cam.quaternion.multiply(this.rotation.setFromAxisAngle(Constants.forward, -maxMovement))
            if (input.backward.pressed)
                this.cam.quaternion.multiply(this.rotation.setFromAxisAngle(Constants.forward, maxMovement))
            if (input.right.pressed)
                this.cam.quaternion.multiply(this.rotation.setFromAxisAngle(Constants.up, -maxMovement))
            if (input.left.pressed)
                this.cam.quaternion.multiply(this.rotation.setFromAxisAngle(Constants.up, maxMovement))
            if (input.up.pressed)
                this.cam.quaternion.multiply(this.rotation.setFromAxisAngle(Constants.right, maxMovement))
            if (input.down.pressed)
                this.cam.quaternion.multiply(this.rotation.setFromAxisAngle(Constants.right, -maxMovement))
        }
    }
}