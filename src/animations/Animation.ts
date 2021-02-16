export class Animation {
	canvas: HTMLCanvasElement;
	ctx: CanvasRenderingContext2D;

	constructor(canvas: HTMLCanvasElement) {
		this.canvas = canvas;
		this.canvas.width = 1000;
		this.canvas.height = 1000;
		if (!canvas.getContext('2d', { alpha: false }))
			alert('2D canvas not supported!');
		this.ctx = canvas.getContext('2d')!;
	}
}

export interface AnimationType extends Animation {}
