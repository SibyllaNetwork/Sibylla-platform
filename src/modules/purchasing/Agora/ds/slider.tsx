import clsx from 'clsx';
import React, { forwardRef } from 'react';
import './slider.css';

interface SliderProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type' | 'size'> {
  min?: number;
  max?: number;
  step?: number;
  value: number;
  formatValue?: (value: number) => string;
}

/* Sibylla range slider — single-line layout: [track with thumb] [currentValue] */
export const Slider = forwardRef(function Slider(
  { min = 0, max = 100, step = 1, value, formatValue, className, style, ...rest }: SliderProps,
  ref: React.ForwardedRef<HTMLInputElement>,
) {
  const percent = max === min ? 0 : ((value - min) / (max - min)) * 100;
  const display = formatValue ? formatValue(value) : String(value);

  return (
    <div className={clsx('ds-slider', className)}>
      <div className="ds-slider__track-wrap">
        <input
          ref={ref}
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          className="ds-slider__input"
          style={{ ['--ds-slider-progress' as string]: `${percent}%`, ...style }}
          {...rest}
        />
      </div>
      <span className="ds-slider__value">{display}</span>
    </div>
  );
});
