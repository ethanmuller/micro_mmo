import { MathUtils, Vector3 } from "three";

export class Utils {

    private static aux : Vector3 = new Vector3();
    private static aux2 : Vector3 = new Vector3();

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

    static SlerpTowards(current: Vector3, to: Vector3, maxDistanceDelta: number) : boolean
    {
        this.aux.copy(to).sub(current);
        let magnitude = this.aux.length();
        if (magnitude <= maxDistanceDelta || magnitude == 0)
        {
            current.copy(to);
            return false;
        }
        this.Slerp(current, to, maxDistanceDelta/magnitude, this.aux2); // This is aproximate
        current.copy(this.aux2);
        return true;
    }

    static Slerp(start : Vector3, end : Vector3, percent : number, out : Vector3) : Vector3
    { // Only works for normalized vectors
        // Dot product - the cosine of the angle between 2 vectors.
        let dot = start.dot(end);

        // Clamp it to be in the range of Acos()
        // This may be unnecessary, but floating point
        // precision can be a fickle mistress.
        MathUtils.clamp(dot, -1.0, 1.0);

        // Acos(dot) returns the angle between start and end,
        // And multiplying that by percent returns the angle between
        // start and the final result.
        let theta = Math.acos(dot) * percent;
        let RelativeVec = this.aux.copy(start).multiplyScalar(dot).sub(end).multiplyScalar(-1);
        RelativeVec.normalize();
        RelativeVec.multiplyScalar(Math.sin(theta));

        out.copy(start).multiplyScalar(Math.cos(theta)).add(RelativeVec);
        
        // Orthonormal basis
        // The final result.
        return out;
    }
}