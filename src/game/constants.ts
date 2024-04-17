import { Vector3 } from "three";

export class Constants {
    static up: Vector3 = new Vector3(0,1,0);
    static down: Vector3 = new Vector3(0,-1,0);
    static left: Vector3 = new Vector3(-1,0,0);
    static right: Vector3 = new Vector3(1,0,0);
    static forward: Vector3 = new Vector3(0,0,-1);
    static backward: Vector3 = new Vector3(0,0,1);
    static zero: Vector3 = new Vector3();
}