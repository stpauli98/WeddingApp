"use client";

import React, { useEffect, useRef, useState } from "react";

/**
 * Animacija šljokica (confetti) + lepa poruka za limitiran broj slika.
 * Nema eksternih zavisnosti, koristi samo CSS i canvas.
 */
export function UploadLimitReachedCelebration() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [canvasWidth, setCanvasWidth] = useState(1200);
  const [canvasHeight] = useState(200);

  useEffect(() => {
    // Postavi širinu canvasa na klijentu na širinu prozora
    if (typeof window !== "undefined") {
      setCanvasWidth(window.innerWidth);
    }
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    let animationFrameId: number;
    const width = canvas.width = canvasWidth;
    const height = canvas.height = canvasHeight;
    const colors = ["#E2C275", "#FFD700", "#FFECB3", "#FDE68A", "#FBBF24", "#FFF9C4"];
    const confettiCount = 40;
    const confetti: {x: number, y: number, r: number, d: number, color: string, tilt: number, tiltAngle: number}[] = [];
    for (let i = 0; i < confettiCount; i++) {
      confetti.push({
        x: Math.random() * width,
        y: Math.random() * height / 2,
        r: Math.random() * 7 + 7,
        d: Math.random() * confettiCount,
        color: colors[Math.floor(Math.random() * colors.length)],
        tilt: Math.random() * 10 - 10,
        tiltAngle: 0,
      });
    }
    function draw() {
      if (!ctx) return;
      ctx.clearRect(0, 0, width, height);
      confetti.forEach(c => {
        ctx.beginPath();
        ctx.ellipse(c.x, c.y, c.r, c.r * 0.6, c.tilt, 0, 2 * Math.PI);
        ctx.fillStyle = c.color;
        ctx.globalAlpha = 0.85;
        ctx.fill();
      });
      ctx.globalAlpha = 1;
    }
    function update() {
      if (!ctx) return;
      confetti.forEach(c => {
        c.y += 1.5 + Math.sin(c.d);
        c.x += Math.sin(c.d) * 0.8;
        c.tiltAngle += 0.04;
        c.tilt = Math.sin(c.tiltAngle) * 10;
        if (c.y > height) {
          c.x = Math.random() * width;
          c.y = -10;
        }
      });
    }
    function animate() {
      draw();
      update();
      animationFrameId = requestAnimationFrame(animate);
    }
    animate();
    return () => cancelAnimationFrame(animationFrameId);
  }, [canvasHeight, canvasWidth]);

  return (
    <div className="relative flex flex-col items-center justify-center py-6">
      <canvas
        ref={canvasRef}
        className="absolute left-1/2 -translate-x-1/2 top-0 pointer-events-none"
        style={{ width: "100vw", height: 150, maxWidth: "100%", zIndex: 0 }}
        width={canvasWidth}
        height={canvasHeight}
        aria-hidden
      />
      <div className="relative z-10 bg-white/90 border-2 border-[#E2C275] rounded-xl shadow-lg px-6 py-6 flex flex-col items-center">
        <span className="text-lg text-gray-700 text-center mb-2">Dostigli ste maksimalan broj slika (10/10).</span>
        <span className="text-base text-gray-500 text-center">Hvala na vašem doprinosu!</span>
      </div>
    </div>
  );
}
