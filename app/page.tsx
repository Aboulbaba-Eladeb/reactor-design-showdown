'use client'
import { useRef, useState } from 'react'
import { VolumeChart, formatVolume } from './chart'

import { Experiments, OrderControl, rateUnit } from './experiments'
import { sizeReactors } from './models'

function Mark() {
  return <svg width="35" height="35" viewBox="0 0 36 36" fill="none" aria-hidden="true"><rect width="36" height="36" rx="10" fill="#0e675e"/><g stroke="#fff" strokeWidth="1.6" strokeLinejoin="round"><path d="M12 8h12m-9 0v7L9 25q-1 3 2 3h14q3 0 2-3l-6-10V8"/><path d="M13 21q3-2 6 0t5 0"/></g></svg>
}

function NumberField({label, unit, value, onChange}: {label: string; unit: string; value: string; onChange: (value:string)=>void}) {
  const valid = Number(value)>0 && Number(value)<=1e9 && Number(value)>=1e-9
  return <label className="block"><span className="field-label">{label}</span><span className="input-box"><input type="number" min="0.000000001" max="1000000000" step="any" value={value} onChange={e=>onChange(e.target.value)} aria-invalid={!valid}/><span>{unit}</span></span>{!valid && <small className="error">Enter a value from 10⁻⁹ to 10⁹.</small>}</label>
}

function ResultCard({kind, volume}: {kind:'cstr'|'pfr'; volume:number|null}) {
  const tank = kind === 'cstr'
  return <article className={'result '+kind}>
    <div className="result-copy"><span className="model-name">{kind.toUpperCase()}</span><h3>{tank ? 'Stirred-tank reactor' : 'Plug-flow reactor'}</h3>
      <div className="volume">{volume === null ? '—' : formatVolume(volume)} <span>L</span></div>
      <p>Required volume</p></div>
    <img src={'/'+kind+'.webp'} alt="" className="reactor-image"/>
  </article>
}

export default function Simulator() {
  const [flow,setFlow] = useState('10')
  const [rate,setRate] = useState('0.5')
  const [percent,setPercent] = useState(80)
  const [view,setView] = useState('sizing')
  const [order,setOrder] = useState('1')
  const [concentration,setConcentration] = useState('1')
  const dialog = useRef<HTMLDialogElement>(null)
  const valid = [flow,rate,concentration].every(v => Number(v)>=1e-9 && Number(v)<=1e9)
  const validOrder = order.trim() !== "" && Number(order)>=0 && Number(order)<=4
  const fraction = percent/100
  const {scale,cstr:tank,pfr:tube} = sizeReactors(+flow,+rate,+concentration,+order,fraction)
  function reset() { setFlow('10'); setRate('0.5'); setPercent(80); setOrder('1'); setConcentration('1') }
  return <>
    <header><div className="shell flex items-center justify-between gap-4"><div className="brand"><Mark/> Reactor Lab</div><button className="notes-button" onClick={()=>dialog.current?.showModal()}><span aria-hidden="true">ⓘ</span> Model notes</button></div></header>
    <main className="shell">
      <div className="intro"><h1>Reactor design <em>showdown</em></h1><p>Size ideal reactors and explore how kinetics, mixing, and heat transfer shape conversion.</p></div>
      <nav className="switcher" aria-label="Simulation workspace">{[["sizing","Compare volumes"],["profiles","Explore profiles"]].map(([key,label])=><button key={key} aria-pressed={view===key} onClick={()=>setView(key)}>{label}</button>)}</nav>
      <div hidden={view!=="profiles"}><Experiments/></div>
      <div hidden={view!=="sizing"}><div className="workspace">
        <aside className="panel setup"><div className="flex items-center justify-between gap-3"><h2>Reaction setup</h2><button className="reset" onClick={reset}>↺ Reset</button></div>
          <div className="kinetics"><span>Reaction model</span><b>A → B</b><small>Power-law · Isothermal</small></div>
          <div className="fields"><OrderControl value={order} change={setOrder}/><NumberField label="Inlet concentration" unit="mol/L" value={concentration} onChange={setConcentration}/><NumberField label="Volumetric feed rate" unit="L/min" value={flow} onChange={setFlow}/><NumberField label="Rate constant" unit={rateUnit(+order)} value={rate} onChange={setRate}/></div>
          <div className="conversion"><div className="flex items-center justify-between"><label htmlFor="target" className="field-label">Target conversion</label><output htmlFor="target">{percent}%</output></div>
          <input id="target" type="range" min="0" max="99" value={percent} aria-valuetext={percent+' percent'} onChange={e=>setPercent(Number(e.target.value))} style={{background:'linear-gradient(to right,#0f7166 '+percent/99*100+'%,#dde5df 0)'}}/>
          <div className="bounds"><span>0%</span><span>99%</span></div></div>
        </aside>
        <section className="min-w-0"><div className="results"><ResultCard kind="cstr" volume={valid&&validOrder?tank:null}/><ResultCard kind="pfr" volume={valid&&validOrder?tube:null}/></div>
          <div className="comparison" role="status"><span aria-hidden="true">≈</span>{!valid||!validOrder?'Enter valid reaction inputs to compare volumes.':percent===0?'At zero conversion, both required volumes are zero.':+order===0?"At zero order, both reactors require the same volume.":<>The PFR requires <strong>{((1-tube/tank)*100).toFixed(1)}% less volume</strong> at {percent}% conversion.</>}</div>
          <section className="panel plot"><div className="plot-head"><div><h2>Levenspiel plot</h2><p>Shaded areas represent reactor volume.</p></div><div className="legend"><span><i/>CSTR</span><span><i/>PFR</span></div></div>
            {valid&&validOrder?<VolumeChart order={+order} scale={scale} conversion={fraction}/>:<p className="empty">The plot updates when both inputs are valid.</p>}
          </section>
        </section>
      </div>
      </div>
    </main>
    <footer className="shell border-t border-[#d6dfd9] py-5 text-sm text-[#536663]">
      Built by <a href="https://eladebaboulbaba.com" className="font-semibold text-[#0e665b] underline decoration-[#a8c8bd] underline-offset-4 hover:decoration-current">eladebaboulbaba.com</a>
    </footer>
    <dialog ref={dialog} aria-labelledby="notes-title"><div className="flex items-center justify-between"><h2 id="notes-title">Model notes</h2><button className="notes-button" onClick={()=>dialog.current?.close()}>Close</button></div>
      <p>Volume comparison assumes steady state, constant density and temperature, and an irreversible rate kCᴺ. The formulas below apply to first order. Other orders use the same outlet-rate rectangle and integrated curve.</p>
      <h3>Stirred-tank reactor</h3><code>V = (Q/k) X/(1 − X)</code><p>Perfect mixing makes the rate equal to the outlet rate throughout the tank. Its volume is the rectangle on the plot.</p>
      <h3>Plug-flow reactor</h3><code>V = −(Q/k) ln(1 − X)</code><p>The rate varies along the tube. Integrating from the inlet to the target conversion gives the area beneath the curve.</p><p>In Explore profiles, batch and startup balances advance in time. Plug flow advances along reactor volume. Non-isothermal runs use Arrhenius kinetics and a constant volumetric heat capacity. Jacket exchange is proportional to the coolant–reactor temperature difference. Tanks in series use equal, isothermal, perfectly mixed stages.</p><p>Q is volumetric feed rate, k is the rate constant, and X is conversion expressed as a fraction.</p>
    </dialog>
  </>
}
