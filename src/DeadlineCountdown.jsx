import React, { useState, useEffect } from 'react';

const DeadlineCountdown = ({ deadline }) => {
  const [timeLeft, setTimeLeft] = useState(null);

  useEffect(() => {
    if (!deadline) {
      setTimeLeft(null);
      return;
    }

    const interval = setInterval(() => {
      const now = new Date();
      const target = new Date(deadline);
      const difference = target - now;

      if (difference <= 0) {
        setTimeLeft({ expired: true });
        clearInterval(interval);
        return;
      }

      const days = Math.floor(difference / (1000 * 60 * 60 * 24));
      const hours = Math.floor((difference / (1000 * 60 * 60)) % 24);
      const minutes = Math.floor((difference / 1000 / 60) % 60);
      const seconds = Math.floor((difference / 1000) % 60);

      setTimeLeft({ days, hours, minutes, seconds, expired: false });
    }, 1000);

    return () => clearInterval(interval);
  }, [deadline]);

  if (!timeLeft || !deadline) {
    return null;
  }

  if (timeLeft.expired) {
    return <span className="text-xs text-gray-500">Scaduto</span>;
  }

  const { days, hours, minutes, seconds } = timeLeft;

  let colorClass = 'text-green-400';
  if (days < 1) {
    colorClass = 'text-red-500 animate-pulse';
  } else if (days < 7) {
    colorClass = 'text-yellow-400';
  }

  return (
    <span className={`text-xs font-mono ${colorClass}`}>
      {days > 0 && `${days}g `}
      {hours > 0 && `${hours}h `}
      {minutes > 0 && `${minutes}m `}
      {seconds}s
    </span>
  );
};

export default DeadlineCountdown;