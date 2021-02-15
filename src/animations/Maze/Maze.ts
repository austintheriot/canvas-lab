import { Animation } from '../Animation';
import { Stack } from 'data structures/Stack';
import { Queue } from 'data structures/Queue';
import { Cell } from './Cell';

export interface MazeOptions {
	[key: string]: any;
	dimensions?: string;
	lineWidth?: string;
	padding?: string;
	generationsPerFrame?: string;
	searchesPerFrame?: string;
	solvePathsPerFrame?: string;
	waiting?: boolean;
}

export class MazeAnimation extends Animation {
	array: Cell[][];
	firstCell: Cell;
	dimensions: number;
	padding: number;
	state: 'generating' | 'searching' | 'solving' | 'complete';
	generationsPerFrame: number;
	searchesPerFrame: number;
	solvePathsPerFrame: number;
	frameCount: number;
	generationStack: Stack<Cell>;
	animationQueue: Queue<() => void>;
	searchQueue: Queue<Cell>;
	searchStack: Stack<Cell>;
	startCell: Cell;
	endCell: Cell;
	solvePath: Cell[];
	isWaitingForAnimation: boolean;
	searchType: 'bfs' | 'dfs';

	constructor(canvas: HTMLCanvasElement, options: MazeOptions = {}) {
		super(canvas);
		this.ctx.lineWidth = Math.floor(Number(options?.lineWidth ?? 2)); //width of maze walls
		this.dimensions = Math.max(Number(options.dimensions ?? 10), 1); //default to 10, but never less than 1
		this.padding = Math.floor(Number(options.padding ?? 4)); // slightly offset so wall lines aren't cut off
		this.generationStack = new Stack(); //used to generate the maze
		this.animationQueue = new Queue(); //used for processing necessary animations
		this.searchQueue = new Queue();
		this.searchStack = new Stack();
		this.searchType = 'dfs';
		this.solvePath = [];
		this.frameCount = 0;

		//which portion of the animation is complete
		this.state = 'generating';
		this.isWaitingForAnimation = false;

		//make canvas background white
		this.ctx.fillStyle = 'white';
		this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

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
    Initialze searchQueue for bfs later.
    Starting cell is the top left cell.
    Ending cell is the bottom right cell.
    Even though the cells do not yet have their end state
    values (walls, etc.), they are reference values, 
    so by the time we get around to solving the maze,
    they will be ready.
    */
		this.startCell = this.array[0][0];
		this.searchQueue.add(this.startCell);
		this.searchStack.push(this.startCell);
		this.endCell = this.array[this.array.length - 1][this.array.length - 1];
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

	/* 
    Uses a randomized depth-first-search to generate the maze.
  */
	generate() {
		for (let i = 0; i < this.generationsPerFrame; i++) {
			//if stack is empty, stop trying to generate new cells
			if (this.generationStack.isEmpty()) {
				this.state = 'searching';
				this.isWaitingForAnimation = true;
				return;
			}

			//if stack is not empty, generate new cells
			const currentCell = this.generationStack.pop();
			if (!currentCell) return;
			const unvisitedNeighbors = currentCell.getUnvisitedNeighbbors();
			if (unvisitedNeighbors.length > 0) {
				this.generationStack.push(currentCell);
				//pick a random neighbor from surrounding neighbors
				const neighbor =
					unvisitedNeighbors[
						Math.floor(Math.random() * unvisitedNeighbors.length)
					];
				if (!neighbor || !neighbor.cell) return;
				//neighbor.direciton is the direction you have to go
				//to get to the neighbor from the current cell
				//that was just popped off of the generationStack
				if (neighbor.direction === 'north') {
					currentCell.northWall = false;
					neighbor.cell.southWall = false;
				} else if (neighbor.direction === 'east') {
					currentCell.eastWall = false;
					neighbor.cell.westWall = false;
				} else if (neighbor.direction === 'south') {
					currentCell.southWall = false;
					neighbor.cell.northWall = false;
				} else if (neighbor.direction === 'west') {
					currentCell.westWall = false;
					neighbor.cell.eastWall = false;
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
    Search the maze using breadth first search.
  */
	bfs() {
		for (let i = 0; i < this.searchesPerFrame; i++) {
			/* 
				If the solve Queue is empty, don't try to solve.
			  Also wait for animation to finish to prevent visual glitch
				where the first search cell is drawn before the generation
				aniamtion is finished.
			*/
			if (this.searchQueue.isEmpty() || this.isWaitingForAnimation) return;

			//else if queue is not empty, continue solving
			const dequeuedCell = this.searchQueue.remove();
			if (!dequeuedCell) return;
			dequeuedCell.searchVisisted = true;
			dequeuedCell.markVisited();

			if (dequeuedCell === this.endCell) {
				this.state = 'solving';
				this.isWaitingForAnimation = true;

				//trace path backawards and add to array
				const solvePath: Cell[] = [];
				let currentCell = dequeuedCell;
				while (currentCell.solveParent) {
					solvePath.push(currentCell);
					currentCell = currentCell.solveParent;
				}

				//add starting cell back in
				solvePath.push(this.startCell);
				//track backwards for cool effect
				this.solvePath = solvePath.reverse();
				return;
			}

			const neighbors = dequeuedCell.getTraversableNeighbors();
			for (let neighbor of neighbors) {
				if (neighbor && !neighbor.searchVisisted) {
					//keep track of parent cell to trace path back to start
					neighbor.solveParent = dequeuedCell;
					neighbor.currentFillColor = neighbor.initialSearchFillColor;
					this.searchQueue.add(neighbor);
				}
			}
		}
	}

	/* 
		Search the maze using depth first search.
	*/
	dfs() {
		for (let i = 0; i < this.searchesPerFrame; i++) {
			/* 
			If the solve Queue is empty, don't try to solve.
			Also wait for animation to finish to prevent visual glitch
			where the first search cell is drawn before the generation
			aniamtion is finished.
		*/
			if (this.searchStack.isEmpty() || this.isWaitingForAnimation) return;

			//else if queue is not empty, continue solving
			const dequeuedCell = this.searchStack.pop();
			if (!dequeuedCell) return;
			dequeuedCell.searchVisisted = true;
			dequeuedCell.markVisited();

			if (dequeuedCell === this.endCell) {
				this.state = 'solving';
				this.isWaitingForAnimation = true;

				//trace path backawards and add to array
				const solvePath: Cell[] = [];
				let currentCell = dequeuedCell;
				while (currentCell.solveParent) {
					solvePath.push(currentCell);
					currentCell = currentCell.solveParent;
				}

				//add starting cell back in
				solvePath.push(this.startCell);
				//track backwards for cool effect
				this.solvePath = solvePath.reverse();
				return;
			}

			const neighbors = dequeuedCell.getTraversableNeighbors();
			for (let neighbor of neighbors) {
				if (neighbor && !neighbor.searchVisisted) {
					//keep track of parent cell to trace path back to start
					neighbor.solveParent = dequeuedCell;
					neighbor.currentFillColor = neighbor.initialSearchFillColor;
					this.searchStack.push(neighbor);
				}
			}
		}
	}

	solve() {
		if (this.isWaitingForAnimation) return;
		for (let i = 0; i < this.solvePathsPerFrame; i++) {
			if (this.solvePath.length === 0) {
				this.state = 'complete';
				return;
			}

			const solvedCell = this.solvePath.pop();
			if (solvedCell) solvedCell.addSolveAnimationToQueue();

			//must check at the end of function
			//to prevent solve animation ending prematurely
			if (this.solvePath.length === 0) {
				this.isWaitingForAnimation = true;
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
			const animation = this.animationQueue.remove();
			if (animation) animation();
		}

		if (this.isWaitingForAnimation && this.animationQueue.isEmpty()) {
			this.isWaitingForAnimation = false;
		}
	}

	/* 
		A direct copy of the class constructor function.
	*/
	reset(options: MazeOptions) {
		this.ctx.lineWidth = Math.floor(Number(options?.lineWidth ?? 2));
		this.dimensions = Math.max(Number(options.dimensions ?? 10), 1);
		this.padding = Math.floor(Number(options.padding ?? 4));
		this.generationStack = new Stack();
		this.animationQueue = new Queue();
		this.searchQueue = new Queue();
		this.searchStack = new Stack();
		this.searchType = 'dfs';
		this.solvePath = [];
		this.frameCount = 0;
		this.state = 'generating';
		this.isWaitingForAnimation = false;
		this.ctx.fillStyle = 'white';
		this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
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
		this.array[0][0].northWall = false;
		this.array[this.array.length - 1][this.array.length - 1].southWall = false;
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
		const randomCol = Math.floor(Math.random() * this.array.length);
		const randomRow = Math.floor(Math.random() * this.array[0].length);
		this.firstCell = this.array[randomCol][randomRow];
		this.generationStack.push(this.firstCell);
		this.firstCell.generationVisited = true;
		this.startCell = this.array[0][0];
		this.searchQueue.add(this.startCell);
		this.searchStack.push(this.startCell);
		this.endCell = this.array[this.array.length - 1][this.array.length - 1];
	}

	/* 
    Top-level animation function. 
    Recursively calls itself to generate new frames.
  */
	animate() {
		/* 
			After each phase of the maze generation/solve,
			the animation queue runs until all animations
			of that phase have been fully completed.
		*/
		if (!this.isWaitingForAnimation) {
			/* 
				Timeline of major maze events: 
					1) Generating
					2) Searching
					3) Solving
			*/
			if (this.state === 'generating') this.generate();
			if (this.state === 'searching') {
				if (this.searchType === 'dfs') {
					this.dfs();
				} else {
					this.bfs();
				}
			}
			if (this.state === 'solving') this.solve();
			// if (this.state === 'complete') {}
		}

		//run animation queue--runs every frame
		this.runAnimationQueue();

		window.requestAnimationFrame(() => this.animate());
	}
}
