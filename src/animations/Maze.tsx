import { Animation } from '../classes/Animation';
import { useAnimation } from '../hooks/useAnimation';
import { Stack } from 'classes/Stack';
import { arrayToRGB } from 'functions/arrayToRGB';
import { Queue } from 'classes/Queue';

// create maze data structure
// display maze

//use 2d array, each element keeps track of the index of its N, E, S, and W neighbors
//use a literal graph, in which element links directly to its NESW nodes
//getN, getE, getS, getW
//build 

interface AnyNeighbor {
  cell: Cell | null,
 direction: 'north' | 'east' | 'south' | 'west',
}

interface CellNeighbor {
  cell: Cell,
 direction: 'north' | 'east' | 'south' | 'west',
}

interface CellOptions {
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

  generationVisited: boolean;
  solveVisited: boolean;
  solveParent: Cell | null;
  
  //canvas properties
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
  TLC: number; //top left col
  TLR: number; //top left row
  TRC: number; //etc
  TRR: number;
  BRC: number; 
  BRR: number; 
  BLC: number;
  BLR: number;


  constructor(ctx: CanvasRenderingContext2D, options: CellOptions) {
    //maze properties
    this.maze = options.maze;
    this.col = options.col;
    this.row = options.row;
    this.northWall = true;
    this.eastWall = true;
    this.southWall = true;
    this.westWall = true;

    this.generationVisited = false;
    this.solveVisited = false;
    this.solveParent = null;

    //drawing properties
    this.ctx = ctx;

    //animations
    this.generationIncrement = 10;
    this.solveIncrement = 1;
    this.defaultWallColor = options.defaultWallColor ?? new Uint8ClampedArray([0, 0, 0]);
    this.newWallColor = options.newWallColor ?? new Uint8ClampedArray([25, 178, 255]);
    this.currentWallColor = options.currentWallColor ?? new Uint8ClampedArray([0, 0, 0]);
    this.defaultFillColor = options.defaultFillColor ?? new Uint8ClampedArray([255, 255, 255]);
    this.solveFillColor = options.solveFillColor ?? new Uint8ClampedArray([25, 178, 255]);
    this.currentFillColor = options.currentFillColor ?? new Uint8ClampedArray([255, 255, 255]);

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

  getNode(colOffset: number, rowOffset: number): Cell | null {
    return (this.maze.array[this.col + colOffset]
      && this.maze.array[this.col + colOffset][this.row + rowOffset])
      ?? null;
  }
  getNorthCell(): Cell | null {
    return this.getNode(0, -1);
  }
  getEastCell(): Cell | null {
    return this.getNode(1, 0);
  }

  getSouthCell(): Cell | null {
    return this.getNode(0, 1);
  }
  getWestCell(): Cell | null {
    return this.getNode(-1, 0);
  }

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

  getUnvisitedNeighbbors(): CellNeighbor[] {
    const cellNighbors = this.getAllNeighbors().filter((neighbor) => neighbor.cell !== null) as unknown as CellNeighbor[];
    const unvisitedNeighbors = cellNighbors.filter((object) => object.cell.generationVisited === false);
    return unvisitedNeighbors;
  }

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

  generationAnimation() {
    let done = true;
    for (let i = 0; i < this.currentWallColor.length; i++){
      if (this.currentWallColor[i] !== this.defaultWallColor[i]) {
        done = false;
        const direction = this.defaultWallColor[i] > this.currentWallColor[i] ? this.generationIncrement : -this.generationIncrement;
        //move color in direction of the destination
        this.currentWallColor[i] += direction;
      }
    }
    this.drawCell();
    //animate again
    if (!done) this.addGenerationToQueue()
  }

  //the animation queue runs once per frame
  //the maze only animates the animations given to it
  //each cell keeps track of its own animation 
  //(When the animation is done, it stops adding
  //itself back into the queue).
  addGenerationToQueue() {
    //draw immediately red, then incremenent back down
    this.currentWallColor = this.newWallColor;
    this.drawCell();
    this.maze.animationQueue.add(this.generationAnimation.bind(this));
  }

  solveAnimation() {
    let done = true;
    for (let i = 0; i < this.currentFillColor.length; i++){
      if (this.currentFillColor[i] !== this.solveFillColor[i]) {
        done = false;
        const direction = this.solveFillColor[i] > this.currentFillColor[i] ? this.solveIncrement : -this.solveIncrement;
        //move color in direction of the destination
        this.currentFillColor[i] += direction;
      }
    }
    this.drawCell();
    //animate again
    if (!done) this.addSolveAnimationToQueue()
  }

  addSolveAnimationToQueue() {
    this.maze.animationQueue.add(this.solveAnimation.bind(this));
  }

}

interface MazeOptions {
  dimensions?: number;
  lineWidth?: number;
  padding?: number;
  visitsPerFrame: number;
}

export class MazeAnimation extends Animation {
  array: Cell[][];
  generationStack: Stack;
  firstCell: Cell;
  dimensions: number;
  padding: number;
  visitsPerFrame: number;
  animationQueue: Queue;

