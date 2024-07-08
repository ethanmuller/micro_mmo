import { Scene, MeshBasicMaterial, Mesh, SphereGeometry, CircleGeometry, Object3D, Vector2, MeshToonMaterial, Material, Quaternion, Vector3, CylinderGeometry, ConeGeometry, MathUtils, TetrahedronGeometry, LineBasicMaterial, CubicBezierCurve3, LineSegments, BufferGeometry, SkinnedMesh, Uint16BufferAttribute, Float32BufferAttribute, Skeleton, Bone, ColorRepresentation, Texture } from "three";
import { Time } from "./Time";
import { Constants } from "./constants";
import { Utils } from "./Utils";
import { TailGeometry } from "./extensions/TailGeometry";

export type SerializedPlayerData = {
    position: Vector3,
    velocity: Vector3
}

type Feet = {
    obj: Object3D,
    neutralPosition: Vector3,
    attachment: Object3D
    stepStartPositon: Vector3,
    stepEndPosition: Vector3,
    onGround: boolean,
    wantsToMove: boolean,
}

export type MouseSkin = {
    furColor: ColorRepresentation,
    skinColor: ColorRepresentation,
    eyeColor: ColorRepresentation,
    noseColor?: ColorRepresentation,
    footColor?: ColorRepresentation
}

export class Mouse {
    public object: Object3D;
    scene: Scene;


    // Materials
    material: Material;
    noseMaterial: Material;
    feetMaterial: Material;
    tailMaterial: Material;
    earMaterial: Material;
    eyeMaterial: Material;

    // movement
    velocity: Vector3 = new Vector3();
    radius: number = 0.8;
    maxSpeed: number = 40;
    drag: number = 0.989;
    collisionSpeedDrop = 0.3; // 
    // wallDrag: number = 3;

    // animation
    randomlyLookHeadMinMax: Vector2 = new Vector2(0.3, 1.5);
    changeHeadLookTimer: number = 0;
    wantedFaceAngle: number = 0;
    currentFaceAngle: number = 0;
    maxFaceRotation: number = Math.PI * 0.25;
    headRadius: number;
    bodyLength: number;
    buttRadius: number;
    headWobbleTime: number = 3;
    headWobbleFrequency: number = 20;
    headWobbleAmount: number = 0.1;
    headWobbleMinHeight: number = 0.2;
    stepHeight: number = 0.45;
    frontLegStepReachSquared: number = 0.7 * 0.7;
    backLegStepReachSquared: number = 0.5 * 0.5;

    // composite body
    headPivot: Object3D;
    butt: Mesh;
    public head: Mesh;
    bodyConnector: Mesh;
    naturalBodyTilt: number;
    face: Object3D;
    snout: Mesh;
    nose: Mesh;
    eyeLeft: Mesh;
    eyeRight: Mesh;
    earLeft: Mesh;
    earRight: Mesh;
    tailBones: Bone[];
    tail: SkinnedMesh;
    tailBonesPositions: Vector3[];
    // Tail
    maxTailThickness: number = 0.1;
    tailStartSlope = 0.35;
    tailSegmentLength: number = 0; // variable
    tailLength = 3.5;
    tailSegments = 5;
    maxTailTwist = Math.PI * 0.4;

    chirpIndex: number = 0;


    feet: Feet[] = [];
    feetTime: number = 0;
    feetMinSteppingSpeed: number = 10;
    feetMaxSteppingSpeed: number = 40;

    rightFootId = 0;
    leftFootId = 1;
    backRightFootId = 2;
    backLeftFootId = 3;

    leavingLevel = false
    enteringLevel = false
    enteringDoorChar = ''
    enteringDoorTile = new Vector2();
    onDoorEnterCallback: ((d: string) => void) | undefined;

    private var = { // just random vectors and quaternions for use during update operations
        q1: new Quaternion(),
        q2: new Quaternion(),
        v1: new Vector3(),
        v2: new Vector3(),
        v3: new Vector3(),
        v4: new Vector3(),
        v2_1: new Vector2(),
    }

    private smoothing = {
        wantedPosition: new Vector3(),
        lastInfoTime: 0,
        lerpTime: 0.3, // const
        lerping: false,
    }

    private frameDisplacementDirection: Vector3 = new Vector3();

