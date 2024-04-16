import { Scene, MeshBasicMaterial, Mesh, SphereGeometry, CircleGeometry, Object3D, Vector2, Box2, MeshNormalMaterial, Material, MeshLambertMaterial, TextureLoader, Quaternion, Vector3, Euler, Camera, CylinderGeometry, ConeGeometry, BackSide, DoubleSide, MathUtils } from "three";
import { Scene, MeshBasicMaterial, Mesh, SphereGeometry, Object3D, Vector2, Box2, MeshNormalMaterial, Material, MeshLambertMaterial, TextureLoader, Quaternion, Vector3, Euler, MeshToonMaterial, NearestFilter } from "three";
import { Time } from "./Time";
import mouseTexture from "../assets/mouse_texture.png";
import toonTexture from "../assets/threeTone_bright.jpg";
import { InputManager } from "./InputManager";

export type SerializedPlayerData = {
    position: Vector3,
    velocity: Vector3
}

export class GreenCube {
    material : Material;
    noseMaterial : Material;
    earMaterial : Material;
    eyeMaterial : Material;
    debugSphere : Mesh;
    public object : Object3D;
    velocity : Vector3;
    radius : number = 1;
    scene: Scene;
    maxSpeed : number = 40;

    // animation
    randomlyLookHeadMinMax : Vector2 = new Vector2(0.3, 1.5);
    changeHeadLookTimer : number = 0;
    wantedFaceAngle : number = 0;
    currentFaceAngle : number = 0;
    movingFace : boolean = false;

    // composite body
    model: Object3D;
    butt: Mesh;
    head: Mesh;
    body: Mesh;
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
    }

    var = {
        rot1: new Quaternion(),
        rot2: new Quaternion(),
        v1: new Vector3(),
        v2: new Vector3(),
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

        const buttRadius = 0.89;
        const chestRadius = 0.6;
        const bodyLength = buttRadius + chestRadius-0.1;
        const snoutRadius = 0.47;
        
        const snoutLength = 0.5;
        const snoutTilt = 0;// Math.PI*0.2;
        const snoutPlacement = new Vector3(0, 0, -0.02);
        const noseRadius = 0.05;
        const eyeRadius = 0.075;
        const earRadius = 0.25;
        this.model = new Object3D();
        this.model.position.y = this.radius;
        this.butt = new Mesh(new SphereGeometry( buttRadius, 12, 12 ), this.material );
        this.butt.position.z = buttRadius;
        this.model.add(this.butt);
        this.body = new Mesh(new CylinderGeometry(buttRadius, chestRadius, bodyLength, 12, 1, true), this.material);
        this.body.quaternion.setFromAxisAngle(new Vector3(1,0,0), Math.PI*0.5);
        this.body.position.z = -bodyLength*0.5;
        this.butt.add(this.body);
        let radiusDifference = buttRadius - chestRadius;
        this.naturalBodyTilt = -Math.asin(radiusDifference/bodyLength);
        this.butt.quaternion.setFromAxisAngle(new Vector3(1,0,0), this.naturalBodyTilt);

        this.head = new Mesh(new SphereGeometry( chestRadius, 12, 12 ), this.material );
        this.head.position.z = -bodyLength;
        this.butt.add(this.head);

        this.face = new Object3D();
        this.head.add(this.face)
        this.snout = new Mesh(new ConeGeometry(snoutRadius, snoutLength, 12, 12, true), this.material);
        this.snout.quaternion.setFromAxisAngle(new Vector3(1,0,0), -snoutTilt - Math.PI * 0.5);
        this.snout.position.z = -chestRadius;
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
        this.object.add(this.model);
        this.object.position.x += Math.random()* 5 - 2.5;
        this.object.position.z += Math.random()* 5 - 2.5;
        scene.add( this.object );
        this.scene = scene;

        this.velocity = new Vector3();
    }

    update(time : Time, worldBoundaries : Box2, input? : InputManager, camera? : Object3D)
    {
        let positionBefore = this.var.v1.copy(this.object.position);

        if (input && camera) { // Local players
            const relativeRight = new Vector3(1, 0, 0)
            relativeRight.applyQuaternion(camera.quaternion)
            relativeRight.y = 0
            relativeRight.normalize()
            const trackballRight = relativeRight.clone()
            trackballRight.multiplyScalar(input.trackball.velocity.x)

            const relativeForward = new Vector3(0, 0, 1)
            relativeForward.applyQuaternion(camera.quaternion)
            relativeForward.y = 0
            relativeForward.normalize()
            const trackballForward = relativeForward.clone()
            trackballForward.multiplyScalar(input.trackball.velocity.y)
            
            this.velocity.set(0, 0, 0);
            this.velocity.add(trackballRight)
            this.velocity.add(trackballForward)

            relativeRight.multiplyScalar(this.maxSpeed)
            relativeForward.multiplyScalar(this.maxSpeed)


            if (input.left.pressed)
                this.velocity.sub(relativeRight)
            if (input.right.pressed)
                this.velocity.add(relativeRight)
            
            // this.velocity.y = 0;
            // this.velocity.y = inputVelocity.y
            if (input.down.pressed)
                this.velocity.add(relativeForward)
            if (input.up.pressed)
                this.velocity.sub(relativeForward)

           this.velocity.clampLength(0, this.maxSpeed)
            
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
        let frameDisplacement = positionBefore.sub(this.object.position);
        this.model.getWorldPosition(this.var.v2);
        if (frameDisplacement.lengthSq() > 0.00001)
            this.model.lookAt(frameDisplacement.add(this.var.v2));

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
    }
}
