export class Dungeon {
    width: number;
    height: number;
    centerX: number;
    centerY: number;
    map: string[][];
    directions: { x: number, y: number }[];

    constructor(width: number, height: number) {
        this.width = width;
        this.height = height;
        this.centerX = Math.floor(this.width / 2);
        this.centerY = Math.floor(this.height / 2);
        this.map = this.generateEmptyMap();
        this.directions = [
            { x: 0, y: -1 },  // North
            { x: 1, y: 0 },   // East
            { x: 0, y: 1 },   // South
            { x: -1, y: 0 }   // West
        ];
        this.generateMaze();
        this.placeStartPoint();
    }

    generateEmptyMap(): string[][] {
        const map: string[][] = [];
        for (let y = 0; y < this.height; y++) {
            const row: string[] = [];
            for (let x = 0; x < this.width; x++) {
                row.push('#');
            }
            map.push(row);
        }
        return map;
    }

    generateMaze(): void {
        const stack: { x: number, y: number }[] = [];

        // Carve out a 3x3 area in the center for free space
        for (let y = this.centerY - 1; y <= this.centerY + 1; y++) {
            for (let x = this.centerX - 1; x <= this.centerX + 1; x++) {
                this.map[y][x] = '.';
            }
        }

        // Start the maze generation from the center free space
        stack.push({ x: this.centerX, y: this.centerY });
        this.map[this.centerY][this.centerX] = '.';

        while (stack.length > 0) {
            const current = stack[stack.length - 1];
            const neighbors = this.getUnvisitedNeighbors(current);

            if (neighbors.length > 0) {
                const next = neighbors[this.randomRange(0, neighbors.length - 1)];
                this.map[next.y][next.x] = '.';
                this.map[(current.y + next.y) / 2][(current.x + next.x) / 2] = '.';
                stack.push(next);
            } else {
                stack.pop();
            }
        }
    }

    getUnvisitedNeighbors(cell: { x: number, y: number }): { x: number, y: number }[] {
        const neighbors: { x: number, y: number }[] = [];
        for (const direction of this.directions) {
            const nx = cell.x + direction.x * 2;
            const ny = cell.y + direction.y * 2;
            if (this.isWithinBounds(nx, ny) && this.map[ny][nx] === '#') {
                neighbors.push({ x: nx, y: ny });
            }
        }
        return neighbors;
    }

    isWithinBounds(x: number, y: number): boolean {
        return x > 0 && x < this.width - 1 && y > 0 && y < this.height - 1;
    }

    placeStartPoint(): void {
        this.map[this.centerY][this.centerX] = '@';
    }

    getDeadEnds(): { x: number, y: number }[] {
        const deadEnds: { x: number, y: number }[] = [];
        for (let y = 1; y < this.height - 1; y++) {
            for (let x = 1; x < this.width - 1; x++) {
                if (this.map[y][x] === '.' && this.countAdjacentPaths(x, y) === 1) {
                    deadEnds.push({ x, y });
                }
            }
        }

        return deadEnds
    }

    countAdjacentPaths(x: number, y: number): number {
        let count = 0;
        for (const direction of this.directions) {
            const nx = x + direction.x;
            const ny = y + direction.y;
            if (this.isWithinBounds(nx, ny) && this.map[ny][nx] === '.') {
                count++;
            }
        }
        return count;
    }

    randomRange(min: number, max: number): number {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }

    render(): void {
        console.log(this.map.map(row => row.join('')).join('\n'));
    }
    asString(): string {
        return this.map.map(row => row.join('')).join('\n')
    }
}
