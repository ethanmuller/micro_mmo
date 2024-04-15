import { Scene, MeshBasicMaterial, Mesh, SphereGeometry, Object3D, Vector2, Box2, MeshNormalMaterial, Material, MeshLambertMaterial, TextureLoader, Quaternion, Vector3, Euler } from "three";
import { Time } from "./Time";
import mouseTexture from "../assets/mouse_texture.png";
import { InputManager } from "./InputManager";

export type SerializedPlayerData = {
    position: Vector3,
    velocity: Vector2
}

export class GreenCube {
    material : Material;
    mesh : Mesh;
    public object : Object3D;
    visualRotationSpeedMultiplier : number = 1;
    velocity : Vector2;
    radius : number = 1;
    scene: Scene;
    maxSpeed : number = 40;

    const = {
        right: new Vector3(1,0,0),
        forward: new Vector3(0,0,-1),
    }

    var = {
        rot1: new Quaternion(),
        rot2: new Quaternion(),
        v1: new Vector3(),
    }

    smoothing = {
        wantedPosition: new Vector3(),
        lastInfoTime: 0,
        lerpTime: 0.3, // const
        lerping: false,
    }

    constructor(scene : Scene, loader : TextureLoader)
    {
        this.material = new MeshBasicMaterial( { color: 0xbbbbbb, map: loader.load(mouseTexture)} );
        this.mesh = new Mesh(new SphereGeometry( this.radius, 10, 10 ), this.material );
        this.mesh.position.y += 0.5;
        this.object = new Object3D();
        this.object.add(this.mesh);
        this.object.position.x += Math.random()* 5 - 2.5;
        this.object.position.z += Math.random()* 5 - 2.5;
        scene.add( this.object );
        this.scene = scene;

        this.velocity = new Vector2();
    }

    update(time : Time, worldBoundaries : Box2, input? : InputManager)
    {
        let positionBefore = this.var.v1.copy(this.object.position);

        if (input) { // Local players
            this.velocity.x = 0;
            this.velocity.x = input.trackball.velocity.x
            if (input.left.pressed)
                this.velocity.x -= this.maxSpeed;
            if (input.right.pressed)
                this.velocity.x += this.maxSpeed;
            
            this.velocity.y = 0;
            this.velocity.y = input.trackball.velocity.y
            if (input.down.pressed)
                this.velocity.y += this.maxSpeed;
            if (input.up.pressed)
                this.velocity.y -= this.maxSpeed;
            this.velocity.clampLength(0, this.maxSpeed)
            
        }

        if (!input && this.smoothing.lerping) { // Other players and interpolating
            let lerpTime = time.time - this.smoothing.lastInfoTime;
            let lerpFactor = Math.min(1, Math.max(0, lerpTime/this.smoothing.lerpTime));

            this.smoothing.wantedPosition.x += this.velocity.x * time.deltaTime;
            this.smoothing.wantedPosition.z += this.velocity.y * time.deltaTime;

            this.object.position.lerp(this.smoothing.wantedPosition, lerpFactor);
            
            if (lerpFactor >= 1)
                this.smoothing.lerping = false;
        }
        else {
            this.object.position.x += this.velocity.x * time.deltaTime;
            this.object.position.z += this.velocity.y * time.deltaTime;
        }

        // Move and collide against AABB world boundaries 
        if (this.object.position.x + this.radius > worldBoundaries.max.x)
        {
            this.object.position.x = worldBoundaries.max.x - this.radius;
        }
        else if (this.object.position.x - this.radius < worldBoundaries.min.x) {
            this.object.position.x = worldBoundaries.min.x + this.radius;
        }
        if (this.object.position.z + this.radius > worldBoundaries.max.y)
        {
            this.object.position.z = worldBoundaries.max.y - this.radius;
        }
        else if (this.object.position.z - this.radius < worldBoundaries.min.y) {
            this.object.position.z = worldBoundaries.min.y + this.radius;
        }

        // Visually update
        let frameDisplacement = positionBefore.sub(this.object.position).multiplyScalar(-1);

        let zMovementRotation = this.var.rot1.setFromAxisAngle(this.const.right, frameDisplacement.z / this.radius * this.visualRotationSpeedMultiplier);
        let xMovementRotation = this.var.rot2.setFromAxisAngle(this.const.forward, frameDisplacement.x / this.radius * this.visualRotationSpeedMultiplier);
        zMovementRotation.multiply(xMovementRotation);
        this.mesh.quaternion.premultiply(zMovementRotation);
    }

    serializePlayerData() : SerializedPlayerData {
        return {
            position : this.object.position,
            velocity: this.velocity
        }
    }

    onRemotePlayerData(data : SerializedPlayerData, timeSinceItWasSent : number, time : Time)
    {
        this.smoothing.wantedPosition.copy(data.position);
        this.smoothing.lastInfoTime = time.time;
        this.smoothing.lerping = true;
        this.velocity.copy(data.velocity);
        console.log(`timeSinceItWasSent (seconds): ${timeSinceItWasSent}`);
    }

    dispose() {
        this.mesh.geometry.dispose();
        this.scene.remove(this.object);
    }
}
