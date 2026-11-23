'use client'
import { useEffect, useRef, useState } from 'react'

export function formatVolume(value: number) {
  return value >= 100000 || (value > 0 && value < 0.1)
    ? value.toExponential(2) : value.toLocaleString('en-US', {minimumFractionDigits: 1, maximumFractionDigits: 1})
}

export function VolumeChart({scale, conversion, order = 1}: {scale: number; conversion: number; order?: number}) {
  const container = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(700)
  useEffect(() => {
    const observer = new ResizeObserver(([entry]) => setWidth(Math.max(200, entry.contentRect.width)))
    if (container.current) observer.observe(container.current)
    return () => observer.disconnect()
  }, [])
  const left = width < 430 ? 54 : 68
  const right = width - 20
  const top = 18
  const base = 185
  const maxX = Math.min(0.99, Math.max(0.1, Math.ceil(conversion * 10) / 10))
  const maxY = scale / (1 - maxX)**order
  const x = (fraction: number) => left + (right-left)*fraction/maxX
  const y = (fraction: number) => base - (base-top)*((1-maxX)/(1-fraction))**order
  const line = (end: number) => Array.from({length:121}, (_, i) => {
    const fraction = end*i/120
    return (i ? 'L' : 'M') + x(fraction) + ',' + y(fraction)
  }).join(' ')
  return <div ref={container}>
    <div className="axis-caption">F<sub>A0</sub> / (−r<sub>A</sub>) · L</div>
    <svg width="100%" height="224" viewBox={'0 0 '+width+' 224'} role="img" aria-label={'Levenspiel plot at '+Math.round(conversion*100)+' percent conversion. The rectangle is the CSTR volume and the area under the curve is the PFR volume.'}>
      {[0,1,2,3,4].map(i => {
        const level = base-(base-top)*i/4
        const tick = maxY*i/4
        return <g key={i}><path d={'M'+left+' '+level+'H'+right} stroke="#dae1dc" strokeDasharray="3 4"/><text x={left-9} y={level+4} textAnchor="end">{tick === 0 ? 0 : Number(tick.toPrecision(3)).toString()}</text></g>
      })}
      <rect x={left} y={y(conversion)} width={x(conversion)-left} height={base-y(conversion)} fill="#078273" fillOpacity=".11" stroke="#078273" strokeDasharray="5 4"/>
      <path d={line(conversion)+' L'+x(conversion)+','+base+' H'+left+' Z'} fill="#e4ab65" fillOpacity=".54"/>
      <path d={line(maxX)} fill="none" stroke="#a45b22" strokeWidth="2.8"/>
      <circle cx={x(conversion)} cy={y(conversion)} r="4.5" fill="#fff" stroke="#a45b22" strokeWidth="2"/>
      {[0,1,2,3,4].map(i => <text key={i} x={x(maxX*i/4)} y={base+22} textAnchor="middle">{Number((maxX*i*25).toFixed(2))}%</text>)}
    </svg>
    <p className="axis-caption text-center">Conversion, X (%)</p>
  </div>
}
