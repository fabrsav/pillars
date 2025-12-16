import React from 'react';

const SantaHat = ({ className = 'santa-hat' }) => (
  <svg className={className} viewBox="0 0 64 40" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">
    <g fill="none" fillRule="evenodd">
      <path d="M4 30c0 5.5 9 10 28 10s28-4.5 28-10c0-5.5-9-10-28-10S4 24.5 4 30z" fill="#fff" />
      <path d="M10 26c6-10 22-18 36-8-6-12-28-12-36 8z" fill="#c62828" />
      <circle cx="58" cy="10" r="5" fill="#fff" />
    </g>
  </svg>
);

export default SantaHat;