    constructor(scene: Scene, skin: MouseSkin, toonRamp: Texture) {
        this.material = new MeshToonMaterial({ color: skin.furColor, gradientMap: toonRamp });
        this.noseMaterial = new MeshBasicMaterial({ color: skin.noseColor ? skin.noseColor : skin.skinColor });
        this.earMaterial = new MeshBasicMaterial({ color: skin.skinColor });
        this.feetMaterial = new MeshToonMaterial({ color: skin.footColor ? skin.footColor : skin.skinColor, gradientMap: toonRamp });
        this.eyeMaterial = new MeshBasicMaterial({ color: skin.eyeColor });
        this.tailMaterial = new MeshToonMaterial({ color: skin.skinColor, gradientMap: toonRamp });

        const buttRadius = this.buttRadius = 0.89;
        this.headRadius = 0.6;
        this.bodyLength = buttRadius + this.headRadius - 0.1;
        const snoutRadius = 0.47;

        const snoutLength = 0.5;
        const snoutTilt = 0;// Math.PI*0.2;
        const snoutPlacement = new Vector3(0, 0, -0.02);
        const noseRadius = 0.05;
        const eyeRadius = 0.075;
        const earRadius = 0.25;
        this.headPivot = new Object3D();
        this.butt = new Mesh(new SphereGeometry(buttRadius, 12, 12), this.material);
        scene.add(this.butt);
        this.bodyConnector = new Mesh(new CylinderGeometry(buttRadius, this.headRadius, 1, 12, 1, true), this.material);
        this.bodyConnector.quaternion.setFromAxisAngle(new Vector3(1, 0, 0), Math.PI * 0.5);
        this.bodyConnector.position.z = -this.bodyLength * 0.5;
        this.bodyConnector.scale.set(1, this.bodyLength, 1);
        this.butt.add(this.bodyConnector);
        let radiusDifference = buttRadius - this.headRadius;
        this.naturalBodyTilt = -Math.asin(radiusDifference / this.bodyLength);
        //this.butt.quaternion.setFromAxisAngle(new Vector3(1,0,0), this.naturalBodyTilt);

        this.head = new Mesh(new SphereGeometry(this.headRadius, 12, 12), this.material);
        //this.head.position.z = -bodyLength;
        //this.butt.add(this.head);

        this.head.position.y = this.headRadius;
        this.headPivot.add(this.head);

        this.face = new Object3D();
        this.head.add(this.face)
        this.snout = new Mesh(new ConeGeometry(snoutRadius, snoutLength, 12, 12, true), this.material);
        this.snout.quaternion.setFromAxisAngle(new Vector3(1, 0, 0), -snoutTilt - Math.PI * 0.5);
        this.snout.position.z = -this.headRadius;
        this.snout.position.add(snoutPlacement);
        this.face.add(this.snout);
        this.nose = new Mesh(new SphereGeometry(noseRadius, 8, 8), this.noseMaterial);
        this.nose.position.y = snoutLength * 0.5;
        this.eyeLeft = new Mesh(new SphereGeometry(eyeRadius, 8, 8), this.eyeMaterial);
        this.eyeLeft.position.z = snoutLength * 0.4;
        this.eyeLeft.position.y = snoutLength * 0.1 * -1;
        this.eyeLeft.position.x = snoutLength * 0.5;
        this.eyeRight = this.eyeLeft.clone()
        this.eyeRight.position.x *= -1
        const earSegments = 7;
        this.earLeft = new Mesh(new CircleGeometry(earRadius, earSegments), this.earMaterial);
        this.earLeft.position.x += 0.49
        this.earLeft.position.z += .45
        this.earLeft.position.y -= .35
        this.earLeft.rotateX(-Math.PI * 0.5)

        const backEarDepth = earRadius * 0.7;
        // Some trigonometry to get automatic placement of back-ear depending on backEarDepth
        const backEarAlpha = Math.atan(earRadius / backEarDepth);
        const backEarRadius = Math.sqrt(earRadius * earRadius + backEarDepth * backEarDepth) / (2 * Math.cos(backEarAlpha));
        let backEarLeft = new Mesh(new SphereGeometry(backEarRadius, earSegments, 2, undefined, undefined, undefined, Math.PI - backEarAlpha * 2), this.material);
        backEarLeft.rotateX(-Math.PI * 0.5)
        backEarLeft.rotateY(-Math.PI)
        backEarLeft.position.z = backEarRadius - backEarDepth;
        this.earLeft.add(backEarLeft);

        this.earRight = this.earLeft.clone()
        this.earLeft.position.x *= -1;
        this.snout.add(this.nose, this.eyeLeft, this.eyeRight, this.earLeft, this.earRight);
        // whiskers
        let whiskerLineDivisions = 8;
        let whiskerPoints: Vector3[] = [];
        let whiskerIndexes: number[] = [];
        let whiskersGeometry = new BufferGeometry();

        let addWhiskerCurve = function(curve: CubicBezierCurve3) {
            let whiskerStart = whiskerPoints.length;
            whiskerPoints = whiskerPoints.concat(curve.getPoints(whiskerLineDivisions));
            for (let i = 0; i < whiskerLineDivisions; ++i) {
                whiskerIndexes.push(whiskerStart + i, whiskerStart + i + 1);
            }
        }
        let addTwoSymetricWhiskers = function(curve: CubicBezierCurve3) {
            addWhiskerCurve(curve);
            curve.v0.x = -curve.v0.x;
            curve.v1.x = -curve.v1.x;
            curve.v2.x = -curve.v2.x;
            curve.v3.x = -curve.v3.x;
            addWhiskerCurve(curve);
        }
        addTwoSymetricWhiskers(new CubicBezierCurve3(new Vector3(-0.7, 0.15, 0.2), new Vector3(-0.3, 0.15, 0), new Vector3(-0.2, 0.1, 0), new Vector3(0, 0.1, 0)));
        addTwoSymetricWhiskers(new CubicBezierCurve3(new Vector3(-0.66, 0.17, -0.2), new Vector3(-0.3, 0.17, 0), new Vector3(-0.2, 0.12, 0), new Vector3(0, 0.12, 0.07)));
        addTwoSymetricWhiskers(new CubicBezierCurve3(new Vector3(-0.8, 0.0, -0.1), new Vector3(-0.6, 0.05, -0.09), new Vector3(-0.2, 0.09, -0.09), new Vector3(0, 0.09, 0.05)));

        whiskersGeometry.setFromPoints(whiskerPoints);
        whiskersGeometry.setIndex(whiskerIndexes);
        let whiskers = new LineSegments(whiskersGeometry, new LineBasicMaterial({ transparent: true, opacity: 0.3 }));
        this.snout.add(whiskers);


        this.object = new Object3D();
        this.object.add(this.headPivot);
        this.butt.position.copy(this.object.position);
        this.butt.position.z += this.bodyLength;
        this.butt.position.y = this.radius;
        scene.add(this.object);
        this.scene = scene;

        // Feet
        let foot = new Object3D();
        const footSize = 0.3;
        let footMesh = new Mesh(new TetrahedronGeometry(footSize, 1), this.feetMaterial);
        foot.add(footMesh);
        footMesh.quaternion.setFromAxisAngle(Constants.right, Math.PI * 0.25);
        footMesh.quaternion.premultiply(this.var.q1.setFromAxisAngle(Constants.up, Math.PI * 0.5));
        foot.scale.set(0.7, 1, 1);
        let footYPos = footSize * 0.25;

        this.feet = [];
        this.rightFootId = this.createFeet(foot, this.object, new Vector3(this.headRadius, footYPos, 0.2));
        this.leftFootId = this.createFeet(foot.clone(), this.object, new Vector3(-this.headRadius, footYPos, 0.2));
        this.backRightFootId = this.createFeet(foot.clone(), this.butt, new Vector3(buttRadius - 0.1, footYPos, 0));
        this.backLeftFootId = this.createFeet(foot.clone(), this.butt, new Vector3(-buttRadius + 0.1, footYPos, 0));

        // Tail

        let tailGeometry = new TailGeometry(this.maxTailThickness, this.tailLength, 7, this.tailSegments, this.tailStartSlope);
        const position = tailGeometry.attributes.position;
        const vertex = new Vector3();
        const skinIndices = [];
        const skinWeights = [];
        this.tailSegmentLength = this.tailLength / this.tailSegments;
        for (let i = 0; i < position.count; i++) {

            vertex.fromBufferAttribute(position, i);

            // compute skinIndex and skinWeight based on some configuration data
            const y = (vertex.y + this.tailLength * 0.5);
            const skinIndex = Math.round(y / this.tailSegmentLength);
            //const skinWeight = ( y % tailSegmentHeight ) / tailSegmentHeight;
            skinIndices.push(skinIndex, 0, 0, 0);
            skinWeights.push(1, 0, 0, 0);
            //console.log(skinIndex);
        }
        tailGeometry.setAttribute('skinIndex', new Uint16BufferAttribute(skinIndices, 4));
        tailGeometry.setAttribute('skinWeight', new Float32BufferAttribute(skinWeights, 4));
        this.tail = new SkinnedMesh(tailGeometry, this.tailMaterial);
        //tailMesh.bindMode = DetachedBindMode;
        const tailBones = [];
        this.tailBonesPositions = []
        for (let i = 0; i <= this.tailSegments; ++i) {
            const bone = new Bone();
            tailBones.push(bone);
            if (i == 0) {
                bone.position.y = -this.tailLength * 0.5;
                bone.quaternion.setFromAxisAngle(Constants.right, Math.PI * 0.5);
            }
            else {
                tailBones[i - 1].add(bone);
                bone.position.z = -this.tailSegmentLength;
            }
            this.tailBonesPositions.push(new Vector3(0, 0, this.tailSegmentLength * i));
        }
        //console.log(`Bone count: ${tailBones.length}`)

        const tailSkeleton = new Skeleton(tailBones);

        this.tail.add(tailBones[0]);
        this.tail.bind(tailSkeleton);
        tailBones[0].position.y = 0;
        tailBones[0].position.z = 0;//-= buttRadius - 0.2;
        this.scene.add(this.tail);
        this.tailBones = tailBones;
    }

