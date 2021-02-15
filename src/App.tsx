import React from 'react';
import styles from './App.module.scss';
import { RenderMaze } from 'animations/Maze/RenderMaze';

export const App = () => {
	return (
		<div className={styles.App}>
			<RenderMaze />
		</div>
	);
};
