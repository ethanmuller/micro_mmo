import { Vector2 } from 'three';

import Hammer from 'hammerjs'


class ButtonInput {
    pressed : boolean = false;
    pressedThisFrame : boolean = false;
    releasedThisFrame : boolean = false;
    keycodes : string[];

    constructor(keys : string[]) {
        this.keycodes = keys;
    }
}

class TrackballInput {
  velocity : Vector2;

  constructor() {
    this.velocity = new Vector2(0, 0)
  }
}

let reference : InputManager;

export class InputManager {

    private buttons : ButtonInput[] = [];

    up : ButtonInput;
    down : ButtonInput;
    left : ButtonInput;
    right : ButtonInput;
    trackball : TrackballInput;

    
    debugButton : ButtonInput;

    constructor(trackballElement : HTMLElement) {
        reference = this;

        window.addEventListener('keydown', this.onkeydown);
        window.addEventListener('keyup', this.onkeyup);

        this.buttons.push(this.up = new ButtonInput(["ArrowUp", "KeyW"]));
        this.buttons.push(this.down = new ButtonInput(["ArrowDown", "KeyS"]));
        this.buttons.push(this.left = new ButtonInput(["ArrowLeft", "KeyA"]));
        this.buttons.push(this.right = new ButtonInput(["ArrowRight", "KeyD"]));
        this.buttons.push(this.debugButton = new ButtonInput(["Backquote", "Digit1"]));

        this.trackball = new TrackballInput()

        const mc = new Hammer.Manager(trackballElement)
        mc.add( new Hammer.Pan({ direction: Hammer.DIRECTION_ALL, threshold: 2 }) );
        mc.add( new Hammer.Press({ time: 0 }) );

        mc.on('pan', (e: HammerInput) => {
            this.trackball.velocity = new Vector2(e.velocityX, e.velocityY).multiplyScalar(window.innerHeight*0.03)
        })
        mc.on('press', (e: HammerInput) => {
            this.trackball.velocity = new Vector2(0, 0)
        })
    }

    private onkeydown(event : Event)
    {
        let kbe = event as KeyboardEvent;
        if (!kbe) return;

        let code = kbe.code;
        for (let i = 0; i < reference.buttons.length; ++i) {
            let button = reference.buttons[i];
            if (button.keycodes.includes(code)) {
                if (!button.pressed) 
                    button.pressedThisFrame = true;
                button.pressed = true;
                button.releasedThisFrame = false;
                break;
            }
        };
    }

    private onkeyup(event : Event)
    {
        let kbe = event as KeyboardEvent;
        if (!kbe) return;

        let code = kbe.code;
        for (let i = 0; i < reference.buttons.length; ++i) {
            let button = reference.buttons[i];
            if (button.keycodes.includes(code)) {
                if (button.pressed)
                    button.releasedThisFrame = true;
                button.pressed = false;
                button.pressedThisFrame = false;
                break;
            }
        }
    }

    public update() {
        this.buttons.forEach(button => {
            button.pressedThisFrame = false;
            button.releasedThisFrame = false;
        });
    }
}
