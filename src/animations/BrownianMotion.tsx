import React, { useState } from 'react';
import { Particle } from '../classes/Particle';
import { Animation } from '../classes/Animation';
import { clampValue } from 'utils/clampValue';
import { useAnimation } from 'hooks/useAnimation';
import { cloneDeep } from 'lodash';

export class BrownianParticle extends Particle {
	public moveRandomly(speed: number) {
		this.x = clampValue(
			0,
			Math.round(this.x + (Math.random() - 0.5) * speed),
			500,
		);
		this.y = clampValue(
			0,
			Math.round(this.y + (Math.random() - 0.5) * speed),
			500,
		);
	}
}

interface Options {
	[key: string]: any;
	speed?: number;
	clearCanvas?: boolean;
}

export class BrownianMotionAnimation extends Animation {
	[key: string]: any;
	particles: BrownianParticle[];
	speed: number;

	constructor(canvas: HTMLCanvasElement, options: Options) {
		super(canvas);
		this.particles = new Array(250)
			.fill(null)
			.map(() => new BrownianParticle(this.ctx));
		this.speed = options.speed ?? 5;
		this.clearCanvas = options.clearCanvas ?? true;
	}

	updateValues(options: Options) {
		for (let key in options) {
			this[key] = options[key];
		}
	}

	animate() {
		if (this.clearCanvas) this.ctx.clearRect(0, 0, 500, 500); // clear canvas
		this.particles.forEach((particle) => particle.moveRandomly(this.speed));
		this.particles.forEach((particle) => particle.draw());
		window.requestAnimationFrame(() => this.animate());
	}
}

interface State {
	[key: string]: any;
	speed: number;
	clearCanvas: boolean;
}
type InputType = keyof State;

export function BrownianMotion() {
	const [options, setOptions] = useState<State>({
		speed: 5,
		clearCanvas: true,
	});
	const [canvas] = useAnimation(BrownianMotionAnimation, options);

	const handleChange = (
		e: React.FormEvent<HTMLInputElement>,
		inputType: InputType,
	) => {
		const value = e.currentTarget.value;
		console.log(inputType, value);
		setOptions((prevState) => {
			const newState: State = cloneDeep(prevState);
			newState[inputType] = value;
			return newState;
		});
	};

	return (
		<>
			<label>Speed</label>
			<input
				type="range"
				onChange={(e) => handleChange(e, 'speed')}
				min="0"
				max="15"
				step="0.001"
				value={options.speed}
			/>
			<label>Clear Canvas</label>
			<input
				type="checkbox"
				onChange={(e) => handleChange(e, 'clearCanvas')}
				checked={options.clearCanvas}
			/>
			{canvas}
		</>
	);
}
