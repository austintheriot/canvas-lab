import { Animation } from '../classes/Animation';
import { useAnimation } from '../hooks/useAnimation';
import { Stack } from 'classes/Stack';
import { first } from 'lodash';

// create maze data structure
// display maze

//use 2d array, each element keeps track of the index of its N, E, S, and W neighbors
//use a literal graph, in which element links directly to its NESW nodes
//getN, getE, getS, getW
//build 

interface CellOptions {
  col: number;
  row: number;
  array: Cell[][];
  size?: number;
  thickness?: number;
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
  thicknesss: number;
  col1: number; //top left 
  row1: number; //top left
  col2: number; //bottom right
  row2: number; //bottom right


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
    this.size = options.size ?? 500 / this.array.length;
    this.thicknesss = options.thickness ?? 1;
    this.col1 = this.col * this.size;
    this.row1 = this.row * this.size;
    this.col2 = this.col1 + this.size;
    this.row2 = this.row1 + this.size;
  }

  getNorthNode(): Cell | null {
    return (this.array[this.col] && this.array[this.col][this.row - 1]) ?? null;
  }

  getEastNode(): Cell | null {
    return (this.array[this.col + 1] && this.array[this.col + 1][this.row]) ?? null;
  }

  getSouthNode(): Cell | null {
    return (this.array[this.col] && this.array[this.col][this.row + 1]) ?? null;
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
    ]
  }

  shuffleArray<T>(arr: T[]): T[] {
    for (let i = 0; i < arr.length; i++) {
      const j = Math.floor(i + Math.random() * (arr.length - i));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  getRandomUnvisitedNeighbor(): { cell: Cell, direction: 'north' | 'east' | 'south' | 'west'}[] {
    const unvisitedNeighbors = this.getAllNeighbors().filter((object) => object.cell !== null && object.cell.visited === false) as unknown as { cell: Cell, direction: 'north' | 'east' | 'south' | 'west' }[];
    return this.shuffleArray(unvisitedNeighbors);
  }

  drawLine(x1: number, y1: number, x2: number, y2: number) {
    this.ctx.beginPath();
    this.ctx.moveTo(x1, y1);   
    this.ctx.lineTo(x2, y2);   
    this.ctx.closePath();
    this.ctx.lineWidth = this.thicknesss;
    this.ctx.stroke();
  }

  drawCell() {
    if (this.northWall && this.visited) {
      this.drawLine(this.col1, this.row1, this.col1 + this.size, this.row1);
    }
    if (this.eastWall && this.visited) {
      this.drawLine(this.col1 + this.size, this.row1, this.col1 + this.size, this.row1 + this.size);
    }
    if (this.southWall && this.visited) {
      this.drawLine(this.col1, this.row1 + this.size, this.col1 + this.size, this.row1 + this.size);
    }
    if (this.westWall && this.visited) {
      this.drawLine(this.col1, this.row1, this.col1, this.row1 + this.size);
    }
	}
}

interface Options {
  size?: number;
}

export class MazeAnimation extends Animation {
  array: Cell[][];
  stack: Stack;
  firstCell: Cell;

	constructor(canvas: HTMLCanvasElement, options: Options) {
    super(canvas);
    
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
	}
  
  visitNeighbor() {
    if (!this.stack.isEmpty()) {
      const currentCell: Cell = this.stack.pop();
      console.log('currentCell', currentCell);
      const unvisitedNeighbors = currentCell.getRandomUnvisitedNeighbor()
      if (unvisitedNeighbors.length) {
        this.stack.push(currentCell);
        const neighbor = unvisitedNeighbors.pop();
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
        this.stack.push(neighbor.cell);
      }
    }
  }

	animate() {
    this.ctx.clearRect(0, 0, 500, 500); 
    this.visitNeighbor();
    this.array.forEach((innerArray) => {
      innerArray.forEach((cell) => {
        cell.drawCell();
      })
    })
		window.requestAnimationFrame(() => this.animate());
	}
}

export function Maze() {
  const options = {
    size: 25,
  }
	const [canvas] = useAnimation(MazeAnimation, options);
  return canvas;
}
