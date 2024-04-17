import { Vector2, Vector3 } from 'three';

import Hammer from 'hammerjs'
import { Time } from './Time';


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
    forward : ButtonInput;
    backward : ButtonInput;
    trackball : TrackballInput;
    fingerDown: Boolean;
    fingerMovement: Vector2 = new Vector2();
    shift : ButtonInput;
    ctrl : ButtonInput;


    
    debugButton : ButtonInput;
    flyCameraButton : ButtonInput;

    constructor(trackballElement : HTMLElement) {
        reference = this;

        window.addEventListener('keydown', this.onkeydown);
        window.addEventListener('keyup', this.onkeyup);

        this.buttons.push(this.up = new ButtonInput(["ArrowUp", "KeyW"]));
        this.buttons.push(this.down = new ButtonInput(["ArrowDown", "KeyS"]));
        this.buttons.push(this.left = new ButtonInput(["ArrowLeft", "KeyA"]));
        this.buttons.push(this.right = new ButtonInput(["ArrowRight", "KeyD"]));
        this.buttons.push(this.forward = new ButtonInput(["KeyQ"]));
        this.buttons.push(this.backward = new ButtonInput(["KeyE"]));
        this.buttons.push(this.debugButton = new ButtonInput(["Backquote", "Digit1"]));
        this.buttons.push(this.flyCameraButton = new ButtonInput(["KeyF"]));
        this.buttons.push(this.shift = new ButtonInput(["ShiftLeft"]));
        this.buttons.push(this.ctrl = new ButtonInput(["ControlLeft"]));


        this.trackball = new TrackballInput()

        const mc = new Hammer.Manager(trackballElement)
        mc.add( new Hammer.Pan({ direction: Hammer.DIRECTION_ALL, threshold: 2 }) );
        mc.add( new Hammer.Press({ time: 0 }) );

        this.fingerDown = false
        const screenFactor = window.innerHeight*0.03;

        mc.on('pan', (e: HammerInput) => {
            this.trackball.velocity.set(e.velocityX, e.velocityY).multiplyScalar(screenFactor)
            this.fingerMovement.set(e.deltaX * screenFactor, e.deltaY * screenFactor)
            if (e.isFinal) {
                this.fingerDown = false
                this.fingerMovement.set(0,0);
            }
        })
        mc.on('press', (e: HammerInput) => {
            this.trackball.velocity.set(0,0);
            this.fingerDown = true
        })
        mc.on('pressup', (e: HammerInput) => {
            this.fingerDown = false
            this.fingerMovement.set(0,0);
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

    public update(time : Time) {
        this.buttons.forEach(button => {
            button.pressedThisFrame = false;
            button.releasedThisFrame = false;
        });
    }
}
