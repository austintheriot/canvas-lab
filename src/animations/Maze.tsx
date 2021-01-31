import { Animation } from '../classes/Animation';
import { useAnimation } from '../hooks/useAnimation';
import { Stack } from 'classes/Stack';
import { arrayToRGB } from 'utils/arrayToRGB';
import { Queue } from 'classes/Queue';
interface AnyNeighbor {
  cell: Cell | null,
 direction: 'north' | 'east' | 'south' | 'west',
}

interface CellNeighbor {
  cell: Cell,
 direction: 'north' | 'east' | 'south' | 'west',
}

interface CellParams {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  maze: MazeAnimation;
  col: number;
  row: number;

  offset?: number;
  newWallColor?: Uint8ClampedArray;
  defaultWallColor?: Uint8ClampedArray;
  currentWallColor?: Uint8ClampedArray;
  solveFillColor?: Uint8ClampedArray;
  defaultFillColor?: Uint8ClampedArray;
  currentFillColor?: Uint8ClampedArray;
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
  solveVisited: boolean;
  solveParent: Cell | null;
  
  //canvas/animation properties
  ctx: CanvasRenderingContext2D;
  cellWidth: number;
  newWallColor: Uint8ClampedArray;
  defaultWallColor: Uint8ClampedArray;
  currentWallColor: Uint8ClampedArray;
  solveFillColor: Uint8ClampedArray;
  defaultFillColor: Uint8ClampedArray;
  currentFillColor: Uint8ClampedArray;
  generationIncrement: number;
  solveIncrement: number;
  
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
    this.solveVisited = false;
    this.solveParent = null;

    //drawing properties
    this.ctx = params.ctx;

    //animations
    //the more animations, the faster the generationAnimations need to end
    this.generationIncrement = this.maze.dimensions / 10;
    this.solveIncrement = 1;
    this.defaultWallColor = params.defaultWallColor ?? new Uint8ClampedArray([0, 0, 0]);
    this.newWallColor = params.newWallColor ?? new Uint8ClampedArray([25, 178, 255]);
    this.currentWallColor = params.currentWallColor ?? new Uint8ClampedArray([0, 0, 0]);
    this.defaultFillColor = params.defaultFillColor ?? new Uint8ClampedArray([255, 255, 255]);
    this.solveFillColor = params.solveFillColor ?? new Uint8ClampedArray([25, 178, 255]);
    this.currentFillColor = params.currentFillColor ?? new Uint8ClampedArray([255, 255, 255]);

