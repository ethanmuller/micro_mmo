import { Vector3 } from "three";

export class Utils {

    private static aux : Vector3 = new Vector3();

    static SignedAngle2D(from: Vector3, to: Vector3) : number
    {
        let angleSign = Math.sign(this.aux.crossVectors(from, to).y);
        return from.angleTo(to) * angleSign;
    }

    static ClampAngleDistance(base : number, wanted : number, maxDistance : number) {

        let distance = wanted - base;
        while (distance > Math.PI) {
            wanted -= Math.PI * 2;
            distance -= Math.PI * 2;
        }
        while (distance < -Math.PI) {
            wanted += Math.PI * 2;
            distance += Math.PI * 2;
        }

        //distance = wanted - base;
        if (distance > maxDistance)
            return base + maxDistance;
        if (distance < -maxDistance)
            return base - maxDistance;
        return wanted;
    }
}