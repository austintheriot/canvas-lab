import type { GridAnimation } from './Grid';
import type { Tile } from './Tile';

export function bfs(this: GridAnimation) {
	if (this.searchQueue.isEmpty() && !this.solved) {
		this.solved = true;
		alert('No solution found!');
		return;
	} else if (
		this.solved ||
		this.searchQueue.isEmpty() ||
		this.isWaitingForAnimation
	)
		return;
	/* 
		If the solve Queue is empty, don't try to solve.
		Also wait for animation to finish to prevent visual glitch
		where the first search tile is drawn before the generation
		aniamtion is finished.
    */

	for (let i = 0; i < this.searchQueue.size; i++) {
		//else if queue is not empty, continue solving
		const dequeuedTile = this.searchQueue.remove();
		if (!dequeuedTile || dequeuedTile.searchVisited) continue;
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

export function dfs(this: GridAnimation) {
	if (this.searchStack.isEmpty() && !this.solved) {
		this.solved = true;
		alert('No solution found!');
		return;
	} else if (
		this.solved ||
		this.searchStack.isEmpty() ||
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
		const poppedTile = this.searchStack.pop();
		if (!poppedTile || poppedTile.searchVisited) continue;
		poppedTile.searchVisited = true;
		poppedTile.addSearchAnimationToQueue();

		if (poppedTile === this.endTile) {
			this.state = 'solving';
			this.isWaitingForAnimation = true;

			//trace path backawards and add to array
			const solvePath: Tile[] = [];
			let currentTile = poppedTile;
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

		const neighbors = poppedTile.getTraversableNeighbors();
		for (let neighbor of neighbors) {
			if (neighbor && !neighbor.searchVisited) {
				//keep track of parent tile to trace path back to start
				neighbor.solveParent = poppedTile;
				neighbor.currentFillColor = neighbor.initialSearchFillColor;
				this.searchStack.push(neighbor);
			}
		}
	}
}
