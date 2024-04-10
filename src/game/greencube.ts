import { Scene, MeshBasicMaterial, Mesh, SphereGeometry, Object3D, Vector2, Box2 } from "three";
import { Time } from "./Time";
export class GreenCube {
    material : MeshBasicMaterial;
    mesh : Mesh;
    public object : Object3D;
    rotationSpeed : number = 1;
    velocity : Vector2;
    radius : number = 0.5;

    constructor(scene : Scene)
    {
        this.material = new MeshBasicMaterial( { color: 0xbbbbbb } );
        this.mesh = new Mesh(new SphereGeometry( this.radius, 10, 10 ), this.material );
        this.mesh.position.y += 0.5;
        this.object = new Object3D();
        this.object.add(this.mesh);
        this.object.position.x += Math.random()* 5 - 2.5;
        this.object.position.z += Math.random()* 5 - 2.5;
        scene.add( this.object );

        this.velocity = new Vector2(1,1);
    }

    update(time : Time, worldBoundaries : Box2) {
        this.mesh.rotation.x += this.rotationSpeed * time.deltaTime;
        //this.mesh.rotation.y += this.rotationSpeed * time.deltaTime;

        this.object.position.x += this.velocity.x * time.deltaTime;
        this.object.position.z += this.velocity.y * time.deltaTime;

        // test collision with a 10x10 edge world
        var edge : number = 5;
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
    }
}