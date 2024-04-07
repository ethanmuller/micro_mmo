import { Scene, BoxGeometry, MeshBasicMaterial, Mesh } from "three";
import { Time } from "./Time";
export class GreenCube {

    geometry : BoxGeometry;
    material : MeshBasicMaterial;
    mesh : Mesh;
    rotationSpeed : number = 1;

    constructor(scene : Scene)
    {
        this.geometry = new BoxGeometry( 1, 1, 1 );
        this.material = new MeshBasicMaterial( { color: 0x00ff00 } );
        this.mesh = new Mesh( this.geometry, this.material );
        scene.add( this.mesh );
    }

    update(time : Time) {
        this.mesh.rotation.x += this.rotationSpeed * time.deltaTime;
        this.mesh.rotation.y += this.rotationSpeed * time.deltaTime;
    }
}