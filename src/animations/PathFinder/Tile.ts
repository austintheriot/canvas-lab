import { GridAnimation } from './Grid';
import { arrayToRGB } from 'utils/arrayToRGB';

// const DARK_BLUE = [0, 74, 105];
// const LIGHT_BLUE = [201, 239, 255];
// const RED = [255, 50, 50];
// const PEACH = [255, 197, 189];
// const DARK_GRAY = [64, 64, 64];
// const LIGHT_GRAY = [192, 192, 192];
const ELETRIC_BLUE = [25, 178, 255];
const LIGHT_YELLOW = [255, 251, 189];
const WHITE = [255, 255, 255];
const BLACK = [0, 0, 0];
const GRAY = [128, 128, 128];

interface AnyNeighbor {
	tile: Tile | null;
	direction: 'north' | 'east' | 'south' | 'west';
}

interface TileNeighbor {
	tile: Tile;
	direction: 'north' | 'east' | 'south' | 'west';
}

interface TileParams {
	canvas: HTMLCanvasElement;
	ctx: CanvasRenderingContext2D;
	grid: GridAnimation;
	col: number;
	row: number;

	offset?: number;
	generationWallColor?: Uint8ClampedArray;
	defaultWallColor?: Uint8ClampedArray;
	currentWallColor?: Uint8ClampedArray;
	solveFillColor?: Uint8ClampedArray;
	defaultFillColor?: Uint8ClampedArray;
	currentFillColor?: Uint8ClampedArray;
	generationFillColor?: Uint8ClampedArray;
	finalSearchFillColor?: Uint8ClampedArray;
	initialSearchFillColor?: Uint8ClampedArray;
}

export class Tile {
	//grid properties
	grid: GridAnimation;
	col: number;
	row: number;
	northWall: boolean;
	eastWall: boolean;
	southWall: boolean;
	westWall: boolean;

	//data properties
	generationVisited: boolean;
	searchVisited: boolean;
	solveParent: Tile | null;

	//state
	isAnimatingGeneration: boolean;
	isAnimatingSearch: boolean;
	isAnimatingSolve: boolean;

	//canvas/animation properties
	ctx: CanvasRenderingContext2D;
	tileWidth: number;
	generationWallColor: Uint8ClampedArray;
	defaultWallColor: Uint8ClampedArray;
	currentWallColor: Uint8ClampedArray;
	solveFillColor: Uint8ClampedArray;
	finalSearchFillColor: Uint8ClampedArray;
	initialSearchFillColor: Uint8ClampedArray;
	defaultFillColor: Uint8ClampedArray;
	currentFillColor: Uint8ClampedArray;
	generationFillColor: Uint8ClampedArray;
	generationIncrement: number;
	solveIncrement: number;
	searchIncrement: number;

	//canvas location of the tile's four corners
	TLC: number; //top left col
	TLR: number; //top left row
	TRC: number; //etc
	TRR: number;
	BRC: number;
	BRR: number;
	BLC: number;
	BLR: number;

	constructor(params: TileParams) {
		//grid properties
		this.grid = params.grid;
		this.col = params.col;
		this.row = params.row;
		this.northWall = false;
		this.eastWall = false;
		this.southWall = false;
		this.westWall = false;

		this.generationVisited = false;
		this.searchVisited = false;
		this.solveParent = null;

		//staet: prevents flickering from competing animations
		this.isAnimatingGeneration = false;
		this.isAnimatingSearch = false;
		this.isAnimatingSolve = false;

		this.ctx = params.ctx;

		this.generationIncrement = Math.ceil(this.grid.dimensions / 10);
		this.searchIncrement = 10;
		this.solveIncrement = 10;

		//wall colors
		this.defaultWallColor =
			params.defaultWallColor ?? new Uint8ClampedArray(GRAY);
		this.generationWallColor =
			params.generationWallColor ?? new Uint8ClampedArray(ELETRIC_BLUE);
		this.currentWallColor =
			params.currentWallColor ?? new Uint8ClampedArray(GRAY);

		//fill colors
		this.defaultFillColor =
			params.defaultFillColor ?? new Uint8ClampedArray(WHITE);
		this.solveFillColor =
			params.solveFillColor ?? new Uint8ClampedArray(ELETRIC_BLUE);
		this.initialSearchFillColor =
			params.initialSearchFillColor ?? new Uint8ClampedArray(ELETRIC_BLUE);
		this.finalSearchFillColor =
			params.finalSearchFillColor ?? new Uint8ClampedArray(LIGHT_YELLOW);
		this.currentFillColor =
			params.currentFillColor ?? new Uint8ClampedArray(WHITE);
		this.generationFillColor =
			params.generationFillColor ?? new Uint8ClampedArray(ELETRIC_BLUE);

		this.tileWidth =
			(this.grid.canvas.width - this.grid.padding) / this.grid.array.length;
		this.TLC = this.grid.padding / 2 + this.col * this.tileWidth;
		this.TLR = this.grid.padding / 2 + this.row * this.tileWidth;
		this.TRC = this.TLC + this.tileWidth;
		this.TRR = this.TLR;
		this.BRC = this.TRC;
		this.BRR = this.TLR + this.tileWidth;
		this.BLC = this.TLC;
		this.BLR = this.BRR;
	}

