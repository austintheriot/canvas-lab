import { Animation } from '../classes/Animation';
import { useAnimation } from '../hooks/useAnimation';
import { Stack } from 'classes/Stack';
import { arrayToRGB } from 'utils/arrayToRGB';
import { Queue } from 'classes/Queue';

const ELETRIC_BLUE = [25, 178, 255];
const LIGHT_BLUE = [201, 239, 255];
const LIGHT_YELLOW = [255, 251, 189];
const DARK_BLUE = [0, 74, 105];
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
	solvedFillColor?: Uint8ClampedArray;
	defaultFillColor?: Uint8ClampedArray;
	currentFillColor?: Uint8ClampedArray;
	generationFillColor?: Uint8ClampedArray;
}

class Cell {
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
	solvedFillColor: Uint8ClampedArray;
	searchFillColor: Uint8ClampedArray;
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
		this.searchIncrement = 25;
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
		this.solvedFillColor =
			params.solvedFillColor ?? new Uint8ClampedArray(ELETRIC_BLUE);
		this.searchFillColor =
			params.solvedFillColor ?? new Uint8ClampedArray(LIGHT_YELLOW);
		this.currentFillColor =
			params.currentFillColor ?? new Uint8ClampedArray(WHITE);
		this.generationFillColor =
			params.generationFillColor ?? new Uint8ClampedArray(ELETRIC_BLUE);

		this.cellWidth = Math.floor(
			(1000 - this.maze.padding) / this.maze.array.length,
		);
		const paddingRoundingeError =
			1000 - this.cellWidth * this.maze.array.length;
		this.TLC =
			Math.floor(this.maze.padding / 2) +
			paddingRoundingeError / 2 +
			this.col * this.cellWidth;
		this.TLR =
			Math.floor(this.maze.padding / 2) +
			paddingRoundingeError / 2 +
			this.row * this.cellWidth;
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

