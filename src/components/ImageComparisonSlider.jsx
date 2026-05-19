import React, { useState, useRef, useEffect } from 'react';
import { formatBytes } from '../utils/compressor';

const ImageComparisonSlider = ({ originalUrl, optimizedUrl, originalSize, optimizedSize }) => {
  const [sliderPosition, setSliderPosition] = useState(50);
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef(null);

  const handleMove = (clientX) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(clientX - rect.left, rect.width));
    const percent = (x / rect.width) * 100;
    setSliderPosition(percent);
  };

  const handleMouseDown = (e) => {
    setIsDragging(true);
    handleMove(e.clientX);
  };

  const handleTouchStart = (e) => {
    setIsDragging(true);
    handleMove(e.touches[0].clientX);
  };

  useEffect(() => {
    const handleMouseUp = () => setIsDragging(false);
    const handleMouseMove = (e) => {
      if (isDragging) handleMove(e.clientX);
    };
    const handleTouchMove = (e) => {
      if (isDragging) handleMove(e.touches[0].clientX);
    };

    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      window.addEventListener('touchmove', handleTouchMove, { passive: false });
      window.addEventListener('touchend', handleMouseUp);
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleMouseUp);
    };
  }, [isDragging]);

  return (
    <div 
      ref={containerRef}
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        overflow: 'hidden',
        borderRadius: 'var(--radius-xl)',
        userSelect: 'none',
        backgroundColor: '#f1f5f9'
      }}
      onMouseDown={handleMouseDown}
      onTouchStart={handleTouchStart}
    >
      {/* Optimized Image (Background) */}
      <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}>
        <img 
          src={optimizedUrl} 
          alt="Optimized" 
          style={{ width: '100%', height: '100%', objectFit: 'contain', pointerEvents: 'none' }} 
        />
        <div style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'rgba(0,0,0,0.6)', color: 'white', padding: '0.25rem 0.75rem', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: 500, backdropFilter: 'blur(4px)', pointerEvents: 'none' }}>
          Optimized {optimizedSize ? `(${formatBytes(optimizedSize)})` : ''}
        </div>
      </div>

      {/* Original Image (Foreground, clipped) */}
      <div style={{ 
        position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
        clipPath: `inset(0 ${100 - sliderPosition}% 0 0)`
      }}>
        <img 
          src={originalUrl} 
          alt="Original" 
          style={{ width: '100%', height: '100%', objectFit: 'contain', pointerEvents: 'none' }} 
        />
        <div style={{ position: 'absolute', top: '1rem', left: '1rem', background: 'rgba(0,0,0,0.6)', color: 'white', padding: '0.25rem 0.75rem', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: 500, backdropFilter: 'blur(4px)', pointerEvents: 'none' }}>
          Original {originalSize ? `(${formatBytes(originalSize)})` : ''}
        </div>
      </div>

      {/* Slider Handle */}
      <div style={{
        position: 'absolute',
        top: 0,
        bottom: 0,
        left: `${sliderPosition}%`,
        width: '2px',
        backgroundColor: 'white',
        transform: 'translateX(-50%)',
        cursor: 'ew-resize',
        boxShadow: '0 0 10px rgba(0,0,0,0.3)',
        pointerEvents: 'none'
      }}>
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: '32px',
          height: '32px',
          backgroundColor: 'white',
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
        }}>
          <div style={{ display: 'flex', gap: '2px' }}>
            <div style={{ width: '2px', height: '10px', backgroundColor: '#CBD5E1', borderRadius: '1px' }}></div>
            <div style={{ width: '2px', height: '10px', backgroundColor: '#CBD5E1', borderRadius: '1px' }}></div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ImageComparisonSlider;
