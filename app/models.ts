// Concentrations in mol/L, times in min, temperatures in K, energies in kJ.
export type Point = { x: number; c: number; t: number }
export type Mode = 'batch' | 'startup' | 'tube' | 'series'
export type Thermal = 'isothermal' | 'adiabatic' | 'jacketed'
export type Conditions = {
  mode: Mode; thermal: Thermal; order: number; k: number; feed: number; initial: number
  q: number; volume: number; duration: number; stages: number; inletT: number
  initialT: number; jacketT: number; ea: number; enthalpy: number; capacity: number; exchange: number
}

export function sizeReactors(q:number, k:number, c0:number, n:number, x:number) {
  const scale = q * c0 ** (1-n) / k
  const log = -Math.log1p(-x)
  const integral = n === 1 ? log : Math.expm1((n-1)*log)/(n-1)
  return {scale, cstr:scale*x/(1-x)**n, pfr:scale*integral}
}

export function cascade(p: Conditions): Point[] {
  const tau = p.volume/(p.q*p.stages)
  const points = [{x:0,c:p.feed,t:p.inletT}]
  for(let i=1;i<=p.stages;i++) {
    const inlet = points[i-1].c
    let lo=0, hi=inlet
    for(let j=0;j<72;j++) {
      const mid=(lo+hi)/2
      if(mid+tau*p.k*mid**p.order>inlet) hi=mid
      else lo=mid
    }
    points.push({x:i,c:p.order===0 ? Math.max(0,inlet-tau*p.k) : (lo+hi)/2,t:p.inletT})
  }
  return points
}

function simulate(p:Conditions, stepsPerSample:number): Point[] {
  const startup=p.mode==='startup', tube=p.mode==='tube'
  const end=tube ? p.volume/p.q : p.duration
  const dt=end/(120*stepsPerSample)
  const dilution=startup ? p.q/p.volume : 0
  const cooling=p.thermal==='jacketed' ? p.exchange : 0
  const transport=dilution+cooling
  const feedWeight=-Math.expm1(-dilution*dt/2)
  const heatWeight=-Math.expm1(-transport*dt/2)
  const equilibriumT=transport ? (dilution*p.inletT+cooling*p.jacketT)/transport : 0
  let c=tube ? p.feed : p.initial
  let t=tube || p.thermal==='isothermal' ? p.inletT : p.initialT
  const points=[{x:0,c,t}]
  function mix() {
    c+=(p.feed-c)*feedWeight
    if(p.thermal!=='isothermal') t+=(equilibriumT-t)*heatWeight
  }
  for(let i=1;i<=120;i++) {
    for(let j=0;j<stepsPerSample;j++) {
      mix()
      const k=p.thermal==='isothermal' ? p.k : p.k*Math.exp(p.ea/0.008314462618*(1/p.inletT-1/t))
      // Exact isothermal reaction substep, capped at depletion for n < 1.
      let next=0
      if(c>0) {
        if(p.order===1) next=c*Math.exp(-k*dt)
        else {
          const change=(p.order-1)*k*dt*c**(p.order-1)
          next=change<=-1 ? 0 : c*Math.exp(-Math.log1p(change)/(p.order-1))
        }
      }
      if(p.thermal!=='isothermal') t-=p.enthalpy*(c-next)/p.capacity
      c=next
      if(!Number.isFinite(c+t)||t<=0) throw Error('The predicted state is outside the model’s physical range.')
      mix()
    }
    points.push({x:(tube?p.volume:end)*i/120,c,t})
  }
  return points
}

export function profile(p: Conditions): Point[] {
  if(p.mode==='series') return cascade(p)
  let last=simulate(p,2)
  for(const resolution of [4,8,16,32,64,128,256]) {
    const next=simulate(p,resolution)
    const tolerance=0.0005*Math.max(p.mode==='batch'?0:p.feed,p.mode==='tube'?0:p.initial,1e-9)
    if(next.every((v,i)=>Math.abs(v.c-last[i].c)<=tolerance && Math.abs(v.t-last[i].t)<=0.05)) return next
    last=next
  }
  throw Error('The profile did not converge. Shorten the run or reduce the temperature sensitivity.')
}
