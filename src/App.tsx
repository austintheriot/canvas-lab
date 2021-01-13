import React from 'react';
import styles from './App.module.scss';
import { useAnimation } from 'hooks/useAnimation';
import { BrownianMotion } from './animations/BrownianMotion';

export const App = () => {
	return <div className={styles.App}>{useAnimation(BrownianMotion)}</div>;
};
