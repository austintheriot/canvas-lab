import { GridAnimation } from './Grid';
import { arrayToRGB } from 'utils/arrayToRGB';

// const DARK_BLUE = [0, 74, 105];
// const LIGHT_BLUE = [201, 239, 255];
// const RED = [255, 50, 50];
// const PEACH = [255, 197, 189];
// const DARK_GRAY = [64, 64, 64];
// const GRAY = [128, 128, 128];
const LIGHT_GRAY = [220, 220, 220];
const ELETRIC_BLUE = [25, 178, 255];
const LIGHT_YELLOW = [255, 251, 189];
const WHITE = [255, 255, 255];
const BLACK = [0, 0, 0];

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
	defaultOpenFillColor?: Uint8ClampedArray;
	defaultWallFillColor?: Uint8ClampedArray;
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

	//data properties
	generationVisited: boolean;
	searchVisited: boolean;
	searchVisited2: boolean;
	solveParent1: Tile | null;
	solveParent2: Tile | null;

	//state
	isAnimatingGeneration: boolean;
	isAnimatingSearch: boolean;
	isAnimatingSolve: boolean;

	//canvas/animation properties
	ctx: CanvasRenderingContext2D;
	tileWidth: number;
	defaultWallColor: Uint8ClampedArray;
	currentWallColor: Uint8ClampedArray;
	solveFillColor: Uint8ClampedArray;
	finalSearchFillColor: Uint8ClampedArray;
	initialSearchFillColor: Uint8ClampedArray;
	defaultOpenFillColor: Uint8ClampedArray;
	defaultWallFillColor: Uint8ClampedArray;
	currentFillColor: Uint8ClampedArray;
	generationFillColor: Uint8ClampedArray;
	generationIncrement: number;
	solveIncrement: number;
	searchIncrement: number;

	type: 'open' | 'wall';
	isNewlyPlaced: boolean;

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

		this.type = 'open';
		//counts as newly placed while mouse is down
		//all tiles are marked not new as soon as mouse is moved up
		//only old tiles are toggled on mousedown
		this.isNewlyPlaced = false;

		this.generationVisited = false;
		this.searchVisited = false;
		this.searchVisited2 = false;
		this.solveParent1 = null;
		this.solveParent2 = null;

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
			params.defaultWallColor ?? new Uint8ClampedArray(LIGHT_GRAY);
		this.currentWallColor =
			params.currentWallColor ?? new Uint8ClampedArray(LIGHT_GRAY);

		//fill colors
		this.defaultOpenFillColor =
			params.defaultOpenFillColor ?? new Uint8ClampedArray(WHITE);
		this.defaultWallFillColor =
			params.defaultWallFillColor ?? new Uint8ClampedArray(BLACK);
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
			{ tile: this.getSouthTile(), direction: 'south' },
			{ tile: this.getEastTile(), direction: 'east' },
			{ tile: this.getWestTile(), direction: 'west' },
			{ tile: this.getNorthTile(), direction: 'north' },
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
		if (northTile && northTile.type !== 'wall')
			traversableNeighbors.push(northTile);
		const eastTile = this.getEastTile();
		if (eastTile && eastTile.type !== 'wall')
			traversableNeighbors.push(eastTile);
		const southTile = this.getSouthTile();
		if (southTile && southTile.type !== 'wall')
			traversableNeighbors.push(southTile);
		const westTile = this.getWestTile();
		if (westTile && westTile.type !== 'wall')
			traversableNeighbors.push(westTile);
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
		this.ctx.moveTo(this.TLC, this.TLR);
		this.ctx.lineTo(this.TRC, this.TRR);
		this.ctx.lineTo(this.BRC, this.BRR);
		this.ctx.lineTo(this.BLC, this.BLR);
		this.ctx.lineTo(this.TLC, this.TLR);
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
