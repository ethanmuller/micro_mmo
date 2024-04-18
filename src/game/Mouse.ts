import { Scene, MeshBasicMaterial, Mesh, SphereGeometry, CircleGeometry, Object3D, Vector2, Box2, MeshToonMaterial, Material, TextureLoader, Quaternion, Vector3, CylinderGeometry, ConeGeometry, DoubleSide, MathUtils, NearestFilter} from "three";
import { Time } from "./Time";
import toonTexture from "../assets/threeTone_bright.jpg";
import { InputManager } from "./InputManager";

export type SerializedPlayerData = {
    position: Vector3,
    velocity: Vector3
}

export class Mouse {
    material : Material;
    noseMaterial : Material;
    earMaterial : Material;
    eyeMaterial : Material;
    debugSphere : Mesh;
    public object : Object3D;
    scene: Scene;

    // movement
    velocity : Vector3;
    radius : number = 1;
    maxSpeed : number = 40;
    drag : number = 0.5;

    // animation
    randomlyLookHeadMinMax : Vector2 = new Vector2(0.3, 1.5);
    changeHeadLookTimer : number = 0;
    wantedFaceAngle : number = 0;
    currentFaceAngle : number = 0;
    movingFace : boolean = false;
    bodyLength : number;
    buttRadius : number;
    headWobbleTime : number = 0;
    headWobbleFrequency : number = 4;
    headWobbleAmount : number = 0.2;
    headWobbleMinHeight : number = 0.2;

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

    const = {
        right: new Vector3(1,0,0),
        forward: new Vector3(0,0,-1),
        up: new Vector3(0,1,0),
        zero: new Vector3(0,0,0),
    }

    var = {
        rot1: new Quaternion(),
        rot2: new Quaternion(),
        v1: new Vector3(),
        v2: new Vector3(),
        v3: new Vector3(),
    }

    smoothing = {
        wantedPosition: new Vector3(),
        lastInfoTime: 0,
        lerpTime: 0.3, // const
        lerping: false,
    }

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
        this.earMaterial = new MeshBasicMaterial( { color: 0xcc8888, side: DoubleSide});
        this.eyeMaterial = new MeshBasicMaterial( { color: 0x000000});

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
        this.snout.add(this.nose, this.eyeLeft, this.eyeRight, this.earLeft, this.earRight)



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

        this.velocity = new Vector3();
    }

    update(time : Time, worldBoundaries : Box2, input? : InputManager, camera? : Object3D)
    {
        let positionBefore = this.var.v1.copy(this.object.position);

        if (input && camera) { // Local players
            if (input.fingerDown) {
                let cameraQuaterinion = camera.getWorldQuaternion(this.var.rot1);
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
                this.face.quaternion.setFromAxisAngle(this.const.up, 0);
                this.wantedFaceAngle = 0;
                this.movingFace = true;
            }
            else {
                this.velocity.lerp(this.const.zero, time.deltaTime * this.drag); // TODO make drag dependant on current velocity magnitude, maybe increase drag at slow speeds
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
        if (frameDisplacement.lengthSq() > 0.0000001) {
            let frameDisplacementDirection = frameDisplacement;
            frameDisplacementDirection.normalize();
            frameDisplacementDirection.multiplyScalar(-1);
            this.headPivot.quaternion.setFromUnitVectors(this.const.forward, frameDisplacementDirection);
        }
        let headPos = this.var.v1;
        this.head.getWorldPosition(headPos);

        let deltaHead = this.var.v2.copy(headPos);
        deltaHead.sub(this.butt.position);
        
        deltaHead.normalize();
        let buttDisplacement = this.var.v3.copy(deltaHead).multiplyScalar(this.bodyLength);
        this.butt.position.copy(headPos).sub(buttDisplacement);
        this.butt.position.y = this.buttRadius;
        this.butt.quaternion.setFromUnitVectors(this.const.forward, deltaHead);
        // deal with squishing
        deltaHead.copy(headPos);
        deltaHead.sub(this.butt.position);
        let bodyLength = deltaHead.length();
        this.bodyConnector.scale.set(1,bodyLength,1);

        this.changeHeadLookTimer -= time.deltaTime;
        if (this.changeHeadLookTimer <= 0) {
            let maxRotation = Math.PI*0.25;

            this.changeHeadLookTimer = MathUtils.lerp(this.randomlyLookHeadMinMax.x, this.randomlyLookHeadMinMax.y, Math.random());
            this.wantedFaceAngle = maxRotation*(Math.random()-0.5)*2;
            this.movingFace = true;
        }

        if (this.movingFace) {
            const maxHeadRotationSpeed = time.deltaTime * Math.PI * 1;
            let signedDistance = this.wantedFaceAngle - this.currentFaceAngle;
            if (Math.abs(signedDistance) < maxHeadRotationSpeed) {
                this.currentFaceAngle = this.wantedFaceAngle;
                this.movingFace = false;
            }
            else {
                this.currentFaceAngle += Math.sign(signedDistance) * maxHeadRotationSpeed;
            }
            this.currentFaceAngle = MathUtils.lerp(this.currentFaceAngle, this.wantedFaceAngle, time.deltaTime * 5);
            this.face.quaternion.setFromAxisAngle(this.const.up, this.currentFaceAngle);
        }


        if (this.debugSphere.visible) {
            // debug sphere
            let zMovementRotation = this.var.rot1.setFromAxisAngle(this.const.right, frameDisplacement.z / this.radius);
            let xMovementRotation = this.var.rot2.setFromAxisAngle(this.const.forward, frameDisplacement.x / this.radius );
            zMovementRotation.multiply(xMovementRotation);
            this.debugSphere.quaternion.premultiply(zMovementRotation);
        }
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
        // TODO dispose of all the geometries of the object (or even better: reuse the geometries between different players)
    }
}