	/* 
    Re-usable function for retrieving any of the four tiles surrounding a tile.
  */
	getTile(colOffset: number, rowOffset: number): Tile | null {
		return (
			(this.grid.array[this.col + colOffset] &&
				this.grid.array[this.col + colOffset][this.row + rowOffset]) ??
			null
		);
	}
	/* 
    Shorthand functions.
  */
	getNorthTile(): Tile | null {
		return this.getTile(0, -1);
	}
	getEastTile(): Tile | null {
		return this.getTile(1, 0);
	}

	getSouthTile(): Tile | null {
		return this.getTile(0, 1);
	}
	getWestTile(): Tile | null {
		return this.getTile(-1, 0);
	}

	/* 
    Retrieves all neighbors, irrespective of their null or Tile value
    or if there is a wall between the two tiles.
  */
	getAllNeighbors() {
		return [
			{
				tile: this.getNorthTile(),
				direction: 'north',
			},
			{
				tile: this.getEastTile(),
				direction: 'east',
			},
			{
				tile: this.getSouthTile(),
				direction: 'south',
			},
			{
				tile: this.getWestTile(),
				direction: 'west',
			},
		] as AnyNeighbor[];
	}

	/* 
    Retrieves all valid, unvisited, surrounding tiles. 
    Necessary for doing a randomized DFS for generating grid.
  */
	getUnvisitedNeighbbors(): TileNeighbor[] {
		const tileNighbors = (this.getAllNeighbors().filter(
			(neighbor) => neighbor.tile !== null,
		) as unknown) as TileNeighbor[];
		const unvisitedNeighbors = tileNighbors.filter(
			(object) => object.tile.generationVisited === false,
		);
		return unvisitedNeighbors;
	}

	/* 
    Retrieves neighboring tiles that don't have walls between them.
    Necessary in search algorithms.
  */
	getTraversableNeighbors(): Tile[] {
		const traversableNeighbors = [];
		const northTile = this.getNorthTile();
		if (northTile && !this.northWall) traversableNeighbors.push(northTile);
		const eastTile = this.getEastTile();
		if (eastTile && !this.eastWall) traversableNeighbors.push(eastTile);
		const southTile = this.getSouthTile();
		if (southTile && !this.southWall) traversableNeighbors.push(southTile);
		const westTile = this.getWestTile();
		if (westTile && !this.westWall) traversableNeighbors.push(westTile);
		return traversableNeighbors;
	}

	/* 
    Draws the tile to the canvas.
    Uses current fillColor, lineColor, and what--if any--walls 
    the tile currently has.
  */
	drawTile() {
		this.ctx.fillStyle = arrayToRGB(this.currentFillColor);
		this.ctx.fillRect(this.TLC, this.TLR, this.tileWidth, this.tileWidth);
		this.ctx.beginPath();
		if (this.northWall) {
			this.ctx.moveTo(this.TLC, this.TLR);
			this.ctx.lineTo(this.TRC, this.TRR);
		}
		if (this.eastWall) {
			this.ctx.moveTo(this.TRC, this.TRR);
			this.ctx.lineTo(this.BRC, this.BRR);
		}
		if (this.southWall) {
			this.ctx.moveTo(this.BRC, this.BRR);
			this.ctx.lineTo(this.BLC, this.BLR);
		}
		if (this.westWall) {
			this.ctx.moveTo(this.BLC, this.BLR);
			this.ctx.lineTo(this.TLC, this.TLR);
		}
		this.ctx.closePath();
		this.ctx.strokeStyle = arrayToRGB(this.currentWallColor);
		this.ctx.stroke();
	}

