import { Animation } from '../classes/Animation';
import { useAnimation } from '../hooks/useAnimation';
import { Stack } from 'classes/Stack';
import { arrayToRGB } from 'functions/arrayToRGB';

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
  colorArray?: Uint8ClampedArray;
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
  visited: boolean;
  
  //canvas properties
  ctx: CanvasRenderingContext2D;
  cellWidth: number;
  colorArray: Uint8ClampedArray;
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
    this.visited = false;

    //drawing properties
    this.ctx = ctx;
    this.colorArray =  options.colorArray ?? new Uint8ClampedArray([0, 0, 0]);
    this.cellWidth = Math.floor((500 - this.maze.padding) / this.maze.array.length); 
    const paddingRoundingeError = 500 - (this.cellWidth * this.maze.array.length);
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
  getNorthNode(): Cell | null {
    return this.getNode(0, -1);
  }
  getEastNode(): Cell | null {
    return this.getNode(1, 0);
  }

  getSouthNode(): Cell | null {
    return this.getNode(0, 1);
  }
  getWestNode(): Cell | null {
    return this.getNode(-1, 0);
  }

  getAllNeighbors() {
    return [{
      cell: this.getNorthNode(),
      direction: 'north',
    }, {
      cell: this.getEastNode(),
      direction: 'east',
    }, {
      cell: this.getSouthNode(),
      direction: 'south',
    }, {
      cell: this.getWestNode(),
      direction: 'west',
    },
    ] as AnyNeighbor[];
  }

  getUnvisitedNeighbbors(): CellNeighbor[] {
    const cellNighbors = this.getAllNeighbors().filter((neighbor) => neighbor.cell !== null) as unknown as CellNeighbor[];
    const unvisitedNeighbors = cellNighbors.filter((object) => object.cell.visited === false);
    return unvisitedNeighbors;
  }

  drawCell() {
    this.ctx.fillStyle = 'white';
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
    this.ctx.strokeStyle = arrayToRGB(this.colorArray);
    this.ctx.stroke();
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
  stack: Stack;
  firstCell: Cell;
  dimensions: number;
  padding: number;
  visitsPerFrame: number;

	constructor(canvas: HTMLCanvasElement, options: MazeOptions) {
    super(canvas);
    this.visitsPerFrame = options.visitsPerFrame ?? 10;
    this.ctx.lineWidth = Math.floor(options?.lineWidth ?? 2);
    this.dimensions = Math.max(options.dimensions ?? 10, 1); //default to 10, but never less than 1
    this.padding = Math.floor(options.padding ?? 4); // slightly offset so wall lines aren't cut off
    
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

    this.stack = new Stack();
    const randomCol = Math.floor(Math.random() * this.array.length);
    const randomRow = Math.floor(Math.random() * this.array[0].length);
    this.firstCell = this.array[randomCol][randomRow];

    //initialize stack
    this.stack.push(this.firstCell);
    this.firstCell.visited = true;

    //clear canvas
    this.ctx.clearRect(0, 0, 500, 500); 
	}
  
  visitNeighbor() {
    if (!this.stack.isEmpty()) {
      const currentCell: Cell = this.stack.pop();
      const unvisitedNeighbors = currentCell.getUnvisitedNeighbbors()
      if (unvisitedNeighbors.length > 0) {
        this.stack.push(currentCell);
        const neighbor = unvisitedNeighbors[Math.floor(Math.random() * unvisitedNeighbors.length)];
        if (!neighbor) return;
        // this is the new cell's direction in reference to the 
        // cell that was just popped off of the stack
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
        neighbor.cell.visited = true;
        currentCell.drawCell();
        neighbor.cell.drawCell();
        this.stack.push(neighbor.cell);
      }
    }
  }

	animate() {
    for (let i = 0; i < this.visitsPerFrame; i++){
      this.visitNeighbor();
    }
		window.requestAnimationFrame(() => this.animate());
	}
}

export function Maze() {
  const options = {
    dimensions: 50,
    visitsPerFrame: 20,
  }
	const [canvas] = useAnimation(MazeAnimation, options);
  return canvas;
}