  generationDone: boolean;
  solveDone: boolean;

	constructor(canvas: HTMLCanvasElement, options: MazeOptions) {
    super(canvas);
    this.visitsPerFrame = options.visitsPerFrame ?? 10;
    this.ctx.lineWidth = Math.floor(options?.lineWidth ?? 2);
    this.dimensions = Math.max(options.dimensions ?? 10, 1); //default to 10, but never less than 1
    this.padding = Math.floor(options.padding ?? 4); // slightly offset so wall lines aren't cut off
    this.generationStack = new Stack();
    this.animationQueue = new Queue();

    this.generationDone = false;
    this.solveDone = false;

    //make canvas background white 
    this.ctx.fillStyle = 'white';
    this.ctx.fillRect(0, 0, 1000, 1000);
    
    //build array of cells
    this.array = new Array(this.dimensions).fill(null);
    for (let col = 0; col < this.array.length; col++){
      this.array[col] = new Array(this.dimensions).fill(null);
      const innerArray = this.array[col];
      for (let row = 0; row < innerArray.length; row++){
        innerArray[row] = new Cell(this.ctx, {
          maze: this,
          row,
          col,
        });
      }
    }

    //make entrance top left & bottom right
    this.array[0][0].northWall = false;
    this.array[this.array.length - 1][this.array.length - 1].southWall = false;

    const randomCol = Math.floor(Math.random() * this.array.length);
    const randomRow = Math.floor(Math.random() * this.array[0].length);
    this.firstCell = this.array[randomCol][randomRow];

    //initialize generationStack
    this.generationStack.push(this.firstCell);
    this.firstCell.generationVisited = true;
	}
  
  generateMaze() {
    if (!this.generationStack.isEmpty()) {
      const currentCell: Cell = this.generationStack.pop();
      const unvisitedNeighbors = currentCell.getUnvisitedNeighbbors()
      if (unvisitedNeighbors.length > 0) {
        this.generationStack.push(currentCell);
        const neighbor = unvisitedNeighbors[Math.floor(Math.random() * unvisitedNeighbors.length)];
        if (!neighbor) return;
        // this is the new cell's direction in reference to the 
        // cell that was just popped off of the generationStack
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
        //draw cell
        currentCell.drawCell();
        neighbor.cell.drawCell();

        //begin animation process
        currentCell.addGenerationToQueue()
        neighbor.cell.addGenerationToQueue();

        neighbor.cell.generationVisited = true;
        this.generationStack.push(neighbor.cell);
      }
    } else {
      this.generationDone = true;
    }
  }

  runAnimationQueue() {
    const queueLength = this.animationQueue.size()
    for (let i = 0; i < queueLength; i++){
      const animation: () => void = this.animationQueue.remove();
      animation();
    }
  }

  solveMaze(): Cell[] {
    const startCell = this.array[0][0];
    const endCell = this.array[this.array.length - 1][this.array.length - 1];
    const solveQueue = new Queue();
    solveQueue.add(startCell);

    while (!solveQueue.isEmpty()) {
      const dequeuedCell: Cell = solveQueue.remove();
      dequeuedCell.solveVisited = true;

      if (dequeuedCell === endCell) {
        this.solveDone = true;

        //trace path backawards
        const solvePath: Cell[] = [];
        let currentCell = dequeuedCell;
        while (currentCell.solveParent) {
          solvePath.push(currentCell);
          currentCell = currentCell.solveParent;
        }
        //add starting cell in
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

    console.log('No solution found...');
    return [];
  }

  animate() {
    //generate maze
    if (!this.generationDone) {
      for (let i = 0; i < this.visitsPerFrame; i++){
        this.generateMaze();
      }
    }
    
    //solve maze
    if (this.generationDone && !this.solveDone) {
      const solvePath = this.solveMaze()
      solvePath.forEach((cell) => {
        cell.addSolveAnimationToQueue();
        cell.drawCell();
      })
    }

    //run animation queue
    this.runAnimationQueue();

		window.requestAnimationFrame(() => this.animate());
	}
}

export function Maze() {
  const options = {
    dimensions: 100,
    visitsPerFrame: 100,
  }
	const [canvas] = useAnimation(MazeAnimation, options);
  return canvas;
}
