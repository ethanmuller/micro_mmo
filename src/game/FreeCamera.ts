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
        let maxRotation = maxMovement * 0.3;

        this.forward.copy(Constants.forward).applyQuaternion(this.cam.quaternion).multiplyScalar(maxMovement);
        this.right.copy(Constants.right).applyQuaternion(this.cam.quaternion).multiplyScalar(maxMovement);
        this.up.copy(Constants.up).applyQuaternion(this.cam.quaternion).multiplyScalar(maxMovement);
        
        if (input.W.pressed)
            this.cam.position.add(this.forward);
        if (input.S.pressed)
            this.cam.position.sub(this.forward);
        if (input.D.pressed)
            this.cam.position.add(this.right);
        if (input.A.pressed)
            this.cam.position.sub(this.right);
        if (input.pageUp.pressed)
            this.cam.position.add(this.up);
        if (input.pageDown.pressed)
            this.cam.position.sub(this.up);
        
        if (input.Q.pressed)
            this.cam.quaternion.multiply(this.rotation.setFromAxisAngle(Constants.forward, -maxRotation))
        if (input.E.pressed)
            this.cam.quaternion.multiply(this.rotation.setFromAxisAngle(Constants.forward, maxRotation))
        if (input.rightArrow.pressed)
            this.cam.quaternion.multiply(this.rotation.setFromAxisAngle(Constants.up, -maxRotation))
        if (input.leftArrow.pressed)
            this.cam.quaternion.multiply(this.rotation.setFromAxisAngle(Constants.up, maxRotation))
        if (input.upArrow.pressed)
            this.cam.quaternion.multiply(this.rotation.setFromAxisAngle(Constants.right, maxRotation))
        if (input.downArrow.pressed)
            this.cam.quaternion.multiply(this.rotation.setFromAxisAngle(Constants.right, -maxRotation))
    }
}