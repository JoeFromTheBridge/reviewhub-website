import React, { useState, useRef, useEffect } from 'react';

const Slider = ({ 
  value = [0, 100], 
  onValueChange, 
  min = 0, 
  max = 100, 
  step = 1, 
  className = '',
  disabled = false 
}) => {
  const [localValue, setLocalValue] = useState(value);
  const [isDragging, setIsDragging] = useState(null);
  const sliderRef = useRef(null);

  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  const handleMouseDown = (index) => (e) => {
    if (disabled) return;
    setIsDragging(index);
    e.preventDefault();
  };

  const handleMouseMove = (e) => {
    if (isDragging === null || disabled) return;

    const slider = sliderRef.current;
    if (!slider) return;

    const rect = slider.getBoundingClientRect();
    const percentage = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const newValue = min + percentage * (max - min);
    const steppedValue = Math.round(newValue / step) * step;

    const newValues = [...localValue];
    newValues[isDragging] = Math.max(min, Math.min(max, steppedValue));

    // Ensure min <= max
    if (isDragging === 0 && newValues[0] > newValues[1]) {
      newValues[0] = newValues[1];
    } else if (isDragging === 1 && newValues[1] < newValues[0]) {
      newValues[1] = newValues[0];
    }

    setLocalValue(newValues);
    onValueChange?.(newValues);
  };

  const handleMouseUp = () => {
    setIsDragging(null);
  };

  useEffect(() => {
    if (isDragging !== null) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, localValue]);

  const getPercentage = (val) => ((val - min) / (max - min)) * 100;

  return (
    <div className={`relative h-6 ${className}`}>
      <div
        ref={sliderRef}
        className={`absolute top-1/2 transform -translate-y-1/2 w-full h-2 bg-gray-200 rounded-full ${
          disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
        }`}
      >
        {/* Track between thumbs */}
        <div
          className="absolute h-full bg-blue-500 rounded-full"
          style={{
            left: `${getPercentage(localValue[0])}%`,
            width: `${getPercentage(localValue[1]) - getPercentage(localValue[0])}%`
          }}
        />
        
        {/* Thumb 1 */}
        <div
          className={`absolute w-4 h-4 bg-white border-2 border-blue-500 rounded-full transform -translate-x-1/2 -translate-y-1/2 top-1/2 ${
            disabled ? 'cursor-not-allowed' : 'cursor-grab active:cursor-grabbing'
          } ${isDragging === 0 ? 'scale-110' : ''} transition-transform`}
          style={{ left: `${getPercentage(localValue[0])}%` }}
          onMouseDown={handleMouseDown(0)}
        />
        
        {/* Thumb 2 */}
        <div
          className={`absolute w-4 h-4 bg-white border-2 border-blue-500 rounded-full transform -translate-x-1/2 -translate-y-1/2 top-1/2 ${
            disabled ? 'cursor-not-allowed' : 'cursor-grab active:cursor-grabbing'
          } ${isDragging === 1 ? 'scale-110' : ''} transition-transform`}
          style={{ left: `${getPercentage(localValue[1])}%` }}
          onMouseDown={handleMouseDown(1)}
        />
      </div>
    </div>
  );
};

export { Slider };