	incrementColor({
		currentColor,
		destinationColor,
		incrementAmount,
	}: {
		currentColor: Uint8ClampedArray;
		destinationColor: Uint8ClampedArray;
		incrementAmount: number;
	}) {
		//increment colors back to defaults
		let done = true;

		//wall colors
		for (let i = 0; i < currentColor.length; i++) {
			if (currentColor[i] !== destinationColor[i]) {
				//prevent flickering when the "last bit" of animation is too small for the increment amount
				if (Math.abs(currentColor[i] - destinationColor[i]) < incrementAmount) {
					currentColor[i] = destinationColor[i];
				} else {
					done = false;
					const direction =
						destinationColor[i] > currentColor[i]
							? incrementAmount
							: -incrementAmount;
					currentColor[i] += direction;
				}
			}
		}

		return done;
	}

	/* 
    Called by the AnimationQueue.
    Increments the color of the tile back in the direction of the 
    default color. Used when a new tile is first generated.
  */
	generationAnimation() {
		//prevents flickering from competing animations
		if (!this.isAnimatingGeneration) return;

		//increment colors back to defaults
		const wallDone = this.incrementColor({
			currentColor: this.currentWallColor,
			destinationColor: this.defaultWallColor,
			incrementAmount: this.generationIncrement,
		});

		const fillDone = this.incrementColor({
			currentColor: this.currentFillColor,
			destinationColor: this.defaultFillColor,
			incrementAmount: this.generationIncrement,
		});

		this.drawTile();

		//it's only "done" if the color matches the destination color
		//add back into the queue for processing again
		if (!wallDone || !fillDone) this.addGenerationToQueue();
	}

	/* 
    The animation queue (called by the Maze) runs once per frame.
    The grid only animates the animations given to it.
    Each tile keeps track of its own animation 
    (When the animation is done, it stops adding
    itself back into the Animation Queue).
  */
	addGenerationToQueue() {
		//immediately turns the tile walls new color
		//and draws the tile
		//then adds the animation to the queue
		//to increment it back down to defualt color
		this.currentWallColor = this.generationWallColor;
		this.currentFillColor = this.generationFillColor;
		this.isAnimatingGeneration = true;

		//make sure "this" is referring to the tile when its called
		//and not referring to the grid
		this.grid.animationQueue.add(this.generationAnimation.bind(this));
	}

	searchAnimation() {
		//prevents flickering from competing animations
		if (!this.isAnimatingSearch) return;

		//increment to the solved state fill color
		const done = this.incrementColor({
			currentColor: this.currentFillColor,
			destinationColor: this.finalSearchFillColor,
			incrementAmount: this.searchIncrement,
		});

		this.drawTile();

		//it's only "done" if the color matches the destination color
		//add back into the queue for processing again
		if (!done) this.addSearchAnimationToQueue();
	}

	/* 
    Adds it to the AnimationQueue for processing.
  */
	addSearchAnimationToQueue() {
		this.isAnimatingGeneration = false;
		this.isAnimatingSearch = true;
		this.grid.animationQueue.add(this.searchAnimation.bind(this));
	}

	/* 
    Called by the AnimationQueue.
    Fades the color of the tile to the "solved" state fill color.
    Used when the grid solution is finished.
  */
	solveAnimation() {
		//prevents flickering from competing animations
		if (!this.isAnimatingSolve) return;

		//increment to the solved state fill color
		const done = this.incrementColor({
			currentColor: this.currentFillColor,
			destinationColor: this.solveFillColor,
			incrementAmount: this.solveIncrement,
		});

		this.drawTile();

		//it's only "done" if the color matches the destination color
		//add back into the queue for processing again
		if (!done) this.addSolveAnimationToQueue();
	}

	/* 
    Adds it to the AnimationQueue for processing.
  */
	addSolveAnimationToQueue() {
		this.isAnimatingSearch = false;
		this.isAnimatingSolve = true;
		this.grid.animationQueue.add(this.solveAnimation.bind(this));
	}
}
