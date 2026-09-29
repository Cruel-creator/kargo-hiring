'use client';
import { useRef, type HTMLAttributes, type ReactNode } from 'react';
import { gsap, ScrollTrigger, useGSAP } from '@/components/motion/gsap';

interface Props extends HTMLAttributes<HTMLDivElement> { children: ReactNode; distance?: number; duration?: number; ease?: string; delay?: number; threshold?: number }

export default function AnimatedContent({ children, distance = 12, duration = 0.48, ease = 'expo.out', delay = 0, threshold = 0.12, className, ...props }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  useGSAP(() => {
    const el = ref.current;
    if (!el) return;
    const mm = gsap.matchMedia();
    mm.add('(prefers-reduced-motion: no-preference)', () => {
      if (el.getBoundingClientRect().top < window.innerHeight) return; // already visible at mount: never hide it
      gsap.set(el, { opacity: 0, y: distance });
      const tween = gsap.to(el, { opacity: 1, y: 0, duration, ease, delay, paused: true, clearProps: 'opacity,transform' });
      const st = ScrollTrigger.create({ trigger: el, start: `top ${(1 - threshold) * 100}%`, once: true, onEnter: () => tween.play() });
      const reveal = () => { st.kill(); tween.progress(1); };
      el.addEventListener('focusin', reveal);
      return () => { el.removeEventListener('focusin', reveal); st.kill(); tween.kill(); gsap.set(el, { clearProps: 'opacity,transform' }); };
    });
    return () => mm.revert();
  }, { scope: ref });
  return <div ref={ref} className={className} {...props}>{children}</div>;
}
