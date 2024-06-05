import { Scene, Camera, Vector3 } from 'three'
import { CSS2DRenderer, CSS2DObject, } from 'three/addons/renderers/CSS2DRenderer.js';

export class ChatBubble {
    // chat bubble
    textDOMRenderer: CSS2DRenderer;
    textObject: CSS2DObject;

    constructor(scene: Scene, text: string | undefined) {
        this.textDOMRenderer = new CSS2DRenderer()
				this.textDOMRenderer.domElement.style.position = 'absolute';
				this.textDOMRenderer.domElement.style.top = '0px';
				this.textDOMRenderer.domElement.style.pointerEvents = 'none';
				this.textDOMRenderer.domElement.textContent = text || ''
				//document?.body.appendChild( this.textDOMRenderer.domElement );

        this.textObject = new CSS2DObject(this.textDOMRenderer.domElement)
        scene.add(this.textObject)
    }

    set(text: string) {
      this.textDOMRenderer.domElement.textContent = text
    }

    get(): string {
      return this.textDOMRenderer.domElement.textContent || ''
    }

    moveTo(target: Vector3) {
      this.textObject.position.copy(target)
    }

    render(scene: Scene, camera: Camera) {
      this.textDOMRenderer.render(scene, camera)
    }

    resize() {
      this.textDOMRenderer.setSize(window.innerWidth, window.innerHeight)
    }

    dispose() {
      this.textDOMRenderer.domElement.remove()
      this.textObject.remove()
    }

}
