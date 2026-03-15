import { useEffect, useRef, useCallback } from 'react';

const SIZE = 240;
const CX = SIZE / 2;
const CY = SIZE / 2;
const R  = SIZE / 2;        // fill full canvas — CSS border-radius clips the circle
const DURATION = 2200;      // ms to go from 0 → 100 %

export default function WaterFillCanvas({ label, disabled, onStart, onFilled }) {
    const canvasRef = useRef(null);
    // All mutable animation state lives in a ref so it never triggers re-renders
    const s = useRef({ pct: 0, waveOff: 0, running: false, done: false, startTime: null, rafId: null });

    // ── Draw one frame ───────────────────────────────────────────────
    const draw = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        const { pct, waveOff, done } = s.current;

        ctx.clearRect(0, 0, SIZE, SIZE);

        // Background gradient fills entire canvas — CSS border-radius clips to circle
        const bg = ctx.createLinearGradient(0, 0, SIZE, SIZE);
        bg.addColorStop(0, '#a855f7');
        bg.addColorStop(1, '#ec4899');
        ctx.fillStyle = bg;
        ctx.fillRect(0, 0, SIZE, SIZE);

        // ── Water body ──
        if (pct > 0) {
            // Y position of the water surface (0% = bottom, 100% = top)
            const fillY = CY + R - (pct / 100) * (R * 2);
            // Amplitude shrinks to 0 as the circle fills
            const amp = pct >= 100 ? 0 : Math.max(0, 8 * (1 - pct / 100) + 2);

            ctx.beginPath();
            ctx.moveTo(0, SIZE);
            ctx.lineTo(0, fillY);

            // Wave path across the full width
            for (let x = 0; x <= SIZE; x += 2) {
                const y = fillY + amp * Math.sin((x / SIZE) * Math.PI * 4 + waveOff);
                ctx.lineTo(x, y);
            }

            ctx.lineTo(SIZE, SIZE);
            ctx.closePath();

            // Semi-transparent white overlay — water sheen over the gradient
            const waterGrad = ctx.createLinearGradient(0, fillY, 0, SIZE);
            waterGrad.addColorStop(0, 'rgba(255,255,255,0.45)');
            waterGrad.addColorStop(1, 'rgba(255,255,255,0.15)');
            ctx.fillStyle = waterGrad;
            ctx.fill();
        }


        // ── Label / percentage ──
        ctx.textAlign    = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle    = 'white';
        ctx.shadowColor  = 'rgba(0,0,0,0.25)';
        ctx.shadowBlur   = 6;

        if (done) {
            ctx.font = 'bold 18px -apple-system, sans-serif';
            ctx.fillText('Searching…', CX, CY);
        } else if (pct > 0) {
            ctx.font = 'bold 28px -apple-system, sans-serif';
            ctx.fillText(`${Math.round(pct)}%`, CX, CY);
        } else {
            ctx.font = '800 22px -apple-system, sans-serif';
            ctx.fillText(label, CX, CY);
        }

        ctx.shadowBlur = 0;
    }, [label]);

    // ── Animation loop ───────────────────────────────────────────────
    const startLoop = useCallback(() => {
        const loop = (ts) => {
            if (!s.current.startTime) s.current.startTime = ts;
            const elapsed = ts - s.current.startTime;
            s.current.pct     = Math.min(100, (elapsed / DURATION) * 100);
            s.current.waveOff += 0.07;
            draw();

            if (s.current.pct < 100) {
                s.current.rafId = requestAnimationFrame(loop);
            } else {
                s.current.running = false;
                s.current.done    = true;
                draw(); // final frame — flat surface, 100%
                onFilled?.();
            }
        };
        s.current.rafId = requestAnimationFrame(loop);
    }, [draw, onFilled]);

    // ── Click handler ────────────────────────────────────────────────
    const handleClick = useCallback(() => {
        if (s.current.running || s.current.done || disabled) return;
        s.current.running   = true;
        s.current.startTime = null;
        onStart?.();
        startLoop();
    }, [disabled, onStart, startLoop]);

    // ── Reset when parent brings phase back to idle ──────────────────
    useEffect(() => {
        if (!disabled) {
            if (s.current.rafId) cancelAnimationFrame(s.current.rafId);
            s.current = { pct: 0, waveOff: 0, running: false, done: false, startTime: null, rafId: null };
            draw();
        }
    }, [disabled, draw]);

    // ── Initial paint ────────────────────────────────────────────────
    useEffect(() => {
        draw();
    }, [draw]);

    return (
        <canvas
            ref={canvasRef}
            width={SIZE}
            height={SIZE}
            onClick={handleClick}
            style={{
                display:      'block',
                borderRadius: '50%',
                cursor:       disabled ? 'default' : 'pointer',
                boxShadow:    '0 15px 40px rgba(168,85,247,0.35)',
                transition:   'transform 0.3s cubic-bezier(0.175,0.885,0.32,1.275)',
            }}
            onMouseEnter={e => { if (!disabled) e.currentTarget.style.transform = 'scale(1.08)'; }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; }}
            onMouseDown={e  => { if (!disabled) e.currentTarget.style.transform = 'scale(0.95)'; }}
            onMouseUp={e    => { if (!disabled) e.currentTarget.style.transform = 'scale(1.08)'; }}
        />
    );
}
