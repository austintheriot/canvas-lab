class Particle {
	x: number;
	y: number;
	radius: number;
	color: string;
	ctx: CanvasRenderingContext2D;
	speed: number;

	constructor(ctx: CanvasRenderingContext2D) {
		this.x = Math.round(Math.random() * 499);
		this.y = Math.round(Math.random() * 499);
		this.radius = 1;
		this.color = '#000000';
		this.ctx = ctx;
		this.speed = Math.round(Math.random() * 5);
	}

	private _clampValue(min: number, value: number, max: number): number {
		return Math.max(Math.min(max, value), min);
	}

	private _randomWalk(currentPosition: number) {
		return this._clampValue(
			0,
			Math.round(
				currentPosition + (Math.random() * this.speed - this.speed / 2)
			),
			500
		);
	}

	public draw() {
		this.ctx.beginPath();
		this.ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2, true);
		this.ctx.closePath();
		this.ctx.fillStyle = this.color;
		this.ctx.fill();
	}

	public move() {
		this.x = this._randomWalk(this.x);
		this.y = this._randomWalk(this.y);
	}
}

export class Animation {
	canvas: HTMLCanvasElement;
	ctx: CanvasRenderingContext2D;
	particles: Particle[];

	constructor(canvas: HTMLCanvasElement) {
		this.canvas = canvas;
		this.canvas.width = 500;
		this.canvas.height = 500;
		this.ctx = canvas.getContext('2d')!;
		this.particles = [];
	}

	private _init() {
		//Init scene
		this.particles = new Array(1000)
			.fill(null)
			.map(() => new Particle(this.ctx));
	}

	private _draw() {
		this.ctx.clearRect(0, 0, 500, 500); // clear canvas
		this.particles.forEach((particle) => {
			particle.move();
			particle.draw();
		});
		window.requestAnimationFrame(() => this._draw());
	}

	public animate() {
		this._init();
		window.requestAnimationFrame(() => this._draw());
	}
}
