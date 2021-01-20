import React from 'react';
import styles from './App.module.scss';
import { useAnimation } from 'hooks/useAnimation';
import { BarnsleyFern } from './animations/BarnsleyFern';

export const App = () => {
	return <div className={styles.App}>{useAnimation(BarnsleyFern)}</div>;
};
