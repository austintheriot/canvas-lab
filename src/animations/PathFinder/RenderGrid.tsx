import React, { useEffect, useState } from 'react';
import { useAnimation } from 'hooks/useAnimation';
import type { GridOptions } from './Grid';
import { GridAnimation } from './Grid';
import classes from './RenderGrid.module.scss';
import { cloneDeep } from 'lodash';
// import cloneDeep from 'lodash/cloneDeep';
// import { Range } from 'components/Range/Range';
// import { Menu } from 'components/Menu/Menu';

const defaults: GridOptions = {
	dimensions: '50',
	lineWidth: '1',
};

export function RenderGrid() {
	const [options, setOptions] = useState<GridOptions>(defaults);
	const [canvas, animation, canvasRef] = useAnimation(GridAnimation, options);
	const gridAnimation = animation as GridAnimation | null;

	const handleSolveClick = () => {
		if (gridAnimation) gridAnimation?.onSolve();
	};

	const handleSearchSelection = (e: React.ChangeEvent<HTMLSelectElement>) => {
		const value = e.currentTarget.value;
		if (gridAnimation) {
			if (value === 'bfs' || value === 'dfs' || value === 'biBfs') {
				gridAnimation.onSearchSelection(value);
				setOptions((prevOptions) => {
					const newOptions = cloneDeep(prevOptions);
					newOptions.searchType = value;
					return newOptions;
				});
			}
		}
	};

	// attach mouse event listener to canvas
	useEffect(() => {
		const onMouseMove = (e: MouseEvent) => {
			if (gridAnimation) gridAnimation.onMouseMove(e.offsetX, e.offsetY);
		};

		const onMouseDown = (e: MouseEvent) => {
			if (gridAnimation) gridAnimation.onMouseDown(true);
		};

		const onMouseUp = (e: MouseEvent) => {
			if (gridAnimation) gridAnimation.onMouseDown(false);
		};

		const onMouseOut = (e: MouseEvent) => {
			if (gridAnimation) gridAnimation.onMouseDown(false);
		};

		//add event listener
		let currentCanvas = canvasRef.current;
		if (currentCanvas) {
			currentCanvas.addEventListener('mousemove', onMouseMove);
			currentCanvas.addEventListener('mousedown', onMouseDown);
			currentCanvas.addEventListener('mouseup', onMouseUp);
			currentCanvas.addEventListener('mouseout', onMouseOut);
		}

		//remove event listener
		return () => {
			currentCanvas?.removeEventListener('mousemove', onMouseMove);
			currentCanvas?.removeEventListener('mousedown', onMouseDown);
			currentCanvas?.removeEventListener('mouseup', onMouseUp);
			currentCanvas?.removeEventListener('mouseout', onMouseOut);
		};
	});

	return (
		<main>
			<button type="button" onClick={() => animation.init(options)}>
				Start Over
			</button>
			<button type="button" onClick={handleSolveClick}>
				Solve
			</button>
			<label htmlFor="searchType">Search Type</label>
			<select onChange={handleSearchSelection} id="searchType">
				<option value="bfs">Breadth-First Search</option>
				<option value="dfs">Depth-First Search</option>
				<option value="biBfs">Bidirectional Breadth-First Search</option>
			</select>
			<div className={classes.CanvasContainer}>{canvas}</div>
		</main>
	);
}
