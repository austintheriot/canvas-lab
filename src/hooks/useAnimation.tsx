import React, { useEffect, useRef, useState } from 'react';

export const useAnimation = (Animation: any, animationOptions?: any, updateValues?: boolean) => {
	const canvas = useRef<HTMLCanvasElement | null>(null);
	const [animation, setAnimation] = useState<any | null>(null);

	useEffect(() => {
		if (canvas.current != null) {
			const newAnimation = new Animation(canvas.current, animationOptions);
			setAnimation(newAnimation);
			newAnimation.animate();
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	useEffect(() => {
		if (animationOptions && updateValues) animation.updateValues(animationOptions);
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [animationOptions]);

	return [<canvas ref={canvas}></canvas>, animation];
};
