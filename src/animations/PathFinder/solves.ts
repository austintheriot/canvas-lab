import type { GridAnimation } from './Grid';
import type { Tile } from './Tile';

/* Breadth-Frist Search */
export function bfs(this: GridAnimation) {
	if (this.searchQueue1.isEmpty() && !this.solved) {
		this.solved = true;
		alert('No solution found!');
		return;
	} else if (
		this.solved ||
		this.searchQueue1.isEmpty() ||
		this.isWaitingForAnimation
	)
		return;
	/* 
		If the solve Queue is empty, don't try to solve.
		Also wait for animation to finish to prevent visual glitch
		where the first search tile is drawn before the generation
		aniamtion is finished.
    */

	for (let i = 0; i < this.searchQueue1.size / 2; i++) {
		//else if queue is not empty, continue solving
		const dequeuedTile = this.searchQueue1.remove();
		if (!dequeuedTile || dequeuedTile.searchVisited) continue;
		dequeuedTile.searchVisited = true;
		dequeuedTile.addSearchAnimationToQueue();

		if (dequeuedTile === this.endTile) {
			this.state = 'solving';
			this.isWaitingForAnimation = true;

			//trace path backawards and add to array
			const solvePath: Tile[] = [];
			let currentTile = dequeuedTile;
			while (currentTile.solveParent1) {
				solvePath.push(currentTile);
				currentTile = currentTile.solveParent1;
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
				neighbor.solveParent1 = dequeuedTile;
				neighbor.currentFillColor = neighbor.initialSearchFillColor;
				this.searchQueue1.add(neighbor);
			}
		}
	}
}

/* Depth-First Search */
export function dfs(this: GridAnimation) {
	if (this.searchStack1.isEmpty() && !this.solved) {
		this.solved = true;
		alert('No solution found!');
		return;
	} else if (
		this.solved ||
		this.searchStack1.isEmpty() ||
		this.isWaitingForAnimation
	)
		return;
	for (let i = 0; i < this.searchesPerFrame; i++) {
		/* 
      If the solve Stack is empty, don't try to solve.
      Also wait for animation to finish to prevent visual glitch
      where the first search tile is drawn before the generation
      aniamtion is finished.
    */

		//else if stack is not empty, continue solving
		const poppedTile = this.searchStack1.pop();
		if (!poppedTile || poppedTile.searchVisited) continue;
		poppedTile.searchVisited = true;
		poppedTile.addSearchAnimationToQueue();

		if (poppedTile === this.endTile) {
			this.state = 'solving';
			this.isWaitingForAnimation = true;

			//trace path backawards and add to array
			const solvePath: Tile[] = [];
			let currentTile = poppedTile;
			while (currentTile.solveParent1) {
				solvePath.push(currentTile);
				currentTile = currentTile.solveParent1;
			}

			//add starting tile back in
			solvePath.push(this.startTile);
			//track backwards for cool effect
			this.solvePath = solvePath.reverse();
			return;
		}

		const neighbors = poppedTile.getTraversableNeighbors();
		for (let neighbor of neighbors) {
			if (neighbor && !neighbor.searchVisited) {
				//keep track of parent tile to trace path back to start
				neighbor.solveParent1 = poppedTile;
				neighbor.currentFillColor = neighbor.initialSearchFillColor;
				this.searchStack1.push(neighbor);
			}
		}
	}
}

/* Bidirectional Breadth-Frist Search */
export function biBfs(this: GridAnimation) {
	// no solution
	if (
		this.searchQueue1.isEmpty() &&
		this.searchQueue2.isEmpty() &&
		!this.solved
	) {
		this.solved = true;
		alert('No solution found!');
		return;
	}

	// already solved or shouldn't run
	if (
		this.solved ||
		(this.searchQueue1.isEmpty() && this.searchQueue2.isEmpty()) ||
		this.isWaitingForAnimation
	)
		return;

	// search from start tile:
	for (let i = 0; i < this.searchesPerFrame * 5; i++) {
		//else if queue is not empty, continue solving
		const dequeued1 = this.searchQueue1.remove();
		if (dequeued1 && !dequeued1.searchVisited) {
			dequeued1.searchVisited = true;
			dequeued1.addSearchAnimationToQueue();
			const neighbors = dequeued1.getTraversableNeighbors();
			for (let neighbor of neighbors) {
				if (neighbor && !neighbor.searchVisited) {
					//keep track of parent tile to trace path back to start
					neighbor.solveParent1 = dequeued1;
					neighbor.currentFillColor = neighbor.initialSearchFillColor;
					this.searchQueue1.add(neighbor);
				}
			}
		}

		// search from end tile:
		const dequeued2 = this.searchQueue2.remove();
		if (dequeued2 && !dequeued2.searchVisited2) {
			dequeued2.searchVisited2 = true;
			dequeued2.addSearchAnimationToQueue();
			const neighbors = dequeued2.getTraversableNeighbors();
			for (let neighbor of neighbors) {
				if (neighbor && !neighbor.searchVisited2) {
					//keep track of parent tile to trace path back to start
					neighbor.solveParent2 = dequeued2;
					neighbor.currentFillColor = neighbor.initialSearchFillColor;
					this.searchQueue2.add(neighbor);
				}
			}
		}

		// if the searches meet in the middle:
		if (dequeued1?.searchVisited2 || dequeued2?.searchVisited) {
			this.state = 'solving';
			this.isWaitingForAnimation = true;

			// trace the path back to the start and end nodes
			const solvePath: Tile[] = [];
			// start from whichever dequed tile was the one
			// that met in the middle
			let currentTile1: Tile | null = dequeued1?.searchVisited2
				? dequeued1
				: dequeued2;
			let currentTile2: Tile | null = dequeued1?.searchVisited2
				? dequeued1
				: dequeued2;

			// interleave tiles for simultaneous solve trace path
			while (currentTile1?.solveParent1 || currentTile2?.solveParent2) {
				if (currentTile1) {
					solvePath.push(currentTile1);
					currentTile1 = currentTile1.solveParent1;
				}
				if (currentTile2) {
					solvePath.push(currentTile2);
					currentTile2 = currentTile2.solveParent2;
				}
			}
			solvePath.push(this.startTile);
			solvePath.push(this.endTile);

			// reverse to show solve from the meeting point
			// moving out to the start and end cells
			this.solvePath = [...solvePath.reverse()];
			return;
		}
	}
}
