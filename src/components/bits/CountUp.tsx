'use client';
import { animate, useReducedMotion } from 'motion/react';
import { useEffect, useRef, useState } from 'react';
import { cx } from '@/lib/cx';

/** Adapted from React Bits CountUp. SSR prints the final value. It animates only when `to` changes after mount. */
export default function CountUp({ to, duration = 0.45, className }: { to: number; duration?: number; className?: string }) {
  const reduce = useReducedMotion();
  const [shown, setShown] = useState(to);
  const current = useRef(to);
  useEffect(() => {
    if (current.current === to) return;
    if (reduce) { current.current = to; setShown(to); return; }
    const controls = animate(current.current, to, {
      duration,
      ease: [0.22, 1, 0.36, 1],
      onUpdate: (v) => { current.current = v; setShown(Math.round(v)); },
      onComplete: () => { current.current = to; setShown(to); },
    });
    return () => controls.stop();
  }, [to, duration, reduce]);
  return (
    <span className={cx('tnum', className)}>
      <span aria-hidden>{shown}</span>
      <span className="sr-only">{to}</span>
    </span>
  );
}
