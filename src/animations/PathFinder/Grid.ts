import { Animation } from '../Animation';
import { Stack } from 'data structures/Stack';
import { Queue } from 'data structures/Queue';
import { Tile } from './Tile';
import { bfs, dfs, biBfs } from './solves';

export interface GridOptions {
	[key: string]: any;
	dimensions?: string;
	lineWidth?: string;
	padding?: string;
	generationsPerFrame?: string;
	searchesPerFrame?: string;
	solvePathsPerFrame?: string;
	waiting?: boolean;
	searchType?: 'bfs' | 'dfs' | 'biBfs';
}

export class GridAnimation extends Animation {
	array!: Tile[][];
	firstTile!: Tile;
	dimensions!: number;
	padding!: number;
	state!: 'waiting' | 'searching' | 'solving' | 'complete';
	generationsPerFrame!: number;
	searchesPerFrame!: number;
	solvePathsPerFrame!: number;
	frameCount!: number;
	generationStack!: Stack<Tile>;
	animationQueue!: Queue<() => void>;
	searchQueue1!: Queue<Tile>;
	searchQueue2!: Queue<Tile>;
	searchStack1!: Stack<Tile>;
	searchStack2!: Stack<Tile>;
	startTile!: Tile;
	endTile!: Tile;
	solvePath!: Tile[];
	isWaitingForAnimation!: boolean;
	mouse!: Uint8Array;
	isMouseDown!: boolean;
	solved!: boolean;
	searchType!: 'bfs' | 'dfs' | 'biBfs';

	constructor(canvas: HTMLCanvasElement, options: GridOptions = {}) {
		super(canvas);
		this.init(options);
	}

	/* 
		In a separate function to facilitate resetting the Grid's state.
	*/
	init(options: GridOptions) {
		this.mouse = new Uint8Array([0, 0]);
		this.isMouseDown = false;
		this.ctx.lineWidth = Math.floor(Number(options?.lineWidth ?? 2)); //width of grid walls
		this.dimensions = Math.max(Number(options.dimensions ?? 10), 1); //default to 10, but never less than 1
		this.padding = Math.floor(Number(options.padding ?? 4)); // slightly offset so wall lines aren't cut off
		this.generationStack = new Stack(); //used to generate the grid
		this.animationQueue = new Queue(); //used for processing necessary animations
		this.searchQueue1 = new Queue();
		this.searchQueue2 = new Queue();
		this.searchType = options?.searchType ?? 'bfs';
		this.searchStack1 = new Stack<Tile>();
		this.searchStack2 = new Stack<Tile>();
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
    Initialze searchQueue1 for bfs later.
    Starting tile is the top left tile.
    Ending tile is the bottom right tile.
    Even though the tiles do not yet have their end state
    values (walls, etc.), they are reference values, 
    so by the time we get around to solving the grid,
    they will be ready.
    */
		this.startTile = this.array[0][0];
		this.endTile = this.array[this.array.length - 1][this.array.length - 1];
		this.searchQueue1.add(this.startTile);
		this.searchQueue2.add(this.endTile);
		this.searchStack1.push(this.startTile);
		this.searchStack2.push(this.endTile);
	}

	onMouseMove(x: number, y: number) {
		//[col, row]
		this.mouse = new Uint8Array([
			Math.floor((x / this.canvas.offsetWidth) * this.dimensions),
			Math.floor((y / this.canvas.offsetHeight) * this.dimensions),
		]);

		if (this.isMouseDown) this.toggleWall(this.mouse);
	}

	onMouseDown(boolean: boolean) {
		this.isMouseDown = boolean;
		//on mouse down
		if (this.isMouseDown) {
			this.toggleWall(this.mouse);
		}
		// on mouse up
		else {
			this.array.forEach((outter) => {
				outter.forEach((tile) => {
					tile.isNewlyPlaced = false;
				});
			});
		}
	}

	onSolve() {
		this.state = 'searching';
	}

	toggleWall(coords: Uint8Array) {
		// do not allow entrance and exit to be blocked
		if (
			(coords[0] === 0 && coords[1] === 0) ||
			(coords[0] === this.array.length - 1 &&
				coords[1] === this.array.length - 1)
		) {
			return;
		}

		const tile: Tile | undefined =
			this.array[coords[0]] && this.array[coords[0]][coords[1]];

		//only toggle if the tile has not just been placed
		if (!tile || tile?.isNewlyPlaced) return;

		//toggle tile type
		if (tile.type === 'wall') {
			tile.type = 'open';
			tile.currentFillColor = tile.defaultOpenFillColor;
			tile.isNewlyPlaced = true;
			tile.drawTile();
		} else if (tile.type === 'open') {
			tile.type = 'wall';
			tile.currentFillColor = tile.defaultWallFillColor;
			tile.isNewlyPlaced = true;
			tile.drawTile();
		}
	}

	onSearchSelection(searchType: 'dfs' | 'bfs' | 'biBfs') {
		this.searchType = searchType;
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
		const queueLength = this.animationQueue.size;
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
			// if (this.state === 'generating') this.generate();
			if (this.state === 'searching') {
				if (this.searchType === 'bfs') bfs.call(this);
				else if (this.searchType === 'dfs') dfs.call(this);
				else if (this.searchType === 'biBfs') biBfs.call(this);
			}
			if (this.state === 'solving') this.solve();
			// if (this.state === 'complete') {}
		}

		//run animation queue--runs every frame
		this.runAnimationQueue();

		window.requestAnimationFrame(() => this.animate());
	}
}
