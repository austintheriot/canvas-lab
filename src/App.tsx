import React from 'react';
import styles from './App.module.scss';
import { Maze } from 'animations/Maze/Maze';

export const App = () => {
	return (
		<div className={styles.App}>
			<Maze />
		</div>
	);
};
