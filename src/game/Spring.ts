export class Spring {
    restPosition: number;
    mass: number;
    springiness: number;
    damping: number;
    position: number;
    velocity: number;
    acceleration: number;
    appliedForce: number;

    constructor(restPosition: number, mass: number, springiness: number, damping: number) {
        this.restPosition = restPosition; // The position where the spring wants to rest
        this.mass = mass; // The mass attached to the spring
        this.springiness = springiness; // The spring constant (k)
        this.damping = damping; // The damping constant (b)

        this.position = restPosition; // Current position of the mass
        this.velocity = 0; // Current velocity of the mass
        this.acceleration = 0; // Current acceleration of the mass
        this.appliedForce = 0; // External force applied to the spring
    }

    applyForce(force: number): void {
        this.appliedForce += force; // Add the applied force to the existing force
    }

    update(): void {
        // Calculate the force exerted by the spring (Hooke's Law: F = -k * x)
        const displacement = this.position - this.restPosition;
        const springForce = -this.springiness * displacement;

        // Calculate the damping force (Damping force: F_damping = -b * v)
        const dampingForce = -this.damping * this.velocity;

        // Total force is the sum of the spring force, damping force, and the applied force
        const totalForce = springForce + dampingForce + this.appliedForce;

        // Calculate the acceleration (Newton's second law: F = m * a -> a = F / m)
        this.acceleration = totalForce / this.mass;

        // Update the velocity (v = v0 + a * dt)
        this.velocity += this.acceleration

        // Update the position (x = x0 + v * dt)
        this.position += this.velocity

        // Reset the applied force after each update
        this.appliedForce = 0;
    }
}
