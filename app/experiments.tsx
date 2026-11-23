'use client'
import { useState } from 'react'
import { cascade, profile, type Conditions, type Mode, type Point, type Thermal } from './models'

export function rateUnit(n:number) {
  if(n===1) return 'min⁻¹'
  if(n===0) return 'mol/L/min'
  if(n===2) return 'L/mol/min'
  return '(mol/L)^(' + Number((1-n).toFixed(4)) + ')/min'
}

export function OrderControl({value,change}:{value:string;change:(s:string)=>void}) {
  return <label><span className="field-label">Reaction order, n</span><span className="input-box"><input type="number" min="0" max="4" step="any" value={value} onChange={e=>change(e.target.value)}/></span>
    <small className="bounds">0–4, including fractional orders</small></label>
}

const modes = {batch:'Batch reactor',startup:'CSTR startup',tube:'Plug-flow reactor',series:'Tanks in series'}
const defaults = {order:'1',k:'0.5',feed:'1',initial:'1',q:'10',volume:'40',duration:'10',stages:'4',inletT:'300',initialT:'300',jacketT:'290',ea:'45',enthalpy:'-40',capacity:'4',exchange:'0.2'}
type Key = keyof typeof defaults
type Field = [Key,string,string,number,number]

function Trend({points,metric,axis,staged}:{points:Point[];metric:'c'|'t';axis:string;staged:boolean}) {
  const values=points.map(p=>p[metric])
  const min=metric==='c'?0:Math.floor(Math.min(...values)-1)
  const max=Math.max(min+0.001,...values)+(metric==='t'?1:0)
  const end=points[points.length-1].x
  const x=(p:Point)=>54+444*p.x/end
  const y=(p:Point)=>148-128*(p[metric]-min)/(max-min)
  const color=metric==='c'?'#087464':'#ae5c28'
  const label=metric==='c'?'Concentration (mol/L)':'Temperature (K)'
  return <figure className="trend"><figcaption>{label}</figcaption><svg viewBox="0 0 515 186" role="img" aria-label={label+' versus '+axis}>
    {[0,.5,1].map(f=><g key={f}><path d={'M54 '+(148-f*128)+'h444'} stroke="#d6dfd9" strokeDasharray="3 4"/><text x="46" y={152-f*128} textAnchor="end">{Number((min+f*(max-min)).toPrecision(4))}</text></g>)}
    <polyline points={points.map(p=>x(p)+','+y(p)).join(' ')} fill="none" stroke={color} strokeWidth="3"/>
    {staged&&points.map(p=><circle key={p.x} cx={x(p)} cy={y(p)} r="3" fill={color}/>)}
    {[0,...(staged&&end%2?[]:[.5]),1].map(f=><text key={f} x={54+444*f} y="173" textAnchor="middle">{Number((f*end).toPrecision(4))}</text>)}
  </svg><p className="axis-caption text-center">{axis}</p></figure>
}

