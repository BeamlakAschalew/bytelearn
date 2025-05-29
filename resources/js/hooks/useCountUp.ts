import { useEffect, useRef, useState } from 'react';

function easeOutExpo(t: number): number {
    return t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
}

export function useCountUp(endValue: number, duration: number = 2000): number {
    const [count, setCount] = useState(0);
    const animationFrameId = useRef<number | null>(null);
    const prevEndValue = useRef<number | null>(null); // To detect changes in endValue for reset

    useEffect(() => {
        // If endValue changes, reset the count to 0 to start animation from the beginning.
        if (prevEndValue.current !== null && prevEndValue.current !== endValue) {
            setCount(0);
        }
        prevEndValue.current = endValue;

        // If the duration is not positive, set to endValue immediately and skip animation.
        if (duration <= 0) {
            setCount(endValue);
            return;
        }

        const frameRate = 1000 / 60; // 60 fps
        const totalFrames = Math.round(duration / frameRate);

        // If totalFrames is 0 (e.g., very small duration), set to endValue immediately.
        if (totalFrames <= 0) {
            setCount(endValue);
            return;
        }

        // If starting count is already the end value (e.g. after reset and endValue is 0)
        // This check is important after count might have been reset to 0.
        if (count === endValue) {
            // No animation needed if already at target, unless it's the very first run for a non-zero endValue.
            // The initial useState(0) handles the start. If endValue is 0 and count is 0, this stops it.
            // If endValue changed, count was reset to 0. If new endValue is also 0, this stops.
            // If new endValue is non-zero, animation will proceed from count=0.
            if (endValue === 0) return; // Specifically if target is 0 and we are at 0.
        }

        let frame = 0;
        // Animation should start from the current `count`.
        // The current logic animates as if starting from 0 towards `endValue * progress`.
        // For simplicity, with `setCount(0)` on `endValue` change, this is acceptable.
        // If we wanted to animate from current `count` to `endValue` after a dynamic `endValue` change
        // without resetting to 0, the calculation of `currentAnimatedValue` would be more complex.
        // e.g., `startValue + (endValue - startValue) * progress`. Here, `startValue` is effectively 0.

        const counter = () => {
            frame++;
            const progress = easeOutExpo(frame / totalFrames);
            const currentAnimatedValue = Math.round(endValue * progress);

            if (frame >= totalFrames) {
                // Use >= for robustness
                setCount(endValue); // Ensure it ends exactly on endValue
                if (animationFrameId.current) {
                    cancelAnimationFrame(animationFrameId.current);
                }
                return;
            }

            setCount(currentAnimatedValue);
            animationFrameId.current = requestAnimationFrame(counter);
        };

        animationFrameId.current = requestAnimationFrame(counter);

        return () => {
            if (animationFrameId.current) {
                cancelAnimationFrame(animationFrameId.current);
            }
        };
        // Dependencies:
        // - endValue: if it changes, animation parameters or reset logic needs to run.
        // - duration: if it changes, animation parameters (totalFrames) change.
        // - count: DO NOT add `count` here. It creates an infinite loop as `setCount` would re-trigger the effect.
        //   The effect correctly manages its lifecycle based on `endValue` and `duration` changes.
    }, [endValue, duration]);

    return count;
}