    private createFeet(obj: Object3D, attachment: Object3D, neutralPosition: Vector3): number {
        let f: Feet = {
            obj: obj,
            attachment: attachment,
            neutralPosition: neutralPosition,
            stepStartPositon: new Vector3(),
            stepEndPosition: new Vector3(),
            onGround: true,
            wantsToMove: false,
        };
        let id = this.feet.length;
        this.scene.add(obj);
        this.feet.push(f);
        this.getFootNeutralPosition(id, f.obj.position, Constants.forward, Constants.right);
        f.stepEndPosition.copy(f.stepEndPosition.copy(f.obj.position));
        return id;
    }

    private previousFramePosition = new Vector3();

    update(time: Time) {
      let positionBefore = this.previousFramePosition.copy(this.object.position);

      this.object.position.x += this.velocity.x * time.deltaTime;
      this.object.position.z += this.velocity.z * time.deltaTime;


        // Visually update, animations
        this.headWobbleTime += time.deltaTime;
        this.headPivot.position.y = (Math.sin(this.headWobbleTime * this.headWobbleFrequency) * 0.5 + 0.5) * this.headWobbleAmount + this.headWobbleMinHeight;

        let frameDisplacement = positionBefore.sub(this.object.position);
        frameDisplacement.multiplyScalar(-1);
        let isMoving = frameDisplacement.lengthSq() > 0.0001;
        if (isMoving) {
            let aux = this.var.v1.copy(frameDisplacement);
            aux.normalize();
            this.frameDisplacementDirection.lerp(frameDisplacement, time.deltaTime * 20);
            this.wantedFaceAngle = Utils.SignedAngle2D(Constants.forward, this.frameDisplacementDirection);
        }
        let headPos = this.var.v1;
        this.head.getWorldPosition(headPos);

        let deltaHead = this.var.v2.copy(headPos);
        deltaHead.sub(this.butt.position);

        deltaHead.normalize();
        let buttDisplacement = this.var.v3.copy(deltaHead).multiplyScalar(this.bodyLength);
        let buttPreviousPosition = this.var.v4.copy(this.butt.position);
        this.butt.position.copy(headPos).sub(buttDisplacement);
        let buttFrameDisplacement = buttPreviousPosition.sub(this.butt.position).multiplyScalar(-1);
        this.butt.position.y = this.buttRadius;
        buttDisplacement.multiplyScalar(-2).add(headPos);
        this.butt.lookAt(buttDisplacement)
        //this.butt.quaternion.setFromUnitVectors(Constants.forward, deltaHead);
        // deal with squishing
        deltaHead.copy(headPos);
        deltaHead.sub(this.butt.position);
        let bodyLength = deltaHead.length();
        this.bodyConnector.scale.set(1, bodyLength, 1);
        let bodyAngle = Utils.SignedAngle2D(Constants.forward, deltaHead);

        this.butt.updateMatrixWorld(true);
        this.animateTail(time);

        this.animateFeet(time);

        if (!isMoving) {
            this.changeHeadLookTimer -= time.deltaTime;
            if (this.changeHeadLookTimer <= 0) {
                this.changeHeadLookTimer = MathUtils.lerp(this.randomlyLookHeadMinMax.x, this.randomlyLookHeadMinMax.y, Math.random());
                this.wantedFaceAngle = bodyAngle + this.maxFaceRotation * (Math.random() - 0.5) * 2;
            }
        }
        else {
            this.changeHeadLookTimer = 0;
        }

        // Make sure we deal with angles before checking
        let signedDistance = this.wantedFaceAngle - this.currentFaceAngle;
        while (signedDistance > Math.PI) {
            signedDistance -= Math.PI * 2;
            this.wantedFaceAngle -= Math.PI * 2;
        }
        while (signedDistance < -Math.PI) {
            signedDistance += Math.PI * 2;
            this.wantedFaceAngle += Math.PI * 2;
        }

        if (Math.abs(signedDistance) > Number.EPSILON) {
            const maxHeadRotationSpeed = time.deltaTime * Math.PI * 1;

            if (Math.abs(signedDistance) < maxHeadRotationSpeed) {
                this.currentFaceAngle = this.wantedFaceAngle;
            }
            else {
                this.currentFaceAngle += Math.sign(signedDistance) * maxHeadRotationSpeed;
                this.currentFaceAngle = MathUtils.lerp(this.currentFaceAngle, this.wantedFaceAngle, time.deltaTime * 5);
            }

            this.currentFaceAngle = Utils.ClampAngleDistance(bodyAngle, this.currentFaceAngle, this.maxFaceRotation)
        }

        this.face.quaternion.setFromAxisAngle(Constants.up, this.currentFaceAngle);


    }


