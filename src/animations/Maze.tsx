import { Animation } from '../classes/Animation';
import { useAnimation } from '../hooks/useAnimation';
import { Stack } from 'classes/Stack';
import { shuffleArray } from 'functions/shuffleArray';

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
  col: number;
  row: number;
  array: Cell[][];
  size?: number;
}

class Cell {
  array: Cell[][];
  col: number;
  row: number;
  
  northWall: boolean;
  eastWall: boolean;
  southWall: boolean;
  westWall: boolean;
  
  visited: boolean;
  
  ctx: CanvasRenderingContext2D;
  size: number;
  TLC: number; //top left col
  TLR: number; //top left row
  TRC: number;
  TRR: number;
  BRC: number; //bottom right col
  BRR: number; //bottom right row
  BLC: number;
  BLR: number;


  constructor(ctx: CanvasRenderingContext2D, options: CellOptions) {
    //maze properties
    this.array = options.array;
    this.col = options.col;
    this.row = options.row;
    
    this.northWall = true;
    this.eastWall = true;
    this.southWall = true;
    this.westWall = true;

    this.visited = false;

    //drawing properties
    this.ctx = ctx;
    // slightly offset so wall lines aren't cut off
    const OFFSET = 20;
    this.size = Math.floor(options.size ?? ((500 - OFFSET) / this.array.length)); 
    this.TLC = Math.floor(OFFSET / 2) + this.col * this.size;
    this.TLR = Math.floor(OFFSET / 2) + this.row * this.size;
    this.TRC = this.TLC + this.size;
    this.TRR = this.TLR;
    this.BRC = this.TRC;
    this.BRR = this.TLR + this.size;
    this.BLC = this.TLC;
    this.BLR = this.BRR;
  }

  getNorthNode(): Cell | null {
    return this.array[this.col][this.row - 1] ?? null;
  }

  getEastNode(): Cell | null {
    return (this.array[this.col + 1] && this.array[this.col + 1][this.row]) ?? null;
  }

  getSouthNode(): Cell | null {
    return this.array[this.col][this.row + 1] ?? null;
  }

  getWestNode(): Cell | null {
    return (this.array[this.col - 1] && this.array[this.col - 1][this.row]) ?? null;
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

  drawLine(wall: boolean, x1: number, y1: number, x2: number, y2: number) {
    this.ctx.beginPath();
    this.ctx.moveTo(x1, y1);   
    this.ctx.lineTo(x2, y2);   
    this.ctx.closePath();
    this.ctx.strokeStyle = wall ? 'rgb(0, 0, 0)' : 'rgb(255, 255, 255)';
    this.ctx.stroke();
  }

  drawCell() {
    this.ctx.fillStyle = 'white';
    this.ctx.fillRect(this.TLC, this.TLR, this.size, this.size);
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
    this.ctx.stroke();
	}
}

interface Options {
  size?: number;
  lineWidth?: number;
}

export class MazeAnimation extends Animation {
  array: Cell[][];
  stack: Stack;
  firstCell: Cell;
  render: number;
  drawFrames: number;

	constructor(canvas: HTMLCanvasElement, options: Options) {
    super(canvas);
    this.ctx.lineWidth = Math.floor(options?.lineWidth ?? 2);
    this.render = 0;
    this.drawFrames = 2;
    
    //build array of cells
    this.array = new Array(options?.size ?? 10).fill(null);
    for (let col = 0; col < this.array.length; col++){
      this.array[col] = new Array(options?.size ?? 10).fill(null);
      const innerArray = this.array[col];
      for (let row = 0; row < innerArray.length; row++){
        innerArray[row] = new Cell(this.ctx, {
          row,
          col,
          array: this.array,
        });
      }
    }

    //make entrance/exit
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
    this.visitNeighbor();
		window.requestAnimationFrame(() => this.animate());
	}
}

export function Maze() {
  const options = {
    size: 20,
  }
	const [canvas] = useAnimation(MazeAnimation, options);
  return canvas;
}
