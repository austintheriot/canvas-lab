import React, { useState } from 'react';
import { useAnimation } from 'hooks/useAnimation';
import type { MazeOptions } from './Maze';
import { MazeAnimation } from './Maze';
import cloneDeep from 'lodash/cloneDeep';
import classes from './RenderMaze.module.scss';
import { Range } from 'components/Range/Range';
import { Menu } from 'components/Menu/Menu';

const defaults: MazeOptions = {
	dimensions: '25',
	lineWidth: '1',
};

export function RenderMaze() {
	const [options, setOptions] = useState<MazeOptions>(defaults);
	const [canvas, animation] = useAnimation(MazeAnimation, options);

	const updateOptions = (
		e:
			| React.ChangeEvent<HTMLInputElement>
			| { currentTarget: { value: string } },
		key: string,
		reset = false,
	) => {
		const { value } = e.currentTarget;
		console.log(value);
		setOptions((prevState) => {
			const newState: MazeOptions = cloneDeep(prevState);
			newState[key] = value;
			if (reset) animation.reset(newState);
			return newState;
		});
	};

	return (
		<main>
			<Menu>
				<button
					type="button"
					onClick={() => animation.reset(options)}
					className={classes.Button}
				>
					Start Over
				</button>
				<Range
					label="Dimensions"
					onChange={updateOptions}
					updateProperty="dimensions"
					min="1"
					max="100"
					step="1"
					defaultValue={defaults.dimensions}
					reset={true}
				/>
				<Range
					label="Line Width"
					onChange={updateOptions}
					updateProperty="lineWidth"
					min="1"
					max="50"
					step="0.00011"
					defaultValue={defaults.lineWidth}
					reset={true}
				/>
				<Range
					label="Calcs/Frame"
					onChange={updateOptions}
					updateProperty="generationsPerFrame"
					min="1"
					max="10"
					step="1"
					defaultValue={defaults.generationsPerFrame}
					reset={true}
				/>
			</Menu>
			{canvas}
		</main>
	);
}
