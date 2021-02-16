import { Animation } from '../Animation';
import { Stack } from 'data structures/Stack';
import { Queue } from 'data structures/Queue';
import { Tile } from './Tile';

export interface GridOptions {
	[key: string]: any;
	dimensions?: string;
	lineWidth?: string;
	padding?: string;
	generationsPerFrame?: string;
	searchesPerFrame?: string;
	solvePathsPerFrame?: string;
	waiting?: boolean;
}

export class GridAnimation extends Animation {
	array: Tile[][];
	firstTile: Tile;
	dimensions: number;
	padding: number;
	state: 'waiting' | 'searching' | 'solving' | 'complete';
	generationsPerFrame: number;
	searchesPerFrame: number;
	solvePathsPerFrame: number;
	frameCount: number;
	generationStack: Stack<Tile>;
	animationQueue: Queue<() => void>;
	searchQueue: Queue<Tile>;
	searchStack: Stack<Tile>;
	startTile: Tile;
	endTile: Tile;
	solvePath: Tile[];
	isWaitingForAnimation: boolean;
	mouse: Uint8Array;
	isMouseDown: boolean;
	solved: boolean;

	constructor(canvas: HTMLCanvasElement, options: GridOptions = {}) {
		super(canvas);
		this.mouse = new Uint8Array([0, 0]);
		this.isMouseDown = false;
		this.ctx.lineWidth = Math.floor(Number(options?.lineWidth ?? 2)); //width of grid walls
		this.dimensions = Math.max(Number(options.dimensions ?? 10), 1); //default to 10, but never less than 1
		this.padding = Math.floor(Number(options.padding ?? 4)); // slightly offset so wall lines aren't cut off
		this.generationStack = new Stack(); //used to generate the grid
		this.animationQueue = new Queue(); //used for processing necessary animations
		this.searchQueue = new Queue();
		this.searchStack = new Stack();
		this.solvePath = [];
		this.solved = false;
		this.frameCount = 0;

		//which portion of the animation is complete
		this.state = 'waiting';
		this.isWaitingForAnimation = false;

		//make canvas background white
		this.ctx.fillStyle = 'white';
		this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

		//build array of tiles--fill them with info about their position in the array
		this.array = new Array(this.dimensions).fill(null);
		for (let col = 0; col < this.array.length; col++) {
			this.array[col] = new Array(this.dimensions).fill(null);
			const innerArray = this.array[col];
			for (let row = 0; row < innerArray.length; row++) {
				innerArray[row] = new Tile({
					canvas: this.canvas,
					ctx: this.ctx,
					grid: this,
					row,
					col,
				});
				//draw grid at initialization
				innerArray[row].drawTile();
			}
		}

		//make entrance the top left tile & exit the bottom right tile
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

		//initialize the generationStack with a random first tile
		const randomCol = Math.floor(Math.random() * this.array.length);
		const randomRow = Math.floor(Math.random() * this.array[0].length);
		this.firstTile = this.array[randomCol][randomRow];
		this.generationStack.push(this.firstTile);
		this.firstTile.generationVisited = true;

		/* 
    Initialze searchQueue for bfs later.
    Starting tile is the top left tile.
    Ending tile is the bottom right tile.
    Even though the tiles do not yet have their end state
    values (walls, etc.), they are reference values, 
    so by the time we get around to solving the grid,
    they will be ready.
    */
		this.startTile = this.array[0][0];
		this.searchQueue.add(this.startTile);
		this.searchStack.push(this.startTile);
		this.endTile = this.array[this.array.length - 1][this.array.length - 1];
	}

	onMouseMove(x: number, y: number) {
		//[col, row]
		this.mouse = new Uint8Array([
			Math.floor((x / this.canvas.offsetWidth) * this.dimensions),
			Math.floor((y / this.canvas.offsetHeight) * this.dimensions),
		]);

		if (this.isMouseDown) this.makeWall(this.mouse);
	}

	onMouseDown(boolean: boolean) {
		this.isMouseDown = boolean;
		if (this.isMouseDown) this.makeWall(this.mouse);
	}

	onSolve() {
		this.state = 'searching';
	}

	makeWall(coords: Uint8Array) {
		const tile: Tile | undefined =
			this.array[coords[0]] && this.array[coords[0]][coords[1]];
		if (tile) {
			tile.currentFillColor = new Uint8ClampedArray([0, 0, 0]);
			tile.drawTile();
		}
	}

