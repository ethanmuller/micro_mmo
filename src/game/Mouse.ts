import { Scene, MeshBasicMaterial, Mesh, SphereGeometry, CircleGeometry, Object3D, Vector2, Box2, MeshToonMaterial, Material, TextureLoader, Quaternion, Vector3, CylinderGeometry, ConeGeometry, DoubleSide, MathUtils, NearestFilter, TetrahedronGeometry, LineBasicMaterial, Line, CubicBezierCurve3, LineSegments, BufferGeometry, SkinnedMesh, Uint16BufferAttribute, Float32BufferAttribute, Skeleton, Object3DEventMap, Bone, SkeletonHelper, DetachedBindMode} from "three";
import { Time } from "./Time";
import toonTexture from "../assets/threeTone_bright.jpg";
import { InputManager } from "./InputManager";
import { Constants } from "./constants";
import { Utils } from "./Utils";
import { LineGeometry } from "three/examples/jsm/Addons.js";

export type SerializedPlayerData = {
    position: Vector3,
    velocity: Vector3
}

type Feet = {
    obj : Object3D,
    neutralPosition : Vector3,
    attachment : Object3D
    stepStartPositon : Vector3,
    stepEndPosition : Vector3,
    onGround : boolean,
    wantsToMove : boolean,
}

export class Mouse
{
    public object : Object3D;
    scene: Scene;
    
    // Materials
    material : Material;
    noseMaterial : Material;
    feetMaterial : Material;
    tailMaterial : Material;
    earMaterial : Material;
    eyeMaterial : Material;
    debugSphere : Mesh;

    // movement
    velocity : Vector3 = new Vector3();
    radius : number = 1;
    maxSpeed : number = 40;
    drag : number = 0.5;

    // animation
    randomlyLookHeadMinMax : Vector2 = new Vector2(0.3, 1.5);
    changeHeadLookTimer : number = 0;
    wantedFaceAngle : number = 0;
    currentFaceAngle : number = 0;
    maxFaceRotation : number = Math.PI*0.25;
    bodyLength : number;
    buttRadius : number;
    headWobbleTime : number = 0;
    headWobbleFrequency : number = 4;
    headWobbleAmount : number = 0.2;
    headWobbleMinHeight : number = 0.2;
    stepHeight : number = 0.45;
    frontLegStepReachSquared : number = 0.7*0.7;
    backLegStepReachSquared : number = 0.5*0.5;

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

    
    feet: Feet[] = [];
    feetTime : number = 0;
    feetMinSteppingSpeed : number = 10;
    feetMaxSteppingSpeed : number = 40;

    rightFootId = 0;
    leftFootId = 1;
    backRightFootId = 2;
    backLeftFootId = 3;

    private var = { // just random vectors and quaternions for use during update operations
        q1: new Quaternion(),
        q2: new Quaternion(),
        v1: new Vector3(),
        v2: new Vector3(),
        v3: new Vector3(),
        v4: new Vector3(),
    }

    private smoothing = {
        wantedPosition: new Vector3(),
        lastInfoTime: 0,
        lerpTime: 0.3, // const
        lerping: false,
    }

    private frameDisplacementDirection : Vector3 = new Vector3();

