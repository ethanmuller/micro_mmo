class ButtonInput {
    pressed : boolean = false;
    pressedThisFrame : boolean = false;
    releasedThisFrame : boolean = false;
    keycodes : string[];

    constructor(keys : string[]) {
        this.keycodes = keys;
    }
}

let reference : InputManager;

export class InputManager {

    private buttons : ButtonInput[] = [];

    up : ButtonInput;
    down : ButtonInput;
    left : ButtonInput;
    right : ButtonInput;

    constructor() {
        reference = this;

        window.addEventListener('keydown', this.onkeydown);
        window.addEventListener('keyup', this.onkeyup);

        this.buttons.push(this.up = new ButtonInput(["ArrowUp", "W"]));
        this.buttons.push(this.down = new ButtonInput(["ArrowDown", "S"]));
        this.buttons.push(this.left = new ButtonInput(["ArrowLeft", "A"]));
        this.buttons.push(this.right = new ButtonInput(["ArrowRight", "D"]));
    }

    private onkeydown(event : Event)
    {
        let kbe = event as KeyboardEvent;
        if (!kbe) return;

        let code = kbe.code;
        for (let i = 0; i < reference.buttons.length; ++i) {
            let button = reference.buttons[i];
            if (button.keycodes.includes(code)) {
                button.pressed = true;
                button.pressedThisFrame = true;
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
                button.pressed = false;
                button.pressedThisFrame = false;
                button.releasedThisFrame = true;
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