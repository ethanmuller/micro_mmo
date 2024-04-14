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
    rotationSpeed : number = 1;
    velocity : Vector2;
    radius : number = 0.5;
    scene: Scene;
    maxSpeed : number = 24;

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
        this.instantRotation = new Quaternion();
        this.instantRotation2 = new Quaternion();
        this.right = new Vector3(1,0,0);
        this.forward = new Vector3(0,0,-1);
    }

    instantRotation : Quaternion;
    instantRotation2 : Quaternion;
    right : Vector3;
    forward : Vector3;

    update(time : Time, worldBoundaries : Box2, input? : InputManager)
    {
        if (input) { // Local players
            this.velocity.x = 0;
            if (input.left.pressed)
                this.velocity.x -= this.maxSpeed;
            if (input.right.pressed)
                this.velocity.x += this.maxSpeed;
            
            this.velocity.y = 0;
            if (input.down.pressed)
                this.velocity.y += this.maxSpeed;
            if (input.up.pressed)
                this.velocity.y -= this.maxSpeed;
        }
        else { // Other players
            
        }

        // Move and collide against AABB world boundaries
        this.object.position.x += this.velocity.x * time.deltaTime;
        this.object.position.z += this.velocity.y * time.deltaTime;

        let bounciness = 0.9;
 
        if (this.object.position.x + this.radius > worldBoundaries.max.x)
        {
            this.object.position.x = worldBoundaries.max.x - this.radius;
            if (this.velocity.x > 0)
                this.velocity.x = -bounciness * this.velocity.x;
        }
        else if (this.object.position.x - this.radius < worldBoundaries.min.x) {
            this.object.position.x = worldBoundaries.min.x + this.radius;
            if (this.velocity.x < 0)
                this.velocity.x = -bounciness * this.velocity.x;
        }
        if (this.object.position.z + this.radius > worldBoundaries.max.y)
        {
            this.object.position.z = worldBoundaries.max.y - this.radius;
            if (this.velocity.y > 0)
                this.velocity.y = -bounciness * this.velocity.y;
        }
        else if (this.object.position.z - this.radius < worldBoundaries.min.y) {
            this.object.position.z = worldBoundaries.min.y + this.radius;
            if (this.velocity.y < 0)
                this.velocity.y = -bounciness * this.velocity.y;
        }

        // Visually update
        this.instantRotation.setFromAxisAngle(this.right, this.rotationSpeed * this.velocity.y / this.radius * time.deltaTime);
        this.instantRotation2.setFromAxisAngle(this.forward, this.rotationSpeed * this.velocity.x / this.radius * time.deltaTime);
        this.instantRotation.multiply(this.instantRotation2);
        this.mesh.quaternion.premultiply(this.instantRotation);
    }

    serializePlayerData() : SerializedPlayerData {
        return {
            position : this.object.position,
            velocity: this.velocity
        }
    }

    onRemotePlayerData(data : SerializedPlayerData, timeSinceItWasSent : number) {
        this.object.position.copy(data.position);
        this.object.position.x += data.velocity.x * timeSinceItWasSent;
        this.object.position.z += data.velocity.y * timeSinceItWasSent;
        this.velocity.copy(data.velocity);
    }

    dispose() {
        this.mesh.geometry.dispose();
        this.scene.remove(this.object);
    }
}