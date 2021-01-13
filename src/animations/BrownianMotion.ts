import { Particle } from '../classes/Particle';
import { Animation } from '../classes/Animation';
import { clampValue } from 'functions/clampValue';

export class BrownianParticle extends Particle {
	public moveRandomly() {
		this.x = clampValue(0, Math.round(this.x + (Math.random() - 0.5) * 5), 500);
		this.y = clampValue(0, Math.round(this.y + (Math.random() - 0.5) * 5), 500);
	}
}

export class BrownianMotion extends Animation {
	particles: BrownianParticle[];

	constructor(canvas: HTMLCanvasElement) {
		super(canvas);
		this.particles = new Array(250)
			.fill(null)
			.map(() => new BrownianParticle(this.ctx));
	}

	animate() {
		this.ctx.clearRect(0, 0, 500, 500); // clear canvas
		this.particles.forEach((particle) => particle.moveRandomly());
		this.particles.forEach((particle) => particle.draw());
		window.requestAnimationFrame(() => this.animate());
	}
}
