import { useEffect, useRef, useCallback } from 'react';

const SIZE = 240; 
const CANV_SIZE = 340; // larger bounds to prevent cropping the separated halves
const OFS = 50; // shift to center the 240 heart inside the 340 canvas
const CX = SIZE / 2;
const CY = SIZE / 2;
const DURATION = 2200;      // ms to go from 0 → 100 %

export default function WaterFillCanvas({ label, disabled, isBroken, onStart, onFilled }) {
    const canvasRef = useRef(null);
    const s = useRef({ pct: 0, waveOff: 0, running: false, done: false, startTime: null, rafId: null, breakPct: 0 });

    const dpr = window.devicePixelRatio || 2;

    const draw = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        const { pct, waveOff, done, breakPct } = s.current;

        ctx.save();
        ctx.scale(dpr, dpr);
        ctx.clearRect(0, 0, CANV_SIZE, CANV_SIZE);

        ctx.save();
        ctx.translate(OFS, OFS); // move coordinate system to 0-240 heart area

        // Draw background gradient & water
        const drawBody = () => {
            const bg = ctx.createRadialGradient(80, 60, 5, 120, 100, 160);
            bg.addColorStop(0, '#ff8080'); 
            bg.addColorStop(0.15, '#ff0000'); 
            bg.addColorStop(0.6, '#cc0000'); 
            bg.addColorStop(0.9, '#660000'); 
            bg.addColorStop(1, '#330000'); 
            ctx.fillStyle = bg;
            ctx.fillRect(0, 0, SIZE, SIZE);

            if (pct > 0 && breakPct === 0) {
                const fillY = CY + CX - (pct / 100) * SIZE;
                const amp = pct >= 100 ? 0 : Math.max(0, 8 * (1 - pct / 100) + 2);

                ctx.beginPath();
                ctx.moveTo(0, SIZE);
                ctx.lineTo(0, fillY);
                for (let x = 0; x <= SIZE; x += 2) {
                    ctx.lineTo(x, fillY + amp * Math.sin((x / SIZE) * Math.PI * 4 + waveOff));
                }
                ctx.lineTo(SIZE, SIZE);
                ctx.closePath();

                const waterGrad = ctx.createLinearGradient(0, fillY, 0, SIZE);
                waterGrad.addColorStop(0, 'rgba(255,255,255,0.4)');
                waterGrad.addColorStop(1, 'rgba(255,255,255,0.1)');
                ctx.fillStyle = waterGrad;
                ctx.fill();
            }

            // --- 3D GLOSSY HIGHLIGHTS ---
            ctx.save();
            ctx.beginPath();
            // Left lobe highlight - bigger, softer curve
            ctx.moveTo(105, 45); 
            ctx.bezierCurveTo(80, 10, 25, 12, 12, 75); 
            ctx.bezierCurveTo(25, 30, 80, 25, 105, 45); 
            ctx.closePath();
            
            const leftGloss = ctx.createLinearGradient(20, 20, 105, 75);
            leftGloss.addColorStop(0, 'rgba(255, 255, 255, 1.0)');
            leftGloss.addColorStop(1, 'rgba(255, 255, 255, 0.0)');
            ctx.fillStyle = leftGloss;
            ctx.fill();
            ctx.restore();

            ctx.save();
            ctx.beginPath();
            // Right lobe highlight - slightly smaller
            ctx.moveTo(135, 45); 
            ctx.bezierCurveTo(160, 10, 215, 12, 228, 75); 
            ctx.bezierCurveTo(215, 30, 160, 25, 135, 45); 
            ctx.closePath();
            
            const rightGloss = ctx.createLinearGradient(220, 20, 135, 75);
            rightGloss.addColorStop(0, 'rgba(255, 255, 255, 0.9)');
            rightGloss.addColorStop(1, 'rgba(255, 255, 255, 0.0)');
            ctx.fillStyle = rightGloss;
            ctx.fill();
            ctx.restore();
        };

        if (breakPct === 0) {
            // Idle / Filling state
            ctx.save();
            ctx.beginPath();
            ctx.moveTo(120, 225);
            ctx.bezierCurveTo(120, 225, 0, 150, 0, 75);
            ctx.bezierCurveTo(0, 10, 105, 10, 120, 60);
            ctx.bezierCurveTo(135, 10, 240, 10, 240, 75);
            ctx.bezierCurveTo(240, 150, 120, 225, 120, 225);
            ctx.closePath();
            ctx.clip();
            drawBody();
            ctx.restore();

        } else {
            // Broken Heart state
            const shift = breakPct * 35; // move halves apart
            const rot = breakPct * 0.15; // rotate outwards

            // Left Half
            ctx.save();
            ctx.translate(120, 150);
            ctx.rotate(-rot);
            ctx.translate(-shift - 120, -150);
            
            ctx.beginPath();
            ctx.moveTo(120, 225);
            ctx.bezierCurveTo(120, 225, 0, 150, 0, 75);
            ctx.bezierCurveTo(0, 10, 105, 10, 120, 60);
            // Iconic zigzag crack down the middle matching reference
            ctx.lineTo(100, 110);
            ctx.lineTo(135, 160);
            ctx.lineTo(120, 225);
            ctx.closePath();
            
            ctx.clip();
            drawBody();
            ctx.restore();

            // Right Half
            ctx.save();
            ctx.translate(120, 150);
            ctx.rotate(rot);
            ctx.translate(shift - 120, -150);
            
            ctx.beginPath();
            ctx.moveTo(120, 60);
            ctx.bezierCurveTo(135, 10, 240, 10, 240, 75);
            ctx.bezierCurveTo(240, 150, 120, 225, 120, 225);
            // Iconic zigzag crack back up matching reference
            ctx.lineTo(135, 160);
            ctx.lineTo(100, 110);
            ctx.lineTo(120, 60);
            ctx.closePath();
            
            ctx.clip();
            drawBody();
            ctx.restore();
        }

        // Overlay Labels
        if (breakPct === 0) {
            ctx.textAlign    = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillStyle    = 'white';
            ctx.shadowColor  = 'rgba(0,0,0,0.4)';
            ctx.shadowBlur   = 8;

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
        }

        ctx.restore(); // restore OFS translation
        ctx.restore(); // restore dpr scale
    }, [label]);

    const startLoop = useCallback(() => {
        const loop = (ts) => {
            if (!s.current.startTime) s.current.startTime = ts;
            const elapsed = ts - s.current.startTime;
            s.current.pct = Math.min(100, (elapsed / DURATION) * 100);
            s.current.waveOff += 0.07;
            draw();

            if (s.current.pct < 100) requestAnimationFrame(loop);
            else {
                s.current.running = false;
                s.current.done = true;
                draw();
                onFilled?.();
            }
        };
        s.current.rafId = requestAnimationFrame(loop);
    }, [draw, onFilled]);

    const startBreakLoop = useCallback(() => {
        let startTime = null;
        const brkLoop = (ts) => {
            if (!startTime) startTime = ts;
            const elapsed = ts - startTime;
            // 800ms bouncy break effect
            const progress = Math.min(1, elapsed / 800); 
            // elastic easing out
            const easeOutElastic = progress === 0 ? 0 : progress === 1 ? 1 : Math.pow(2, -10 * progress) * Math.sin((progress * 10 - 0.75) * ((2 * Math.PI) / 3)) + 1;
            s.current.breakPct = easeOutElastic;
            draw();

            if (progress < 1) s.current.rafId = requestAnimationFrame(brkLoop);
        };
        s.current.rafId = requestAnimationFrame(brkLoop);
    }, [draw]);

    const handleClick = useCallback(() => {
        if (s.current.running || s.current.done || disabled || s.current.breakPct > 0) return;
        s.current.running = true;
        s.current.startTime = null;
        onStart?.();
        startLoop();
    }, [disabled, onStart, startLoop]);

    useEffect(() => {
        if (!disabled && !isBroken) {
            if (s.current.rafId) cancelAnimationFrame(s.current.rafId);
            s.current = { pct: 0, waveOff: 0, running: false, done: false, startTime: null, rafId: null, breakPct: 0 };
            draw();
        }
    }, [disabled, isBroken, draw]);

    useEffect(() => {
        if (isBroken) {
            if (s.current.rafId) cancelAnimationFrame(s.current.rafId);
            s.current.breakPct = 0;
            startBreakLoop();
        }
    }, [isBroken, startBreakLoop]);

    useEffect(() => { draw(); }, [draw]);

    return (
        <canvas
            ref={canvasRef}
            className={`interactive-heart ${(disabled || s.current.breakPct > 0) ? 'disabled' : ''}`}
            width={CANV_SIZE * dpr}
            height={CANV_SIZE * dpr}
            onClick={handleClick}
            style={{
                display: 'block',
                width: `${CANV_SIZE}px`,
                height: `${CANV_SIZE}px`,
                marginLeft: `-${OFS}px`,
                marginTop: `-${OFS}px`,
                marginBottom: `-${OFS}px`,
                marginRight: `-${OFS}px`,
                clipPath: isBroken ? 'none' : "path('M 170 275 C 170 275 50 200 50 125 C 50 60 155 60 170 110 C 185 60 290 60 290 125 C 290 200 170 275 170 275 Z')",
                filter: 'drop-shadow(0 20px 30px rgba(0, 0, 0, 0.55)) drop-shadow(0 5px 10px rgba(100, 0, 0, 0.4))',
                transform: `scale(${isBroken ? 0.95 : 1})`
            }}
        />
    );
}
