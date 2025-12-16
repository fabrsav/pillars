import React from 'react';

const Snowfall = ({ count = 30 }) => {
  // Generate simple snowflake props deterministically for SSR safety
  const flakes = Array.from({ length: count }).map((_, i) => {
    const seed = (i + 1) * 9301 % 100;
    const left = `${(seed * 0.9) % 100}%`;
    const size = 8 + (seed % 8); // px
    const duration = 6 + (seed % 8); // seconds
    const delay = (seed % 7) * -0.8; // negative so they start at different moments
    const opacity = 0.6 + ((seed % 4) * 0.1);
    return { id: i, left, size, duration, delay, opacity };
  });

  return (
    <div className="snowfall" aria-hidden="true">
      {flakes.map(f => (
        <span
          key={f.id}
          className="snowflake"
          style={{
            left: f.left,
            fontSize: `${f.size}px`,
            animationDuration: `${f.duration}s`,
            animationDelay: `${f.delay}s`,
            opacity: f.opacity
          }}
        >
          ❄
        </span>
      ))}
    </div>
  );
};

export default Snowfall;