    constructor(scene : Scene, loader : TextureLoader)
    {
        const toonRamp = loader.load(toonTexture, (texture) => {
            texture.minFilter = NearestFilter;
            texture.magFilter = NearestFilter;
        });
        this.debugSphere = new Mesh(new SphereGeometry( this.radius, 12, 12 ), new MeshBasicMaterial( { color: 0x00ff00, wireframe: true, transparent: true, opacity: 0.3}) );
        this.debugSphere.position.y += this.radius;
        this.debugSphere.visible = false;

        
        this.material = new MeshToonMaterial( { color: 0xaaaaaa, gradientMap: toonRamp});
        this.noseMaterial = new MeshBasicMaterial( { color: 0xcc8888});
        this.earMaterial = new MeshBasicMaterial( { color: 0xcc8888});
        this.feetMaterial = new MeshToonMaterial( { color: 0xffaaaa, gradientMap: toonRamp});
        this.eyeMaterial = new MeshBasicMaterial( { color: 0x000000});
        this.tailMaterial = new MeshToonMaterial( { color: 0xffaaaa, gradientMap: toonRamp});

        const buttRadius = this.buttRadius = 0.89;
        const headRadius = 0.6;
        this.bodyLength = buttRadius + headRadius-0.1;
        const snoutRadius = 0.47;
        
        const snoutLength = 0.5;
        const snoutTilt = 0;// Math.PI*0.2;
        const snoutPlacement = new Vector3(0, 0, -0.02);
        const noseRadius = 0.05;
        const eyeRadius = 0.075;
        const earRadius = 0.25;
        this.headPivot = new Object3D();
        this.butt = new Mesh(new SphereGeometry( buttRadius, 12, 12 ), this.material );
        scene.add(this.butt);
        this.bodyConnector = new Mesh(new CylinderGeometry(buttRadius, headRadius, 1, 12, 1, true), this.material);
        this.bodyConnector.quaternion.setFromAxisAngle(new Vector3(1,0,0), Math.PI*0.5);
        this.bodyConnector.position.z = -this.bodyLength*0.5;
        this.bodyConnector.scale.set(1,this.bodyLength,1);
        this.butt.add(this.bodyConnector);
        let radiusDifference = buttRadius - headRadius;
        this.naturalBodyTilt = -Math.asin(radiusDifference/this.bodyLength);
        //this.butt.quaternion.setFromAxisAngle(new Vector3(1,0,0), this.naturalBodyTilt);

        this.head = new Mesh(new SphereGeometry( headRadius, 12, 12 ), this.material );
        //this.head.position.z = -bodyLength;
        //this.butt.add(this.head);
        
        this.head.position.y = headRadius;
        this.headPivot.add(this.head);

        this.face = new Object3D();
        this.head.add(this.face)
        this.snout = new Mesh(new ConeGeometry(snoutRadius, snoutLength, 12, 12, true), this.material);
        this.snout.quaternion.setFromAxisAngle(new Vector3(1,0,0), -snoutTilt - Math.PI * 0.5);
        this.snout.position.z = -headRadius;
        this.snout.position.add(snoutPlacement);
        this.face.add(this.snout);
        this.nose = new Mesh(new SphereGeometry( noseRadius, 8, 8 ), this.noseMaterial );
        this.nose.position.y = snoutLength * 0.5;
        this.eyeLeft = new Mesh(new SphereGeometry( eyeRadius, 8, 8 ), this.eyeMaterial );
        this.eyeLeft.position.z = snoutLength * 0.4;
        this.eyeLeft.position.y = snoutLength * 0.1 * -1;
        this.eyeLeft.position.x = snoutLength * 0.5;
        this.eyeRight = this.eyeLeft.clone()
        this.eyeRight.position.x *= -1
        const earSegments = 7;
        this.earLeft = new Mesh(new CircleGeometry( earRadius, earSegments), this.earMaterial );
        this.earLeft.position.x += 0.49
        this.earLeft.position.z += .45
        this.earLeft.position.y -= .35
        this.earLeft.rotateX(-Math.PI*0.5)

        const backEarDepth = earRadius * 0.7;
        // Some trigonometry to get automatic placement of back-ear depending on backEarDepth
        const backEarAlpha = Math.atan(earRadius/backEarDepth);
        const backEarRadius = Math.sqrt(earRadius*earRadius + backEarDepth*backEarDepth) / (2*Math.cos(backEarAlpha));
        let backEarLeft = new Mesh(new SphereGeometry(backEarRadius, earSegments, 2, undefined, undefined, undefined, Math.PI - backEarAlpha*2), this.material);
        backEarLeft.rotateX(-Math.PI*0.5)
        backEarLeft.rotateY(-Math.PI)
        backEarLeft.position.z = backEarRadius - backEarDepth;
        this.earLeft.add(backEarLeft);
        
        this.earRight = this.earLeft.clone()
        this.earLeft.position.x *= -1;
        this.snout.add(this.nose, this.eyeLeft, this.eyeRight, this.earLeft, this.earRight);
        // whiskers
        let whiskerLineDivisions = 8;
        let whiskerPoints : Vector3[] = [];
        let whiskerIndexes : number[] = [];
        let whiskersGeometry = new BufferGeometry();
        
        let addWhiskerCurve = function(curve : CubicBezierCurve3)
        {
            let whiskerStart = whiskerPoints.length;
            whiskerPoints = whiskerPoints.concat(curve.getPoints(whiskerLineDivisions));
            for (let i = 0; i < whiskerLineDivisions; ++i) {
                whiskerIndexes.push(whiskerStart + i, whiskerStart + i + 1);
            }
        }
        let addTwoSymetricWhiskers = function(curve : CubicBezierCurve3) {
            addWhiskerCurve(curve);
            curve.v0.x = -curve.v0.x;
            curve.v1.x = -curve.v1.x;
            curve.v2.x = -curve.v2.x;
            curve.v3.x = -curve.v3.x;
            addWhiskerCurve(curve);
        }
        addTwoSymetricWhiskers(new CubicBezierCurve3(new Vector3(-0.7, 0.15, 0.2), new Vector3(-0.3,0.15,0), new Vector3(-0.2,0.1,0), new Vector3(0,0.1,0)));
        addTwoSymetricWhiskers(new CubicBezierCurve3(new Vector3(-0.66, 0.17, -0.2), new Vector3(-0.3,0.17,0), new Vector3(-0.2,0.12,0), new Vector3(0,0.12,0.07)));
        addTwoSymetricWhiskers(new CubicBezierCurve3(new Vector3(-0.8, 0.0, -0.1), new Vector3(-0.6,0.05,-0.09), new Vector3(-0.2,0.09,-0.09), new Vector3(0,0.09,0.05)));

        whiskersGeometry.setFromPoints(whiskerPoints);
        whiskersGeometry.setIndex(whiskerIndexes);        
        let whiskers = new LineSegments(whiskersGeometry, new LineBasicMaterial({transparent: true, opacity: 0.3}));
        this.snout.add(whiskers);


        this.object = new Object3D();
        this.object.add(this.debugSphere);
        this.object.add(this.headPivot);
        this.object.position.x += Math.random()* 5 - 2.5;
        this.object.position.z += Math.random()* 5 - 2.5;
        this.butt.position.copy(this.object.position);
        this.butt.position.z += this.bodyLength;
        this.butt.position.y = this.radius;
        scene.add( this.object );
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
        this.rightFootId = this.createFeet(foot, this.object, new Vector3(headRadius, footYPos, 0.2));
        this.leftFootId = this.createFeet(foot.clone(), this.object, new Vector3(-headRadius, footYPos, 0.2));
        this.backRightFootId = this.createFeet(foot.clone(), this.butt, new Vector3(buttRadius - 0.1, footYPos, 0));
        this.backLeftFootId = this.createFeet(foot.clone(), this.butt, new Vector3(-buttRadius + 0.1, footYPos, 0));

        // Tail
        let tailMaxThickness = 0.15;
        let tailLength = 4;
        let tailSegments = 5;
        let tailGeometry = new ConeGeometry(tailMaxThickness, tailLength, 7, tailSegments, true);
        const position = tailGeometry.attributes.position;
        const vertex = new Vector3();
        const skinIndices = [];
        const skinWeights = [];
        let tailSegmentHeight = tailLength / tailSegments;
        for ( let i = 0; i < position.count; i ++ ) {

            vertex.fromBufferAttribute( position, i );
        
            // compute skinIndex and skinWeight based on some configuration data
            const y = ( vertex.y + tailLength * 0.5 );
            const skinIndex = Math.floor( y / tailSegmentHeight );
            //const skinWeight = ( y % tailSegmentHeight ) / tailSegmentHeight;
            skinIndices.push( skinIndex, 0, 0, 0 );
            skinWeights.push( 1, 0, 0, 0 );
        }
        tailGeometry.setAttribute( 'skinIndex', new Uint16BufferAttribute( skinIndices, 4 ));
        tailGeometry.setAttribute( 'skinWeight', new Float32BufferAttribute( skinWeights, 4 ));
        const tailMesh = new SkinnedMesh(tailGeometry, this.tailMaterial);
        //tailMesh.bindMode = DetachedBindMode;
        const tailBones = [];
        for (let i = 0; i <= tailSegments; ++i) {
            const bone = new Bone();
            tailBones.push(bone);
            if (i == 0) {
                bone.position.y = -tailLength * 0.5;
                bone.quaternion.setFromAxisAngle(Constants.right, Math.PI * 0.5);
            }
            else {
                tailBones[i-1].add(bone);
                bone.position.z = -tailSegmentHeight;
            }
        }

        const tailSkeleton = new Skeleton(tailBones);

        tailMesh.add(tailBones[0]);
        tailMesh.bind(tailSkeleton);
        tailBones[0].position.y = 0;
        tailBones[0].position.z -= buttRadius - 0.2;
        //tailMesh.position.z += tailLength * 0.5 + buttRadius - 0.2;
        tailMesh.quaternion.setFromAxisAngle(Constants.up, Math.PI);
        this.butt.add(tailMesh);
        //this.butt.add(tailBones[0]);
        this.tailBones = tailBones;

        // const boneHelper = new SkeletonHelper(tailMesh);
        // this.scene.add(boneHelper);
    }

    
    private createFeet(obj : Object3D, attachment : Object3D, neutralPosition : Vector3) : number 
    {
        let f : Feet = {
            obj : obj,
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

    update(time : Time, worldBoundaries : Box2, input? : InputManager, camera? : Object3D)
    {
        let positionBefore = this.previousFramePosition.copy(this.object.position);

        if (input && camera) { // Local players
            if (input.fingerDown) {
                let cameraQuaterinion = camera.getWorldQuaternion(this.var.q1);
                this.velocity.set(0, 0, 0);
                let relativeRight = this.var.v2.set(1,0,0);
                relativeRight.applyQuaternion(cameraQuaterinion)
                relativeRight.y = 0
                relativeRight.normalize()
                let trackballRight = relativeRight;
                trackballRight.multiplyScalar(input.trackball.velocity.x)
                this.velocity.add(trackballRight)

                let relativeForward = this.var.v2.set(0,0,-1);
                relativeForward.applyQuaternion(cameraQuaterinion)
                relativeForward.y = 0
                relativeForward.normalize()
                let trackballForward = relativeForward
                trackballForward.multiplyScalar(-input.trackball.velocity.y)
                this.velocity.add(trackballForward)

                this.velocity.clampLength(0, this.maxSpeed)

                // animation
                this.face.quaternion.setFromAxisAngle(Constants.up, 0);
                this.wantedFaceAngle = 0;
            }
            else {
                this.velocity.lerp(Constants.zero, time.deltaTime * this.drag); // TODO make drag dependant on current velocity magnitude, maybe increase drag at slow speeds
            }

            
            if (input.debugButton.pressedThisFrame) {
                this.debugSphere.visible = !this.debugSphere.visible;
            }
        }

        if (!input && this.smoothing.lerping) { // Other players and interpolating
            let lerpTime = time.time - this.smoothing.lastInfoTime;
            let lerpFactor = Math.min(1, Math.max(0, lerpTime/this.smoothing.lerpTime));

            this.smoothing.wantedPosition.x += this.velocity.x * time.deltaTime;
            this.smoothing.wantedPosition.z += this.velocity.z * time.deltaTime;

            this.object.position.lerp(this.smoothing.wantedPosition, lerpFactor);
            
            if (lerpFactor >= 1)
                this.smoothing.lerping = false;
        }
        else {
            this.object.position.x += this.velocity.x * time.deltaTime;
            this.object.position.z += this.velocity.z * time.deltaTime;
        }

        // Move and collide against AABB world boundaries 
        if (this.object.position.x + this.radius > worldBoundaries.max.x)
        {
            this.object.position.x = worldBoundaries.max.x - this.radius;
        }
        else if (this.object.position.x - this.radius < worldBoundaries.min.x) {
            this.object.position.x = worldBoundaries.min.x + this.radius;
        }
        if (this.object.position.z + this.radius > worldBoundaries.max.y)
        {
            this.object.position.z = worldBoundaries.max.y - this.radius;
        }
        else if (this.object.position.z - this.radius < worldBoundaries.min.y) {
            this.object.position.z = worldBoundaries.min.y + this.radius;
        }

        // Visually update, animations
        this.headWobbleTime += time.deltaTime;
        this.headPivot.position.y = (Math.sin(this.headWobbleTime * this.headWobbleFrequency)* 0.5 + 0.5) * this.headWobbleAmount + this.headWobbleMinHeight;
        
        let frameDisplacement = positionBefore.sub(this.object.position);
        frameDisplacement.multiplyScalar(-1);
        let isMoving = frameDisplacement.lengthSq() > 0.0001;
        if (isMoving) {
            let aux = this.var.v1.copy(frameDisplacement);
            aux.normalize();
            this.frameDisplacementDirection.lerp(frameDisplacement, time.deltaTime * 20);
            this.wantedFaceAngle = Utils.SignedAngle2D(Constants.forward, this.frameDisplacementDirection, this.var.v2);
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
        this.butt.quaternion.setFromUnitVectors(Constants.forward, deltaHead);
        // deal with squishing
        deltaHead.copy(headPos);
        deltaHead.sub(this.butt.position);
        let bodyLength = deltaHead.length();
        this.bodyConnector.scale.set(1,bodyLength,1);
        let bodyAngle = Utils.SignedAngle2D(Constants.forward, deltaHead, this.var.v1);

        this.butt.updateMatrixWorld(true);
        this.animateTail(time);

        this.animateFeet(time, deltaHead.normalize(), isMoving, frameDisplacement, buttFrameDisplacement);

        if (!isMoving) {
            this.changeHeadLookTimer -= time.deltaTime;
            if (this.changeHeadLookTimer <= 0) {
                this.changeHeadLookTimer = MathUtils.lerp(this.randomlyLookHeadMinMax.x, this.randomlyLookHeadMinMax.y, Math.random());
                this.wantedFaceAngle = bodyAngle + this.maxFaceRotation*(Math.random()-0.5)*2;
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

        if (Math.abs(signedDistance) > Number.EPSILON)
        {
            const maxHeadRotationSpeed = time.deltaTime * Math.PI * 1;

            if (Math.abs(signedDistance) < maxHeadRotationSpeed) {
                this.currentFaceAngle = this.wantedFaceAngle;
            }
            else {
                this.currentFaceAngle += Math.sign(signedDistance) * maxHeadRotationSpeed;
                this.currentFaceAngle = MathUtils.lerp(this.currentFaceAngle, this.wantedFaceAngle, time.deltaTime * 5);
            }

            this.currentFaceAngle = Utils.ClampAngleDistance(bodyAngle, this.currentFaceAngle, this.maxFaceRotation)
            this.face.quaternion.setFromAxisAngle(Constants.up, this.currentFaceAngle);
        }


        if (this.debugSphere.visible) {
            // debug sphere
            let zMovementRotation = this.var.q1.setFromAxisAngle(Constants.right, frameDisplacement.z / this.radius);
            let xMovementRotation = this.var.q2.setFromAxisAngle(Constants.forward, frameDisplacement.x / this.radius );
            zMovementRotation.multiply(xMovementRotation);
            this.debugSphere.quaternion.premultiply(zMovementRotation);
        }
    }

    private tailRootLastPos = new Vector3();
    private animateTail(time : Time)
    {
        const root = this.tailBones[0];
        // let tailRootWorldPos = root.getWorldPosition(new Vector3());
        // let tailRootFrameDisplacement = new Vector3().copy(tailRootWorldPos).sub(this.tailRootLastPos);
        // this.tailRootLastPos.copy(tailRootWorldPos);

        // let rootWorldQuaternion = root.getWorldQuaternion(new Quaternion());

        // let prevDisplacement = new Vector3().copy(rootDisplacement).applyQuaternion(this.tailBones[0].getWorldQuaternion());
        // let deltaDirection = new Vector3();

        for (let i = 0; i < this.tailBones.length - 1; ++i)
        {
            this.tailBones[i].quaternion.setFromAxisAngle(Constants.up, Math.sin(time.time * (i + 1)) * Math.PI * 0.2);
        }
    }

    private feetBodyRight = new Vector3();
    private feetDeltaPos = new Vector3();
    private animateFeet(time : Time, bodyForward : Vector3, moving : boolean, headDisplacement : Vector3, buttDisplacement : Vector3)
    {
        let bodyRight = this.feetBodyRight.copy(bodyForward).applyAxisAngle(Constants.up, Math.PI * 0.5);
        let maxSpeedFactor = Math.max(1, this.velocity.length()/this.feetMaxSteppingSpeed * 2);
        headDisplacement.multiplyScalar(maxSpeedFactor)
        buttDisplacement.multiplyScalar(maxSpeedFactor)

        let feetIsStill = true;
        let feetWantToMove = false;

        let deltaPos = this.feetDeltaPos;
        let wannaMoveCount = 0;
        for (let i = 0; i < this.feet.length; ++i)
        {
            let f = this.feet[i];
            feetIsStill &&= f.onGround;
            this.getFootNeutralPosition(i, f.stepEndPosition, bodyForward, bodyRight);            

            deltaPos.copy(f.stepEndPosition).sub(f.obj.position);
            let moveFeetIfSqLengthAbove = (i == this.rightFootId || i == this.leftFootId)? this.frontLegStepReachSquared : this.backLegStepReachSquared;
            if (deltaPos.lengthSq() > moveFeetIfSqLengthAbove) {
                feetWantToMove = true;
                f.wantsToMove = true;
                wannaMoveCount++;
            }
            else f.wantsToMove = false;

            if (f.wantsToMove || !f.onGround) {
                if (i == this.rightFootId || i == this.leftFootId)
                    f.stepEndPosition.add(headDisplacement);
                else
                    f.stepEndPosition.add(buttDisplacement);
            }
        }

        if (feetIsStill && feetWantToMove) {
            this.feetTime = 0;

            if (wannaMoveCount < 4 && (this.feet[this.leftFootId].wantsToMove && !this.feet[this.rightFootId].wantsToMove) ||
                (this.feet[this.backRightFootId].wantsToMove && !this.feet[this.backLeftFootId].wantsToMove)) {
                this.feetTime = Math.PI; // have tendency to start with the feet that wants to start
                // this is because I'm moving each pair of feet (diagonal pairs) at a time
            }
        }

        let feetSpeed = !moving && wannaMoveCount < 2? this.feetMinSteppingSpeed : this.feetMaxSteppingSpeed * maxSpeedFactor; // TODO maybe make it be gradual change of feet speed
        this.feetTime += time.deltaTime * feetSpeed;
        let sinTime = Math.sin(this.feetTime);
        let rightStepFactor = Math.max(0, sinTime);
        let leftStepFactor = Math.max(0, -sinTime);
        let lerpFactor = (this.feetTime - Math.floor(this.feetTime/Math.PI)*Math.PI)/Math.PI;
        // if (rightStepFactor > 0)
        //     console.log(`Right ${lerpFactor}\t ${rightStepFactor}`);
        // else 
        //     console.log(`Left ${lerpFactor}\t ${leftStepFactor}`);

        bodyForward.y = 0;
        let rot = this.var.q1.setFromUnitVectors(Constants.forward, bodyForward);

        for (let i = 0; i < this.feet.length; ++i)
        {
            let f = this.feet[i];
            if (f.wantsToMove && f.onGround) {
                if (((i == this.rightFootId || i == this.backLeftFootId) && rightStepFactor > 0)
                    || ((i == this.leftFootId || i == this.backRightFootId) && leftStepFactor > 0))
                {
                    f.wantsToMove = false;
                    f.onGround = false;
                    f.stepStartPositon.copy(f.obj.position);
                }
            }
            else if (!f.onGround) {
                if (((i == this.rightFootId || i == this.backLeftFootId) && rightStepFactor == 0)
                    || ((i == this.leftFootId || i == this.backRightFootId) && leftStepFactor == 0))
                {
                    f.onGround = true;
                    f.obj.position.copy(f.stepEndPosition);
                }
            }
            // TODO actually do something with rotation
            if (!f.onGround) {
                let stepFactor = (i == this.rightFootId || i == this.backLeftFootId)? rightStepFactor : leftStepFactor;
                let maxStepHeight = (f.stepEndPosition.y + f.stepStartPositon.y)/2 + this.stepHeight;
                let instantStepHeight = lerpFactor < 0.5? MathUtils.lerp(f.stepStartPositon.y, maxStepHeight, stepFactor) : MathUtils.lerp(f.stepEndPosition.y, maxStepHeight, stepFactor);
                f.obj.position.lerpVectors(f.stepStartPositon, f.stepEndPosition, lerpFactor);
                f.obj.position.y = instantStepHeight;
            }
            this.feet[i].obj.quaternion.copy(rot);
        }
    }

    private forwardClone = new Vector3();
    private rightClone = new Vector3();
    private getFootNeutralPosition(feetId : number, outVector : Vector3, forward : Vector3, right : Vector3)
    {
        outVector.copy(this.feet[feetId].attachment.position);
        const relPos = this.feet[feetId].neutralPosition;
        outVector.add(this.forwardClone.copy(forward).multiplyScalar(relPos.z));
        outVector.add(this.rightClone.copy(right).multiplyScalar(relPos.x));
        // TODO Y position might vary
        outVector.y = this.feet[feetId].neutralPosition.y;
    }

    serializePlayerData() : SerializedPlayerData {
        return {
            position : this.object.position,
            velocity: this.velocity
        }
    }

    onRemotePlayerData(data : SerializedPlayerData, timeSinceItWasSent : number, time : Time)
    {
        this.smoothing.wantedPosition.copy(data.position);
        this.smoothing.lastInfoTime = time.time;
        this.smoothing.lerping = true;
        this.velocity.copy(data.velocity);
        //console.log(`timeSinceItWasSent (seconds): ${timeSinceItWasSent}`);
    }

    dispose() {
        this.debugSphere.geometry.dispose();
        this.scene.remove(this.object);
        this.scene.remove(this.butt);
        this.feet.forEach((f) => {
            if (f) {
                this.scene.remove(f.obj);
            }
        })
        // TODO dispose of all the geometries of the object (or even better: reuse the geometries between different players)
    }
}
