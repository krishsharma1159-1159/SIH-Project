import React, { useState } from 'react';
import { useMeghnetra } from '../context/MeghnetraContext';
import { ForecastHorizonId } from '../types';

export const ForecastChart: React.FC = () => {
  const { currentForecasts, selectedForecastHour, setSelectedForecastHour, selectedLocation } =
    useMeghnetra();

  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  // Dimensions
  const width = 760;
  const height = 180;
  const padding = { top: 20, right: 30, bottom: 30, left: 45 };

  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  const numPoints = currentForecasts.length;
  const getX = (index: number) => padding.left + (index / (numPoints - 1)) * chartWidth;
  const getY = (val: number) => padding.top + chartHeight - (val / 100) * chartHeight;

  // Build SVG path strings
  const stormPoints = currentForecasts.map((f, i) => `${getX(i)},${getY(f.stormProb)}`);
  const cloudburstPoints = currentForecasts.map((f, i) => `${getX(i)},${getY(f.cloudburstProb)}`);
  const floodPoints = currentForecasts.map((f, i) => `${getX(i)},${getY(f.flashFloodProb)}`);

  const stormPath = `M ${stormPoints.join(' L ')}`;
  const cloudburstPath = `M ${cloudburstPoints.join(' L ')}`;
  const floodPath = `M ${floodPoints.join(' L ')}`;

  // Area paths
  const stormArea = `M ${getX(0)},${getY(0)} L ${stormPoints.join(' L ')} L ${getX(
    numPoints - 1
  )},${getY(0)} Z`;
  const floodArea = `M ${getX(0)},${getY(0)} L ${floodPoints.join(' L ')} L ${getX(
    numPoints - 1
  )},${getY(0)} Z`;

  const hoveredData = hoveredIndex !== null ? currentForecasts[hoveredIndex] : null;

  return (
    <div className="w-full bg-[#f8f9ff] border border-[#c3c6d7]/40 rounded-lg p-3">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-2">
          <span className="font-label-caps text-[11px] uppercase text-[#004ac6] font-bold">
            Multi-Hazard Progression Curve
          </span>
          <span className="text-[11px] text-[#434655] font-data-mono">
            (Nowcast Probability Timeline)
          </span>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-3 font-data-mono text-[11px]">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#ba1a1a]"></span>
            <span className="text-[#0b1c30] font-semibold">Severe Storm</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#ea580c]"></span>
            <span className="text-[#0b1c30] font-semibold">Cloudburst</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#2563eb]"></span>
            <span className="text-[#0b1c30] font-semibold">Flash Flood</span>
          </div>
        </div>
      </div>

      {/* SVG Chart Container */}
      <div className="relative w-full overflow-x-auto">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-44 select-none"
          preserveAspectRatio="none"
        >
          <defs>
            <linearGradient id="stormGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#ba1a1a" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#ba1a1a" stopOpacity="0.0" />
            </linearGradient>
            <linearGradient id="floodGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#2563eb" stopOpacity="0.2" />
              <stop offset="100%" stopColor="#2563eb" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Grid lines */}
          {[0, 25, 50, 75, 100].map((level) => (
            <g key={level}>
              <line
                x1={padding.left}
                y1={getY(level)}
                x2={width - padding.right}
                y2={getY(level)}
                stroke="#c3c6d7"
                strokeOpacity={level === 0 ? 0.8 : 0.35}
                strokeDasharray={level === 0 ? undefined : '3,3'}
              />
              <text
                x={padding.left - 8}
                y={getY(level) + 4}
                textAnchor="end"
                className="fill-[#434655] font-mono text-[10px]"
              >
                {level}%
              </text>
            </g>
          ))}

          {/* Area Fills */}
          <path d={stormArea} fill="url(#stormGradient)" />
          <path d={floodArea} fill="url(#floodGradient)" />

          {/* Lines */}
          <path
            d={floodPath}
            fill="none"
            stroke="#2563eb"
            strokeWidth="2.5"
            strokeLinecap="round"
          />
          <path
            d={cloudburstPath}
            fill="none"
            stroke="#ea580c"
            strokeWidth="2.5"
            strokeDasharray="5,3"
            strokeLinecap="round"
          />
          <path
            d={stormPath}
            fill="none"
            stroke="#ba1a1a"
            strokeWidth="3"
            strokeLinecap="round"
          />

          {/* X Axis Time Labels & Interactive Vertical Hover Lines */}
          {currentForecasts.map((f, i) => {
            const x = getX(i);
            const isSelected = selectedForecastHour === f.id;

            return (
              <g key={f.id}>
                {/* Active/Selected indicator column */}
                {isSelected && (
                  <rect
                    x={x - 24}
                    y={padding.top}
                    width="48"
                    height={chartHeight}
                    fill="#004ac6"
                    fillOpacity="0.08"
                    rx="4"
                  />
                )}

                <line
                  x1={x}
                  y1={padding.top}
                  x2={x}
                  y2={padding.top + chartHeight}
                  stroke={isSelected ? '#004ac6' : '#c3c6d7'}
                  strokeWidth={isSelected ? 1.5 : 1}
                  strokeDasharray="2,2"
                />

                {/* Storm Point */}
                <circle
                  cx={x}
                  cy={getY(f.stormProb)}
                  r={isSelected ? 5.5 : 4}
                  fill="#ba1a1a"
                  stroke="#ffffff"
                  strokeWidth="2"
                />

                {/* Cloudburst Point */}
                <circle
                  cx={x}
                  cy={getY(f.cloudburstProb)}
                  r={isSelected ? 5 : 3.5}
                  fill="#ea580c"
                  stroke="#ffffff"
                  strokeWidth="1.5"
                />

                {/* Flood Point */}
                <circle
                  cx={x}
                  cy={getY(f.flashFloodProb)}
                  r={isSelected ? 5 : 3.5}
                  fill="#2563eb"
                  stroke="#ffffff"
                  strokeWidth="1.5"
                />

                {/* Label text */}
                <text
                  x={x}
                  y={height - 8}
                  textAnchor="middle"
                  className={`font-mono text-[10px] cursor-pointer ${
                    isSelected ? 'fill-[#004ac6] font-bold' : 'fill-[#0b1c30]'
                  }`}
                  onClick={() => setSelectedForecastHour(f.id as ForecastHorizonId)}
                >
                  {f.label.split(' ')[0]}
                </text>

                {/* Invisible hover capture column */}
                <rect
                  x={x - (chartWidth / (numPoints - 1)) / 2}
                  y={padding.top}
                  width={chartWidth / (numPoints - 1)}
                  height={chartHeight}
                  fill="transparent"
                  className="cursor-pointer"
                  onMouseEnter={() => setHoveredIndex(i)}
                  onMouseLeave={() => setHoveredIndex(null)}
                  onClick={() => setSelectedForecastHour(f.id as ForecastHorizonId)}
                />
              </g>
            );
          })}
        </svg>

        {/* Hover / Active Telemetry Tooltip */}
        {hoveredData && (
          <div className="absolute top-2 right-4 bg-white/95 border border-[#c3c6d7] rounded-lg shadow-md p-2 font-data-mono text-[11px] z-30 pointer-events-none">
            <div className="font-bold text-[#0b1c30] border-b border-[#e5eeff] pb-1 mb-1">
              {hoveredData.label} ({hoveredData.timeUtc})
            </div>
            <div className="text-[#ba1a1a]">Storm: {hoveredData.stormProb}%</div>
            <div className="text-[#ea580c]">Cloudburst: {hoveredData.cloudburstProb}%</div>
            <div className="text-[#2563eb]">Flash Flood: {hoveredData.flashFloodProb}%</div>
            <div className="text-[10px] text-[#434655] mt-1">{hoveredData.notes}</div>
          </div>
        )}
      </div>
    </div>
  );
};
