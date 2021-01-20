import { Particle } from '../classes/Particle';
import { Animation } from '../classes/Animation';
import { clampValue } from 'functions/clampValue';
import { isContext } from 'vm';

const weightsToProbs = (weights: number[]) => {
	for (let i = 1; i < weights.length; i++) {
		weights[i] = weights[i - 1] + weights[i];
	}
	return weights;
};

export class BrownianParticle extends Particle {
	fractalize() {
		const p = Math.random();
		const weights = weightsToProbs([0.01, 0.85, 0.07, 0.07]);
		const i = weights.findIndex((prob) => p >= prob);
		const a = [0, 0.85, 0.2, -0.15][i];
		const b = [0, 0.04, -0.26, 0.28][i];
		const c = [0, -0.04, 0.23, 0.26][i];
		const d = [0.16, 0.85, 0.22, 0.24][i];
		const e = [0, 0, 0, 0][i];
		const f = [0, 1.6, 1.6, 0.44][i];

		const x = this.x;
		const y = this.y;
		this.x = Math.round(a * x + b * y + e) * 1;
		this.y = Math.round(c * x + d * y + f) * 1;
	}
}

export class BarnsleyFern extends Animation {
	particles: BrownianParticle[];
	iterations: number;
	init: boolean;

	constructor(canvas: HTMLCanvasElement) {
		super(canvas);
		this.init = false;
		this.iterations = 10000;
		this.particles = new Array(1000)
			.fill(null)
			.map(() => new BrownianParticle(this.ctx, { x: 0, y: 0 }));
	}

	animate() {
		if (!this.init) {
			this.ctx.translate(250, 250);
			this.init = true;
		}
		this.particles.forEach((particle) => particle.draw());
		this.particles.forEach((particle) => particle.fractalize());
		this.iterations--;
		if (this.iterations > 0) window.requestAnimationFrame(() => this.animate());
	}
}