    this.cellWidth = Math.floor((1000 - this.maze.padding) / this.maze.array.length); 
    const paddingRoundingeError = 1000 - (this.cellWidth * this.maze.array.length);
    this.TLC = Math.floor(this.maze.padding / 2) + paddingRoundingeError / 2 + this.col * this.cellWidth;
    this.TLR = Math.floor(this.maze.padding / 2) + paddingRoundingeError / 2 + this.row * this.cellWidth;
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
    return (this.maze.array[this.col + colOffset]
      && this.maze.array[this.col + colOffset][this.row + rowOffset])
      ?? null;
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
    return [{
      cell: this.getNorthCell(),
      direction: 'north',
    }, {
      cell: this.getEastCell(),
      direction: 'east',
    }, {
      cell: this.getSouthCell(),
      direction: 'south',
    }, {
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
    const cellNighbors = this.getAllNeighbors().filter((neighbor) => neighbor.cell !== null) as unknown as CellNeighbor[];
    const unvisitedNeighbors = cellNighbors.filter((object) => object.cell.generationVisited === false);
    return unvisitedNeighbors;
  }

  /* 
    Retrieves neighboring cells that don't have walls between them.
    Necessary in search algorithms.
  */
  getTraversableNeighbors(): Cell[] {
    const traversavleNeighbors = [];
    const northCell = this.getNorthCell();
    if (northCell && !this.northWall) traversavleNeighbors.push(northCell)
    const eastCell = this.getEastCell();
    if (eastCell && !this.eastWall) traversavleNeighbors.push(eastCell)
    const southCell = this.getSouthCell();
    if (southCell && !this.southWall) traversavleNeighbors.push(southCell)
    const westCell = this.getWestCell();
    if (westCell && !this.westWall) traversavleNeighbors.push(westCell)
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
    //increment colors back to defaults
    let done = true;
    for (let i = 0; i < this.currentWallColor.length; i++){
      if (this.currentWallColor[i] !== this.defaultWallColor[i]) {
        done = false;
        const direction = this.defaultWallColor[i] > this.currentWallColor[i]
          ? this.generationIncrement : -this.generationIncrement;
        this.currentWallColor[i] += direction;
      }
    }

    this.drawCell();
  
    //it's only "done" if the color matches the destination color
    //add back into the queue for processing again
    if (!done) this.addGenerationToQueue()
  }

  /* 
    The animation queue (called by the Maze) runs once per frame.
    The maze only animates the animations given to it.
    Each cell keeps track of its own animation 
    (When the animation is done, it stops adding
    itself back into the Animation Queue).
  */
  addGenerationToQueue() {
    //immediately turns the cell walls red
    //and draws the cell
    //then adds the animation to the queue 
    //to increment it back down to defualt color
    this.currentWallColor = this.newWallColor;
    this.drawCell();
    
    //make sure "this" is referring to the cell when its called 
    //and not referring to the maze
    this.maze.animationQueue.add(this.generationAnimation.bind(this));
  }

  /* 
    Called by the AnimationQueue.
    Fades the color of the cell to the "solved" state fill color.
    Used when the maze solution is finished.
  */
  solveAnimation() {
    //increment to the solved state fill color
    let done = true;
    for (let i = 0; i < this.currentFillColor.length; i++){
      if (this.currentFillColor[i] !== this.solveFillColor[i]) {
        done = false;
        const direction = this.solveFillColor[i] > this.currentFillColor[i]
          ? this.solveIncrement : -this.solveIncrement;
        this.currentFillColor[i] += direction;
      }
    }

    this.drawCell();

    //it's only "done" if the color matches the destination color
    //add back into the queue for processing again
    if (!done) this.addSolveAnimationToQueue()
  }

  /* 
    Adds it to the AnimationQueue for processing.
  */
  addSolveAnimationToQueue() {
    this.maze.animationQueue.add(this.solveAnimation.bind(this));
  }

}

interface MazeOptions {
  dimensions?: number;
  lineWidth?: number;
  padding?: number;
  generationsPerFrame: number;
}

export class MazeAnimation extends Animation {
  array: Cell[][];
  firstCell: Cell;
  dimensions: number;
  padding: number;
  generationsPerFrame: number;
  generationStack: Stack; 
  animationQueue: Queue;
  isGenerating: boolean;
  isSolving: boolean;

