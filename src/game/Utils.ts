import { Vector3 } from "three";

export class Utils {
    static SignedAngle2D(from: Vector3, to: Vector3, aux?: Vector3) : number
    {
        if (!aux) aux = new Vector3();

        let angleSign = Math.sign(aux.crossVectors(from, to).y);
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