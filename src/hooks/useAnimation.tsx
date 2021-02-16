import React, { useEffect, useRef, useState } from 'react';

/**
 *
 * @param Animation
 * @param animationOptions
 * @param updateValues
 *
 * @returns [Canvas Ref, Animation, canvasRef ]
 */
export const useAnimation = (
	Animation: any,
	animationOptions?: any,
	updateValues?: boolean,
): [
	React.DetailedHTMLProps<
		React.CanvasHTMLAttributes<HTMLCanvasElement>,
		HTMLCanvasElement
	>,
	any,
	React.MutableRefObject<HTMLCanvasElement | null>,
] => {
	const canvasRef = useRef<HTMLCanvasElement | null>(null);
	const [animation, setAnimation] = useState<any | null>(null);

	useEffect(() => {
		if (canvasRef.current != null) {
			const newAnimation = new Animation(canvasRef.current, animationOptions);
			setAnimation(newAnimation);
			newAnimation.animate();
		}
	}, [Animation, animationOptions, canvasRef]);

	useEffect(() => {
		if (animationOptions && updateValues)
			animation.updateValues(animationOptions);
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [animationOptions]);

	return [<canvas ref={canvasRef} />, animation, canvasRef];
};