	constructor(canvas: HTMLCanvasElement, options: MazeOptions) {
    super(canvas);
    //how many cells to generate per frame--default to 5, but not less than 1
    this.generationsPerFrame = Math.max(options.generationsPerFrame ?? 5, 1);
    this.ctx.lineWidth = Math.floor(options?.lineWidth ?? 2); //width of maze walls
    this.dimensions = Math.max(options.dimensions ?? 10, 1); //default to 10, but never less than 1
    this.padding = Math.floor(options.padding ?? 4); // slightly offset so wall lines aren't cut off
    this.generationStack = new Stack(); //used to generate the maze
    this.animationQueue = new Queue(); //used for processing necessary animations

    //which portion of the animation is complete
    this.isGenerating = true;
    this.isSolving = true;

    //make canvas background white 
    this.ctx.fillStyle = 'white';
    this.ctx.fillRect(0, 0, 1000, 1000);
    
    //build array of cells--fill them with info about their position in the array
    this.array = new Array(this.dimensions).fill(null);
    for (let col = 0; col < this.array.length; col++){
      this.array[col] = new Array(this.dimensions).fill(null);
      const innerArray = this.array[col];
      for (let row = 0; row < innerArray.length; row++){
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

    //initialize the generationStack with a random first cell
    const randomCol = Math.floor(Math.random() * this.array.length);
    const randomRow = Math.floor(Math.random() * this.array[0].length);
    this.firstCell = this.array[randomCol][randomRow];
    this.generationStack.push(this.firstCell);
    this.firstCell.generationVisited = true;
	}
  
  /* 
    Uses a randomized depth-first-search to generate the maze.
  */
  generateMaze() {
    if (!this.generationStack.isEmpty()) {
      const currentCell: Cell = this.generationStack.pop();
      const unvisitedNeighbors = currentCell.getUnvisitedNeighbbors()
      if (unvisitedNeighbors.length > 0) {
        this.generationStack.push(currentCell);
        //pick a random neighbor from surrounding neighbors
        const neighbor = unvisitedNeighbors[Math.floor(Math.random() * unvisitedNeighbors.length)];
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
        currentCell.addGenerationToQueue()
        neighbor.cell.addGenerationToQueue();
      }
    } else {
      //if stack is empty, stop trying to generate new cells
      this.isGenerating = false;
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
    const queueLength = this.animationQueue.size()
    for (let i = 0; i < queueLength; i++){
      const animation: () => void = this.animationQueue.remove();
      animation();
    }
  }

  /* 
    Breadth-first search maze solve.
  */
  solveMaze(): Cell[] {
    //starting cell is the top left cell
    const startCell = this.array[0][0];
    //ending cell is the bottom right cell
    const endCell = this.array[this.array.length - 1][this.array.length - 1];
    const solveQueue = new Queue();
    solveQueue.add(startCell);

    while (!solveQueue.isEmpty()) {
      const dequeuedCell: Cell = solveQueue.remove();
      dequeuedCell.solveVisited = true;

      if (dequeuedCell === endCell) {
        this.isSolving = false;

        //trace path backawards and add to array
        const solvePath: Cell[] = [];
        let currentCell = dequeuedCell;
        while (currentCell.solveParent) {
          solvePath.push(currentCell);
          currentCell = currentCell.solveParent;
        }

        //add starting cell back in
        solvePath.push(startCell);
        return solvePath;
      }

      const neighbors = dequeuedCell.getTraversableNeighbors();
      for (let neighbor of neighbors) {
        if (neighbor && !neighbor.solveVisited) {
          neighbor.solveVisited = true;

          //keep track of parent cell to trace path back to start
          neighbor.solveParent = dequeuedCell;
          solveQueue.add(neighbor);
        }
      }
    }

    /* 
      This should never run--every maze should be a fully connected graph,
      so there should always be a solution.

      BUT: just in case, return an empty array for consistency.
    */
    console.log('No solution found...');
    return [];
  }

  /* 
    Top-level animation function. 
    Recursively calls itself to generate new frames.
  */
  animate() {
    //generate maze--runs first
    if (this.isGenerating) {
      for (let i = 0; i < this.generationsPerFrame; i++){
        this.generateMaze();
      }
    }
    
    //solve maze--runs second
    if (!this.isGenerating && this.isSolving) {
      const solvePath = this.solveMaze()
      solvePath.forEach((cell) => {
        cell.addSolveAnimationToQueue();
        cell.drawCell();
      })
    }

    //run animation queue--runs every frame
    this.runAnimationQueue();

		window.requestAnimationFrame(() => this.animate());
	}
}

/* 
  Exports the class as a React canvas component.
*/
export function Maze() {
  const options = {
    dimensions: 25,
    generationsPerFrame: 5,
  }
	const [canvas] = useAnimation(MazeAnimation, options);
  return canvas;
}
