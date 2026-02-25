import React from 'react';

export const Card = ({ children, className = '', ...props }) => {
  return (
    <div 
      className={`rounded-xl border ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};
