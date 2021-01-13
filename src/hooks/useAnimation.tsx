import React, { useEffect, useRef } from 'react';

export const useAnimation = (Animation: any) => {
	const canvas = useRef<HTMLCanvasElement | null>(null);
	useEffect(() => {
		if (canvas.current != null) {
			const test = new Animation(canvas.current);
			test.animate();
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [canvas]);

	return <canvas ref={canvas}></canvas>;
};
