import { useEffect, useMemo, useState } from 'react';

interface AnimatedNumberProps {
  value: number;
  suffix?: string;
  prefix?: string;
  decimals?: number;
  duration?: number;
}

export default function AnimatedNumber({ value, suffix = '', prefix = '', decimals = 0, duration = 900 }: AnimatedNumberProps) {
  const target = useMemo(() => Number.isFinite(Number(value)) ? Number(value) : 0, [value]);
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    const reduceMotion = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (reduceMotion) {
      setDisplay(target);
      return;
    }
    let frame = 0;
    const start = performance.now();
    const step = (now: number) => {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(target * eased);
      if (progress < 1) frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [target, duration]);

  return <>{prefix}{display.toLocaleString('zh-CN', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}{suffix}</>;
}