    // frame after frame vars of function below
    private tailDeltaDirection = new Vector3();
    private tailQuat = new Quaternion();
    private tailPrevDelta = new Vector3();

    private animateTail(time: Time) {
        this.tail.position.copy(this.butt.position);
        this.tail.position.y = this.maxTailThickness;
        this.tailBonesPositions[0].copy(this.tail.position);
        this.tailBones[0].rotation.x = Math.PI

        let prevAngle = 0;

        for (let i = 1; i < this.tailBones.length; ++i) {
            const angle = -Math.PI*0.1 + (i * 0.03) - Math.abs(Math.sin(time.time*10)* 0.2)
            this.tailBones[i].rotation.x = angle
            // prevAngle += angle;
        }
    }

    private feetBodyRight = new Vector3();
    private feetDeltaPos = new Vector3();
    private animateFeet(time: Time) {
      const mult = 20
        for (let i = 0; i < this.feet.length; ++i) {
            const f = this.feet[i]
            this.getFootNeutralPosition(i, f.obj.position, Constants.forward, Constants.right);
            f.obj.position.y = (Math.sin(mult*time.time + Math.PI*i*0.5) + 1)*0.1
        }
    }

    private forwardClone = new Vector3();
    private rightClone = new Vector3();
    private getFootNeutralPosition(feetId: number, outVector: Vector3, forward: Vector3, right: Vector3) {
        outVector.copy(this.feet[feetId].attachment.position);
        const relPos = this.feet[feetId].neutralPosition;
        outVector.add(this.forwardClone.copy(forward).multiplyScalar(relPos.z));
        outVector.add(this.rightClone.copy(right).multiplyScalar(relPos.x));
        // TODO Y position might vary
        outVector.y = this.feet[feetId].neutralPosition.y;
    }

    serializePlayerData(): SerializedPlayerData {
        return {
            position: this.object.position,
            velocity: this.velocity
        }
    }

    onRemotePlayerData(data: SerializedPlayerData, time: Time) {
        this.smoothing.wantedPosition.copy(data.position);
        this.smoothing.lastInfoTime = time.time;
        this.smoothing.lerping = true;
        this.velocity.copy(data.velocity);
        //console.log(`timeSinceItWasSent (seconds): ${timeSinceItWasSent}`);
    }

    animateOutOfDoor(d: string) {
        this.enteringDoorChar = d;
        this.enteringLevel = true;
    }

    dispose() {
        this.scene.remove(this.object);
        this.scene.remove(this.butt);
        this.feet.forEach((f) => {
            if (f) {
                this.scene.remove(f.obj);
            }
        })
        this.scene.remove(this.tail);

    }
}
