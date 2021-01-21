import React from 'react';
import styles from './App.module.scss';
import { BrownianMotion } from 'animations/BrownianMotion';

export const App = () => {
	return (
		<div className={styles.App}>
			<BrownianMotion />
		</div>
	);
};
