import React from 'react';
import classes from './App.module.scss';
import { RenderGrid } from 'animations/PathFinder/RenderGrid';

export const App = () => {
	return (
		<div className={classes.App}>
			<RenderGrid />
		</div>
	);
};
