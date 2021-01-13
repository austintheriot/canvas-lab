export class Animation {
	canvas: HTMLCanvasElement;
	ctx: CanvasRenderingContext2D;

	constructor(canvas: HTMLCanvasElement) {
		this.canvas = canvas;
		this.canvas.width = 500;
		this.canvas.height = 500;
		if (!canvas.getContext('2d')) alert('2D canvas not supported!');
		this.ctx = canvas.getContext('2d')!;
	}
}

export interface AnimationType extends Animation {}
