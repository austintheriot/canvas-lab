import { MazeAnimation } from './Maze';
import { arrayToRGB } from 'utils/arrayToRGB';

// const DARK_BLUE = [0, 74, 105];
// const LIGHT_BLUE = [201, 239, 255];
// const RED = [255, 50, 50];
// const PEACH = [255, 197, 189];
const ELETRIC_BLUE = [25, 178, 255];
const LIGHT_YELLOW = [255, 251, 189];
const WHITE = [255, 255, 255];
const BLACK = [0, 0, 0];

interface AnyNeighbor {
	cell: Cell | null;
	direction: 'north' | 'east' | 'south' | 'west';
}

interface CellNeighbor {
	cell: Cell;
	direction: 'north' | 'east' | 'south' | 'west';
}

interface CellParams {
	canvas: HTMLCanvasElement;
	ctx: CanvasRenderingContext2D;
	maze: MazeAnimation;
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

export class Cell {
	//maze properties
	maze: MazeAnimation;
	col: number;
	row: number;
	northWall: boolean;
	eastWall: boolean;
	southWall: boolean;
	westWall: boolean;

	//data properties
	generationVisited: boolean;
	searchVisisted: boolean;
	solveParent: Cell | null;

	//state
	isAnimatingGeneration: boolean;
	isAnimatingSearch: boolean;
	isAnimatingSolve: boolean;

	//canvas/animation properties
	ctx: CanvasRenderingContext2D;
	cellWidth: number;
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

	//canvas location of the cell's four corners
	TLC: number; //top left col
	TLR: number; //top left row
	TRC: number; //etc
	TRR: number;
	BRC: number;
	BRR: number;
	BLC: number;
	BLR: number;

	constructor(params: CellParams) {
		//maze properties
		this.maze = params.maze;
		this.col = params.col;
		this.row = params.row;
		this.northWall = true;
		this.eastWall = true;
		this.southWall = true;
		this.westWall = true;

		this.generationVisited = false;
		this.searchVisisted = false;
		this.solveParent = null;

		//staet: prevents flickering from competing animations
		this.isAnimatingGeneration = false;
		this.isAnimatingSearch = false;
		this.isAnimatingSolve = false;

		this.ctx = params.ctx;

		this.generationIncrement = Math.ceil(this.maze.dimensions / 10);
		this.searchIncrement = 10;
		this.solveIncrement = 10;

		//wall colors
		this.defaultWallColor =
			params.defaultWallColor ?? new Uint8ClampedArray(BLACK);
		this.generationWallColor =
			params.generationWallColor ?? new Uint8ClampedArray(ELETRIC_BLUE);
		this.currentWallColor =
			params.currentWallColor ?? new Uint8ClampedArray(BLACK);

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

		this.cellWidth =
			(this.maze.canvas.width - this.maze.padding) / this.maze.array.length;
		this.TLC = this.maze.padding / 2 + this.col * this.cellWidth;
		this.TLR = this.maze.padding / 2 + this.row * this.cellWidth;
		this.TRC = this.TLC + this.cellWidth;
		this.TRR = this.TLR;
		this.BRC = this.TRC;
		this.BRR = this.TLR + this.cellWidth;
		this.BLC = this.TLC;
		this.BLR = this.BRR;
	}

	/* 
    Re-usable function for retrieving any of the four cells surrounding a cell.
  */
	getCell(colOffset: number, rowOffset: number): Cell | null {
		return (
			(this.maze.array[this.col + colOffset] &&
				this.maze.array[this.col + colOffset][this.row + rowOffset]) ??
			null
		);
	}
	/* 
    Shorthand functions.
  */
	getNorthCell(): Cell | null {
		return this.getCell(0, -1);
	}
	getEastCell(): Cell | null {
		return this.getCell(1, 0);
	}

	getSouthCell(): Cell | null {
		return this.getCell(0, 1);
	}
	getWestCell(): Cell | null {
		return this.getCell(-1, 0);
	}

	/* 
    Retrieves all neighbors, irrespective of their null or Cell value
    or if there is a wall between the two cells.
  */
	getAllNeighbors() {
		return [
			{
				cell: this.getNorthCell(),
				direction: 'north',
			},
			{
				cell: this.getEastCell(),
				direction: 'east',
			},
			{
				cell: this.getSouthCell(),
				direction: 'south',
			},
			{
				cell: this.getWestCell(),
				direction: 'west',
			},
		] as AnyNeighbor[];
	}

	/* 
    Retrieves all valid, unvisited, surrounding cells. 
    Necessary for doing a randomized DFS for generating maze.
  */
	getUnvisitedNeighbbors(): CellNeighbor[] {
		const cellNighbors = (this.getAllNeighbors().filter(
			(neighbor) => neighbor.cell !== null,
		) as unknown) as CellNeighbor[];
		const unvisitedNeighbors = cellNighbors.filter(
			(object) => object.cell.generationVisited === false,
		);
		return unvisitedNeighbors;
	}

	/* 
    Retrieves neighboring cells that don't have walls between them.
    Necessary in search algorithms.
  */
	getTraversableNeighbors(): Cell[] {
		const traversavleNeighbors = [];
		const northCell = this.getNorthCell();
		if (northCell && !this.northWall) traversavleNeighbors.push(northCell);
		const eastCell = this.getEastCell();
		if (eastCell && !this.eastWall) traversavleNeighbors.push(eastCell);
		const southCell = this.getSouthCell();
		if (southCell && !this.southWall) traversavleNeighbors.push(southCell);
		const westCell = this.getWestCell();
		if (westCell && !this.westWall) traversavleNeighbors.push(westCell);
		return traversavleNeighbors;
	}

	/* 
    Draws the cell to the canvas.
    Uses current fillColor, lineColor, and what--if any--walls 
    the cell currently has.
  */
	drawCell() {
		this.ctx.fillStyle = arrayToRGB(this.currentFillColor);
		this.ctx.fillRect(this.TLC, this.TLR, this.cellWidth, this.cellWidth);
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
    Increments the color of the cell back in the direction of the 
    default color. Used when a new cell is first generated.
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

		this.drawCell();

		//it's only "done" if the color matches the destination color
		//add back into the queue for processing again
		if (!wallDone || !fillDone) this.addGenerationToQueue();
	}

	/* 
    The animation queue (called by the Maze) runs once per frame.
    The maze only animates the animations given to it.
    Each cell keeps track of its own animation 
    (When the animation is done, it stops adding
    itself back into the Animation Queue).
  */
	addGenerationToQueue() {
		//immediately turns the cell walls new color
		//and draws the cell
		//then adds the animation to the queue
		//to increment it back down to defualt color
		this.currentWallColor = this.generationWallColor;
		this.currentFillColor = this.generationFillColor;
		this.isAnimatingGeneration = true;

		//make sure "this" is referring to the cell when its called
		//and not referring to the maze
		this.maze.animationQueue.add(this.generationAnimation.bind(this));
	}

	markVisited() {
		this.addSearchAnimationToQueue();
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

		this.drawCell();

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
		this.maze.animationQueue.add(this.searchAnimation.bind(this));
	}

	/* 
    Called by the AnimationQueue.
    Fades the color of the cell to the "solved" state fill color.
    Used when the maze solution is finished.
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

		this.drawCell();

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
		this.maze.animationQueue.add(this.solveAnimation.bind(this));
	}
}
