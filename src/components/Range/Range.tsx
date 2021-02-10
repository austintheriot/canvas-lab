import React, { useRef } from 'react';

/**
 * Creates an input slider that only calls onChange
 * on mouseup. Mimics shape of normal event handler object.
 */
export function Range({
	onChange,
	updateProperty,
	reset,
	label,
	min = '0',
	max = '1',
	step = '0.00001',
	defaultValue = '0',
	...rest
}: {
	onChange: (
		e: { currentTarget: { value: string } },
		key: string,
		reset: boolean,
	) => void;
	updateProperty: string;
	reset: boolean;
	label: string;
	min: string;
	max: string;
	step: string;
	defaultValue?: string;
}) {
	const input = useRef<HTMLInputElement | null>(null);
	const handleMouseUp = () => {
		console.log(input?.current?.value);
		if (input.current) {
			onChange(
				{ currentTarget: { value: input.current.value } },
				updateProperty,
				reset,
			);
		}
	};

	return (
		<div>
			<label htmlFor={label}>{label}</label>
			<input
				ref={input}
				id={label}
				type="range"
				min={min}
				max={max}
				step={step}
				onMouseUp={handleMouseUp}
				defaultValue={defaultValue}
				{...rest}
			/>
		</div>
	);
}
