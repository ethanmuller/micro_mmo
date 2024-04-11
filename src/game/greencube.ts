import { Scene, MeshBasicMaterial, Mesh, SphereGeometry, Object3D, Vector2, Box2, MeshNormalMaterial, Material, MeshLambertMaterial, TextureLoader, Quaternion, Vector3, Euler } from "three";
import { Time } from "./Time";
import mouseTexture from "../assets/mouse_texture.png";
export class GreenCube {
    material : Material;
    mesh : Mesh;
    public object : Object3D;
    rotationSpeed : number = 1;
    velocity : Vector2;
    radius : number = 0.5;

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

        this.velocity = new Vector2(1,1);
        this.instantRotation = new Quaternion();
        this.instantRotation2 = new Quaternion();
        this.right = new Vector3(1,0,0);
        this.forward = new Vector3(0,0,-1);
    }

    instantRotation : Quaternion;
    instantRotation2 : Quaternion;
    right : Vector3;
    forward : Vector3;

    update(time : Time, worldBoundaries : Box2) {
        // TODO change velocity given a specific input, probably passed as parameter

        // Move and collide against AABB world boundaries
        this.object.position.x += this.velocity.x * time.deltaTime;
        this.object.position.z += this.velocity.y * time.deltaTime;
 
        if ((this.object.position.x + this.radius > worldBoundaries.max.x && this.velocity.x > 0) ||
            (this.object.position.x - this.radius < worldBoundaries.min.x && this.velocity.x < 0))
        {
            this.velocity.x *= -1;
        }
        if ((this.object.position.z + this.radius > worldBoundaries.max.y && this.velocity.y > 0) ||
            (this.object.position.z - this.radius< worldBoundaries.min.y && this.velocity.y < 0))
        {
            this.velocity.y *= -1;
        }

        // Visually update
        this.instantRotation.setFromAxisAngle(this.right, this.rotationSpeed * this.velocity.y / this.radius * time.deltaTime);
        this.instantRotation2.setFromAxisAngle(this.forward, this.rotationSpeed * this.velocity.x / this.radius * time.deltaTime);
        this.instantRotation.multiply(this.instantRotation2);
        this.mesh.quaternion.premultiply(this.instantRotation);
    }
}