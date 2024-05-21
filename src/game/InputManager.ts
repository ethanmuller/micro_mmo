import { Vector2 } from 'three';
import { useCrumbStore } from "../stores/crumb";
import Hammer from 'hammerjs'


class ButtonInput {
    pressed: boolean = false;
    pressedThisFrame: boolean = false;
    releasedThisFrame: boolean = false;
    keycodes: string[];

    constructor(keys: string[]) {
        this.keycodes = keys;
    }
}

class TrackballInput {
    velocity: Vector2;
    lastMove: number = 0;

    constructor() {
        this.velocity = new Vector2(0, 0)
    }
}

let reference: InputManager;

export class InputManager {

    private buttons: ButtonInput[] = [];

    W: ButtonInput;
    S: ButtonInput;
    A: ButtonInput;
    D: ButtonInput;
    Q: ButtonInput;
    E: ButtonInput;
    upArrow: ButtonInput;
    downArrow: ButtonInput;
    leftArrow: ButtonInput;
    rightArrow: ButtonInput;
    pageUp: ButtonInput;
    pageDown: ButtonInput;
    trackball: TrackballInput;
    fingerDown: Boolean;
    shift: ButtonInput;
    ctrl: ButtonInput;



    debugButton: ButtonInput;
    flyCameraButton: ButtonInput;

    constructor(trackballElement: HTMLElement) {
        reference = this;

        window.addEventListener('keydown', this.onkeydown);
        window.addEventListener('keyup', this.onkeyup);

        this.buttons.push(this.W = new ButtonInput(["KeyW"]));
        this.buttons.push(this.S = new ButtonInput(["KeyS"]));
        this.buttons.push(this.A = new ButtonInput(["KeyA"]));
        this.buttons.push(this.D = new ButtonInput(["KeyD"]));
        this.buttons.push(this.Q = new ButtonInput(["KeyQ"]));
        this.buttons.push(this.E = new ButtonInput(["KeyE"]));
        this.buttons.push(this.debugButton = new ButtonInput(["Backquote", "Digit1"]));
        this.buttons.push(this.flyCameraButton = new ButtonInput(["KeyF"]));
        this.buttons.push(this.shift = new ButtonInput(["ShiftLeft"]));
        this.buttons.push(this.ctrl = new ButtonInput(["ControlLeft"]));
        this.buttons.push(this.upArrow = new ButtonInput(["ArrowUp"]));
        this.buttons.push(this.downArrow = new ButtonInput(["ArrowDown"]));
        this.buttons.push(this.leftArrow = new ButtonInput(["ArrowLeft"]));
        this.buttons.push(this.rightArrow = new ButtonInput(["ArrowRight"]));
        this.buttons.push(this.pageUp = new ButtonInput(["PageUp"]));
        this.buttons.push(this.pageDown = new ButtonInput(["PageDown"]));


        this.trackball = new TrackballInput()

        const mc = new Hammer.Manager(trackballElement)
        mc.add(new Hammer.Pan({ direction: Hammer.DIRECTION_ALL, threshold: 5 }));
        mc.add(new Hammer.Press({ time: 0 }));

        this.fingerDown = false
        const screenFactor = window.innerHeight * 0.03;

        mc.on('pan', (e: HammerInput) => {
            const velocity = new Vector2(e.velocityX, e.velocityY).multiplyScalar(screenFactor)
            // velocity.clampLength(10, Infinity)
            this.trackball.velocity.copy(velocity)
            this.trackball.lastMove = e.timeStamp
            if (e.isFinal) {
                this.fingerDown = false
                const event = new Event("flick");
                event.velocity=velocity
                document.dispatchEvent(event)
            }
        })
        mc.on('press', () => {
            const event = new Event("press");
            event.oldVelocity = this.trackball.velocity.clone()
            document.dispatchEvent(event)
            this.trackball.velocity.set(0, 0);
            this.fingerDown = true
            const crumbs = useCrumbStore()
            crumbs.getCrumb()
        })
        mc.on('pressup', () => {
            this.fingerDown = false
        })
    }

    private onkeydown(event: Event) {
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

    private onkeyup(event: Event) {
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
        const now = Date.now()
        if (this.fingerDown && (now - this.trackball.lastMove) > 10) {
            this.trackball.velocity.x = 0
            this.trackball.velocity.y = 0
        }

        this.buttons.forEach(button => {
            button.pressedThisFrame = false;
            button.releasedThisFrame = false;
        });
    }
}
