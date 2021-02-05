import React, { useState } from 'react';
import classes from './Menu.module.scss';

export const Menu = ({ children }: { children?: React.ReactNode }) => {
	const [open, setOpen] = useState(false);

	return (
		<>
			<button
				className={`${classes.MenuButton} ${open ? classes.isOpen : ''}`}
				onClick={() => setOpen((prev) => !prev)}
			>
				<span className={open ? classes.rotate1 : ''} />
				<span className={open ? classes.rotate2 : ''} />
				<span className={open ? classes.rotate3 : ''} />
			</button>
			<section className={`${classes.Menu} ${open ? classes.isOpen : ''}`}>
				{children}
			</section>
		</>
	);
};