export function Experiments() {
  const [mode,setMode]=useState<Mode>('batch')
  const [thermal,setThermal]=useState<Thermal>('isothermal')
  const [raw,setRaw]=useState(defaults)
  const [target,setTarget]=useState(80)
  const series=mode==='series', batch=mode==='batch', tube=mode==='tube'
  const hot=!series&&thermal!=='isothermal'
  const fields:Field[]=[
    ['k',hot?'Rate constant at reference T':'Rate constant',rateUnit(+raw.order),1e-6,1000],
  ]
  if(!batch) fields.push(['feed','Feed concentration','mol/L',0.001,100])
  if(batch||mode==='startup') fields.push(['initial','Initial concentration','mol/L',batch?0.001:0,100],['duration','Run duration','min',0.001,1000])
  if(!batch) fields.push(['q','Volumetric feed rate','L/min',0.001,10000],['volume',series?'Total reactor volume':'Reactor volume','L',0.001,10000])
  if(series) fields.push(['stages','Equal-volume tanks','',1,32])
  if(hot) {
    fields.push(['inletT',batch?'Reference temperature':'Feed & reference temperature','K',200,1000])
    if(!tube) fields.push(['initialT','Initial temperature','K',200,1000])
    fields.push(['ea','Activation energy','kJ/mol',0,200],['enthalpy','Reaction enthalpy','kJ/mol',-300,300],['capacity','Volumetric heat capacity','kJ/(L·K)',0.1,20])
    if(thermal==='jacketed') fields.push(['jacketT','Jacket temperature','K',200,1000],['exchange','Heat exchange, UA/(VρCp)','min⁻¹',0,100])
  }
  const parameters={...Object.fromEntries(Object.entries(raw).map(([k,v])=>[k,Number(v)])),mode,thermal:series?'isothermal':thermal} as Conditions
  const invalid=fields.find(([key,,,lo,hi])=>raw[key].trim()==='' || !(+raw[key]>=lo && +raw[key]<=hi) || (key==='stages'&&!Number.isInteger(+raw[key])))
  let issue=invalid?'Check '+invalid[1].toLowerCase()+'.':''
  if(raw.order.trim()===''||!(parameters.order>=0&&parameters.order<=4)) issue='Enter a reaction order between 0 and 4.'
  let points:Point[]=[]
  if(!issue) { try {points=profile(parameters)} catch(e) {issue=e instanceof Error?e.message:'Could not resolve profile.'} }
  const last=points[points.length-1]
  const axis=series?'Tank outlet (0 = feed)':tube?'Reactor volume (L)':'Elapsed time (min)'
  const endConcentration=batch?parameters.initial:parameters.feed
  const conversion=(c:number)=>100*(1-c/endConcentration)
  const result=(value:number)=>Number(value.toPrecision(5)).toString()
  let timeLabel='Beyond run duration'
  if(batch&&last) {
    const threshold=parameters.initial*(1-target/100)
    const at=points.findIndex(p=>p.c<=threshold)
    if(at===0) timeLabel='0 min'
    if(at>0) {
      const a=points[at-1],b=points[at]
      timeLabel='≈ '+result(a.x+(b.x-a.x)*(a.c-threshold)/(a.c-b.c))+' min'
    }
  }
  return <div className="workspace experiment"><aside className="panel setup experiment-setup"><div className="flex items-center justify-between"><h2>Experiment setup</h2><button className="reset" onClick={()=>{setRaw(defaults);setThermal('isothermal');setMode('batch');setTarget(80)}}>↺ Reset</button></div>
    <label>Reactor<select value={mode} onChange={e=>setMode(e.target.value as Mode)}>{Object.entries(modes).map(([key,name])=><option key={key} value={key}>{name}</option>)}</select></label>
    <label>Thermal model<select disabled={series} value={series?'isothermal':thermal} onChange={e=>setThermal(e.target.value as Thermal)}><option value="isothermal">Isothermal</option><option value="adiabatic">Adiabatic</option><option value="jacketed">Jacketed</option></select></label>
    <div className="fields"><OrderControl value={raw.order} change={order=>setRaw({...raw,order})}/>
    {fields.map(([key,label,unit,min,max])=><label key={key}><span className="field-label">{label}</span><span className="input-box"><input type="number" step={key==='stages'?1:'any'} min={min} max={max} value={raw[key]} onChange={e=>setRaw({...raw,[key]:e.target.value})}/><span>{unit}</span></span>{invalid?.[0]===key&&<small className="error">Use {key==='stages'?'a whole number':'a value'} from {min} to {max}.</small>}</label>)}</div>
    {batch&&<label>Target conversion · {target}%<input type="range" min="0" max="99" value={target} onChange={e=>setTarget(+e.target.value)}/></label>}
    </aside><section className="panel plot"><h2>{modes[mode]}</h2><p className="profile-desc">{series?'Equal tanks share a fixed total volume.':tube?'Follow the reacting fluid from inlet to outlet.':batch?'Track a closed charge as reactant is consumed.':'Follow a well-mixed tank from its initial state under a constant feed.'}</p>
    {issue?<p role="status" className="empty">{issue}</p>:last&&<>
      <div className="readouts"><div><small>Final concentration</small><b>{result(last.c)} mol/L</b></div>{mode!=='startup'&&<div><small>{batch?'Final':'Outlet'} conversion</small><b>{conversion(last.c).toFixed(2)}%</b></div>}{hot&&<div><small>Final temperature</small><b>{last.t.toFixed(2)} K</b></div>}{batch&&<div><small>Time to {target}%</small><b>{timeLabel}</b></div>}</div>
      <Trend points={points} metric="c" axis={axis} staged={series}/>
      {hot&&<Trend points={points} metric="t" axis={axis} staged={false}/>}
      {series&&<p>At the same total volume, a single CSTR reaches <strong>{conversion(cascade({...parameters,stages:1})[1].c).toFixed(2)}%</strong> conversion and an ideal PFR reaches <strong>{conversion(profile({...parameters,mode:'tube'}).slice(-1)[0].c).toFixed(2)}%</strong>.</p>}
    </>}</section></div>
}
