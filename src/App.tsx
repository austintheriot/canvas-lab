import React, { useRef, useEffect } from 'react';
import styles from './App.module.scss';
import { Animation } from 'animation/test';

function App() {
	const canvas = useRef<HTMLCanvasElement | null>(null);

	useEffect(() => {
		if (canvas.current == null) return;
		const animation = new Animation(canvas.current);
		animation.animate();

		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [canvas]);

	return (
		<div className={styles.App}>
			<canvas ref={canvas}></canvas>
		</div>
	);
}

export default App;
