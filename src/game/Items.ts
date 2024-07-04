import * as THREE from 'three';

export class Orb extends THREE.Object3D {
  constructor() {
    super()

    const obj = new THREE.Object3D()
    const main = new THREE.Mesh(
      new THREE.SphereGeometry(0.666),
      new THREE.MeshStandardMaterial({
        color: 0x000000,
        emissive: 0x5500ff,
        emissiveIntensity: 0.5,
        metalness: 0.9,
        roughness: 0.1,
      }))
      obj.add(main)


      return obj
  }
}

export class Battery extends THREE.Object3D {
  constructor() {
    super()

    const metalMaterial = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      metalness: 0.9,
      roughness: 0.7,
      side: THREE.DoubleSide,
    })
    const obj = new THREE.Object3D()
    const main = new THREE.Mesh(
      new THREE.CylinderGeometry(0.333, 0.333, 1.5, 12, 1, false),
      new THREE.MeshStandardMaterial({
        color: 0x00aa44,
        emissive: 0x00aa44,
        emissiveIntensity: 0.3,
        metalness: 0.9,
        roughness: 0.1,
      }))
      obj.add(main)

    const top = new THREE.Mesh(
      new THREE.CircleGeometry(0.25, 32),
      metalMaterial
    )
      top.position.y = 1.5/2 + 0.01
      // top.rotateY(Math.PI/2)
       top.rotateX(-Math.PI/2)
      obj.add(top)

    const tip = new THREE.Mesh(
      new THREE.CylinderGeometry(0.125, 0.125, .05, 12, 1, false),
      metalMaterial
    )
      tip.position.y = 1.5/2 + 0.1
      // tip.rotateY(Math.PI/2)
       //tip.rotateX(-Math.PI/2)
      obj.add(tip)

    const bottom = new THREE.Mesh(
      new THREE.CircleGeometry(0.20, 32),
      metalMaterial
    )
      bottom.position.y = -1.5/2 - 0.01
      bottom.rotateX(-Math.PI/2)
      obj.add(bottom)

      return obj
  }
}
