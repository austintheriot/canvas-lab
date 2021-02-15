import { clampValue } from 'utils/clampValue';

export interface Options {
	color?: string;
	radius?: number;
	x?: number;
	y?: number;
	vx?: number;
	vy?: number;
	ax?: number;
	ay?: number;
	speed?: number;
	damper?: number;
	boundary?: 'bounce' | 'clamp' | 'none';
}

export class Particle {
	x: number; //position
	y: number;
	vx: number; //velocity
	vy: number;
	ax: number; //acceleration
	ay: number;
	radius: number;
	color: string;
	ctx: CanvasRenderingContext2D;
	damper: number;
	boundary: 'bounce' | 'clamp' | 'none';

	constructor(ctx: CanvasRenderingContext2D, options?: Options) {
		this.x = options?.x ?? Math.round(Math.random() * 499);
		this.y = options?.y ?? Math.round(Math.random() * 499);
		this.vx = options?.vx ?? 0;
		this.vy = options?.vy ?? 0;
		this.ax = options?.ax ?? 0;
		this.ay = options?.ay ?? 0;
		this.radius = options?.radius ?? 1;
		this.color = options?.color ?? '#000000';
		this.ctx = ctx;
		this.damper = options?.damper ?? 0.99;
		this.boundary = options?.boundary ?? 'bounce';
	}

	public accelerate() {
		this.vx = (this.vx + this.ax) * this.damper;
		this.vy = (this.vy + this.ay) * this.damper;
	}

	public move() {
		if (this.boundary === 'bounce') {
			let newX = this.x + this.vx;
			let newY = this.y + this.vy;
			if (newX > 500 || newX < 0) this.vx *= -1;
			if (newY > 500 || newY < 0) this.vy *= -1;
			this.x = Math.round(this.x + this.vx);
			this.y = Math.round(this.y + this.vy);
		} else if (this.boundary === 'clamp') {
			this.x = clampValue(0, this.x + this.vx, 500);
			this.y = clampValue(0, this.y + this.vy, 500);
		} else {
			this.x = this.x + this.vx;
			this.y = this.y + this.vy;
		}
	}

	public draw() {
		this.ctx.beginPath();
		this.ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2, true);
		this.ctx.closePath();
		this.ctx.fillStyle = this.color;
		this.ctx.fill();
	}
}