	/* 
    Calculates the ideal number of function calls per second based on the size 
    of the grid array. More tiles = faster defaults. 
    Use whatever is provided in the options by default, but do not accept a 
    number less than one.
    If no options are provided, calculate speed based on the size of the array
    and multiply that number based on the custom gain.
  */
	calculateCallsPerFrame(
		options: GridOptions,
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
    Uses a randomized depth-first-search to generate the grid.
  */
	generate() {
		for (let i = 0; i < this.generationsPerFrame; i++) {
			//if stack is empty, stop trying to generate new tiles
			if (this.generationStack.isEmpty()) {
				this.state = 'searching';
				this.isWaitingForAnimation = true;
				return;
			}

			//if stack is not empty, generate new tiles
			const currentTile = this.generationStack.pop();
			if (!currentTile) return;
			const unvisitedNeighbors = currentTile.getUnvisitedNeighbbors();
			if (unvisitedNeighbors.length > 0) {
				this.generationStack.push(currentTile);
				//pick a random neighbor from surrounding neighbors
				const neighbor =
					unvisitedNeighbors[
						Math.floor(Math.random() * unvisitedNeighbors.length)
					];
				if (!neighbor || !neighbor.tile) return;
				//neighbor.direciton is the direction you have to go
				//to get to the neighbor from the current tile
				//that was just popped off of the generationStack
				if (neighbor.direction === 'north') {
					currentTile.northWall = false;
					neighbor.tile.southWall = false;
				} else if (neighbor.direction === 'east') {
					currentTile.eastWall = false;
					neighbor.tile.westWall = false;
				} else if (neighbor.direction === 'south') {
					currentTile.southWall = false;
					neighbor.tile.northWall = false;
				} else if (neighbor.direction === 'west') {
					currentTile.westWall = false;
					neighbor.tile.eastWall = false;
				}

				neighbor.tile.generationVisited = true;
				this.generationStack.push(neighbor.tile);

				/* 
            Must draw both tiles to prevent visual glitches.
            In general, I've tried to avoid drawing every tile 
            every frame because of the heavy load that it incurs
            on larger grids (and thus slower frame rates).
          */
				currentTile.drawTile();
				neighbor.tile.drawTile();

				//begin generationAnimation process for the new tiles
				currentTile.addGenerationToQueue();
				neighbor.tile.addGenerationToQueue();
			}
		}
	}

	/* 
    Search the grid using breadth first search.
  */
	bfs() {
		// if (this.searchQueue.isEmpty() && !this.solved) {
		// 	this.solved = true;
		// 	alert('No solution found!');
		// 	return;
		// } else
		if (this.solved || this.searchQueue.isEmpty() || this.isWaitingForAnimation)
			return;
		console.log(this.searchQueue.size());
		for (let i = 0; i < this.searchesPerFrame; i++) {
			/* 
				If the solve Queue is empty, don't try to solve.
			  Also wait for animation to finish to prevent visual glitch
				where the first search tile is drawn before the generation
				aniamtion is finished.
			*/

			//else if queue is not empty, continue solving
			const dequeuedTile = this.searchQueue.remove();
			if (!dequeuedTile || dequeuedTile.searchVisited) return;
			dequeuedTile.searchVisited = true;
			dequeuedTile.addSearchAnimationToQueue();

			if (dequeuedTile === this.endTile) {
				this.state = 'solving';
				this.isWaitingForAnimation = true;

				//trace path backawards and add to array
				const solvePath: Tile[] = [];
				let currentTile = dequeuedTile;
				while (currentTile.solveParent) {
					solvePath.push(currentTile);
					currentTile = currentTile.solveParent;
				}

				//add starting tile back in
				solvePath.push(this.startTile);
				//track backwards for cool effect
				this.solvePath = solvePath.reverse();
				return;
			}

			const neighbors = dequeuedTile.getTraversableNeighbors();
			for (let neighbor of neighbors) {
				if (neighbor && !neighbor.searchVisited) {
					//keep track of parent tile to trace path back to start
					neighbor.solveParent = dequeuedTile;
					neighbor.currentFillColor = neighbor.initialSearchFillColor;
					this.searchQueue.add(neighbor);
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

			const solvedTile = this.solvePath.pop();
			if (solvedTile) solvedTile.addSolveAnimationToQueue();

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
		Should be a direct copy of the class constructor function.
	*/
	reset(options: GridOptions) {}

	/* 
    Top-level animation function. 
    Recursively calls itself to generate new frames.
  */
	animate() {
		/* 
			After each phase of the grid generation/solve,
			the animation queue runs until all animations
			of that phase have been fully completed.
		*/
		if (!this.isWaitingForAnimation) {
			/*
				Timeline of major grid events:
					1) Generating
					2) Searching
					3) Solving
			*/
			// if (this.state === 'generating') this.generate();
			if (this.state === 'searching') {
				this.bfs();
			}
			if (this.state === 'solving') this.solve();
			// if (this.state === 'complete') {}
		}

		//run animation queue--runs every frame
		this.runAnimationQueue();

		window.requestAnimationFrame(() => this.animate());
	}
}
