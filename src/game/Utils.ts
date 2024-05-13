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

    static MoveTowards(current: Vector3, to: Vector3, maxDistanceDelta: number) : boolean
    {
        this.aux.copy(to).sub(current);
        let magnitude = this.aux.length();
        if (magnitude <= maxDistanceDelta || magnitude == 0)
        {
            current.copy(to);
            return false;
        }
        this.aux.multiplyScalar(maxDistanceDelta/magnitude).add(current);
        current.copy(this.aux);
        return true;
    }
}