	/* 
    Called by the AnimationQueue.
    Increments the color of the cell back in the direction of the 
    default color. Used when a new cell is first generated.
  */
	generationAnimation() {
		//prevents flickering from competing animations
		if (!this.isAnimatingGeneration) return;
		//increment colors back to defaults
		let done = true;

		//wall colors
		for (let i = 0; i < this.currentWallColor.length; i++) {
			if (this.currentWallColor[i] !== this.defaultWallColor[i]) {
				//prevent flickering when the "last bit" of animation is too small for the increment amount
				if (
					Math.abs(this.currentWallColor[i] - this.defaultWallColor[i]) <
					this.generationIncrement
				) {
					this.currentWallColor[i] +=
						this.defaultWallColor[i] > this.currentWallColor[i] ? 1 : -1;
				} else {
					done = false;
					const direction =
						this.defaultWallColor[i] > this.currentWallColor[i]
							? this.generationIncrement
							: -this.generationIncrement;
					this.currentWallColor[i] += direction;
				}
			}
		}

		//fill colors
		for (let i = 0; i < this.currentFillColor.length; i++) {
			if (this.currentFillColor[i] !== this.defaultFillColor[i]) {
				done = false;
				//prevent flickering when the "last bit" of animation is too small for the increment amount
				if (
					Math.abs(this.defaultFillColor[i] - this.currentFillColor[i]) <
					this.generationIncrement
				) {
					this.currentFillColor[i] +=
						this.defaultFillColor[i] > this.currentFillColor[i] ? 1 : -1;
				} else {
					const direction =
						this.defaultFillColor[i] > this.currentFillColor[i]
							? this.generationIncrement
							: -this.generationIncrement;
					this.currentFillColor[i] += direction;
				}
			}
		}

		this.drawCell();

		//it's only "done" if the color matches the destination color
		//add back into the queue for processing again
		if (!done) this.addGenerationToQueue();
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
		this.drawCell();

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
		let done = true;
		for (let i = 0; i < this.currentFillColor.length; i++) {
			if (this.currentFillColor[i] !== this.searchFillColor[i]) {
				done = false;
				//prevent flickering when the "last bit" of animation is too small for the increment amount
				if (
					Math.abs(this.searchFillColor[i] - this.currentFillColor[i]) <
					this.searchIncrement
				) {
					this.currentFillColor[i] +=
						this.searchFillColor[i] > this.currentFillColor[i] ? 1 : -1;
				} else {
					const direction =
						this.searchFillColor[i] > this.currentFillColor[i]
							? this.searchIncrement
							: -this.searchIncrement;
					this.currentFillColor[i] += direction;
				}
			}
		}

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
		let done = true;
		for (let i = 0; i < this.currentFillColor.length; i++) {
			if (this.currentFillColor[i] !== this.solvedFillColor[i]) {
				done = false;
				//prevent flickering when the "last bit" of animation is too small for the increment amount
				if (
					Math.abs(this.solvedFillColor[i] - this.currentFillColor[i]) <
					this.solveIncrement
				) {
					this.currentFillColor[i] +=
						this.solvedFillColor[i] > this.currentFillColor[i] ? 1 : -1;
				} else {
					const direction =
						this.solvedFillColor[i] > this.currentFillColor[i]
							? this.solveIncrement
							: -this.solveIncrement;
					this.currentFillColor[i] += direction;
				}
			}
		}

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

interface MazeOptions {
	[key: string]: any;
	dimensions?: number;
	lineWidth?: number;
	padding?: number;
	generationsPerFrame: number;
	searchesPerFrame: number;
}

export class MazeAnimation extends Animation {
	array: Cell[][];
	firstCell: Cell;
	dimensions: number;
	padding: number;
	isGenerating: boolean;
	isSolving: boolean;
	isAnimatingSearch: boolean;
	isComplete: boolean;
	generationsPerFrame: number;
	searchesPerFrame: number;
	solvePathsPerFrame: number;
	frameCount: number;
	generationStack: Stack;
	animationQueue: Queue;
	solveQueue: Queue;
	startCell: Cell;
	endCell: Cell;
	solvePath: Cell[];

	constructor(canvas: HTMLCanvasElement, options: MazeOptions) {
		super(canvas);
		this.ctx.lineWidth = Math.floor(options?.lineWidth ?? 2); //width of maze walls
		this.dimensions = Math.max(options.dimensions ?? 10, 1); //default to 10, but never less than 1
		this.padding = Math.floor(options.padding ?? 4); // slightly offset so wall lines aren't cut off
		this.generationStack = new Stack(); //used to generate the maze
		this.animationQueue = new Queue(); //used for processing necessary animations
		this.solveQueue = new Queue();
		this.solvePath = [];
		this.frameCount = 0;

		//which portion of the animation is complete
		this.isGenerating = true;
		this.isSolving = false;
		this.isAnimatingSearch = false;
		this.isComplete = false;

		//make canvas background white
		this.ctx.fillStyle = 'white';
		this.ctx.fillRect(0, 0, 1000, 1000);

		//build array of cells--fill them with info about their position in the array
		this.array = new Array(this.dimensions).fill(null);
		for (let col = 0; col < this.array.length; col++) {
			this.array[col] = new Array(this.dimensions).fill(null);
			const innerArray = this.array[col];
			for (let row = 0; row < innerArray.length; row++) {
				innerArray[row] = new Cell({
					canvas: this.canvas,
					ctx: this.ctx,
					maze: this,
					row,
					col,
				});
			}
		}

		//make entrance the top left cell & exit the bottom right cell
		this.array[0][0].northWall = false;
		this.array[this.array.length - 1][this.array.length - 1].southWall = false;

		/* 
      How many function calls to do per frame.
      By default, the larger the array, the faster it goes.
    */
		this.generationsPerFrame = this.calculateCallsPerFrame(
			options,
			'generations',
			3,
		);
		this.searchesPerFrame = this.calculateCallsPerFrame(options, 'searches');
		this.solvePathsPerFrame = this.calculateCallsPerFrame(
			options,
			'solvePaths',
			0.5,
		);

		//initialize the generationStack with a random first cell
		const randomCol = Math.floor(Math.random() * this.array.length);
		const randomRow = Math.floor(Math.random() * this.array[0].length);
		this.firstCell = this.array[randomCol][randomRow];
		this.generationStack.push(this.firstCell);
		this.firstCell.generationVisited = true;

		/* 
    Initialze solveQueue for solving later.
    Starting cell is the top left cell.
    Ending cell is the bottom right cell.
    Even though the cells do not yet have their end state
    values (walls, etc.), they are reference values, 
    so by the time we get around to solving the maze,
    they will be ready.
    */
		this.startCell = this.array[0][0];
		this.endCell = this.array[this.array.length - 1][this.array.length - 1];
		this.solveQueue.add(this.startCell);
	}

	/* 
    Calculates the ideal number of function calls per second based on the size 
    of the maze array. More cells = faster defaults. 
    Use whatever is provided in the options by default, but do not accept a 
    number less than one.
    If no options are provided, calculate speed based on the size of the array
    and multiply that number based on the custom gain.
  */
	calculateCallsPerFrame(
		options: MazeOptions,
		perFrameProperty: 'generations' | 'searches' | 'solvePaths',
		customGain: number = 1,
	) {
		return Math.ceil(
			Math.max(
				options[`${perFrameProperty}PerFrame`] ??
					Math.ceil((this.array.length ** 2 / 1000) * customGain),
				1,
			),
		);
	}

	incrementFrameCount() {
		if (this.frameCount === Number.MAX_SAFE_INTEGER - 1) {
			this.frameCount = 0;
		}
		this.frameCount++;
	}

	/* 
    Only allows a callback to called every n frames instead of every frame 
  */
	throttle(callback: (params?: any) => any, n: number) {
		if (this.frameCount % n === 0) callback();
	}

	/* 
    Uses a randomized depth-first-search to generate the maze.
  */
	generateMaze() {
		for (let i = 0; i < this.generationsPerFrame; i++) {
			//if stack is empty, stop trying to generate new cells
			if (this.generationStack.isEmpty()) {
				this.isGenerating = false;
				this.isSolving = true;
				return;
			}

			//if stack is not empty, generate new cells
			const currentCell: Cell = this.generationStack.pop();
			const unvisitedNeighbors = currentCell.getUnvisitedNeighbbors();
			if (unvisitedNeighbors.length > 0) {
				this.generationStack.push(currentCell);
				//pick a random neighbor from surrounding neighbors
				const neighbor =
					unvisitedNeighbors[
						Math.floor(Math.random() * unvisitedNeighbors.length)
					];
				if (!neighbor) return;
				//neighbor.direciton is the direction you have to go
				//to get to the neighbor from the current cell
				//that was just popped off of the generationStack
				if (neighbor.direction === 'north') {
					currentCell.northWall = false;
					neighbor.cell!.southWall = false;
				} else if (neighbor.direction === 'east') {
					currentCell.eastWall = false;
					neighbor.cell!.westWall = false;
				} else if (neighbor.direction === 'south') {
					currentCell.southWall = false;
					neighbor.cell!.northWall = false;
				} else if (neighbor.direction === 'west') {
					currentCell.westWall = false;
					neighbor.cell!.eastWall = false;
				}

				neighbor.cell.generationVisited = true;
				this.generationStack.push(neighbor.cell);

				/* 
            Must draw both cells to prevent visual glitches.
            In general, I've tried to avoid drawing every cell 
            every frame because of the heavy load that it incurs
            on larger mazes (and thus slower frame rates).
          */
				currentCell.drawCell();
				neighbor.cell.drawCell();

				//begin generationAnimation process for the new cells
				currentCell.addGenerationToQueue();
				neighbor.cell.addGenerationToQueue();
			}
		}
	}

	/* 
    This runs once on every frame. 
    Every animation currently in the queue is run. 
    Most of the animations will add themselves back 
    into the queue to be re-run, but the animations 
    that are added back in are not run until the 
    next frame.
  */
	runAnimationQueue() {
		const queueLength = this.animationQueue.size();
		for (let i = 0; i < queueLength; i++) {
			const animation: () => void = this.animationQueue.remove();
			animation();
		}
	}

	/* 
    Breadth-first search maze solve.
  */
	solveMaze() {
		for (let i = 0; i < this.searchesPerFrame; i++) {
			//if solve Queue is empty, stop trying to solve
			if (this.solveQueue.isEmpty()) {
				this.isSolving = false;
				return;
			}

			//else if queue is not empty, continue solving
			const dequeuedCell: Cell = this.solveQueue.remove();
			dequeuedCell.searchVisisted = true;
			dequeuedCell.markVisited();

			if (dequeuedCell === this.endCell) {
				this.isSolving = false;

				//trace path backawards and add to array
				const solvePath: Cell[] = [];
				let currentCell = dequeuedCell;
				while (currentCell.solveParent) {
					solvePath.push(currentCell);
					currentCell = currentCell.solveParent;
				}

				//add starting cell back in
				solvePath.push(this.startCell);
				this.solvePath = solvePath;
				this.isSolving = false;
				this.isAnimatingSearch = true;
				return;
			}

			const neighbors = dequeuedCell.getTraversableNeighbors();
			for (let neighbor of neighbors) {
				if (neighbor && !neighbor.searchVisisted) {
					//keep track of parent cell to trace path back to start
					neighbor.solveParent = dequeuedCell;
					this.solveQueue.add(neighbor);
				}
			}
		}
	}

	animateSolve() {
		for (let i = 0; i < this.solvePathsPerFrame; i++) {
			if (this.solvePath.length === 0) {
				this.isAnimatingSearch = false;
				return;
			}

			const solvedCell = this.solvePath.pop();
			solvedCell!.addSolveAnimationToQueue();
			solvedCell!.drawCell();
		}
	}

	/* 
    Top-level animation function. 
    Recursively calls itself to generate new frames.
  */
	animate() {
		//timeline of events
		if (this.isGenerating) this.generateMaze();
		if (this.isSolving) this.solveMaze();
		if (this.isAnimatingSearch) this.animateSolve();
		if (this.isComplete) return;

		//run animation queue--runs every frame
		this.runAnimationQueue();

		//keep running count of number of frames
		this.incrementFrameCount();
		window.requestAnimationFrame(() => this.animate());
	}
}

/* 
  Exports the class as a React canvas component.
*/
export function Maze() {
	const options = {
		dimensions: 20,
	};
	const [canvas] = useAnimation(MazeAnimation, options);
	return canvas;
}

/* 
To-dos: 
Stop duplicating animation increment logic
Animate canvas reset.
Add UI
add DFS and Bi-directional search
Add mouse input for path blocks
*/
