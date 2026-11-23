const { test } = require('node:test')
const assert = require('node:assert/strict')
const { readFileSync } = require('node:fs')
const ts = require('typescript')
const compiled = ts.transpileModule(readFileSync(require.resolve('../app/models.ts'), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
})
const models = {}
new Function('exports', compiled.outputText)(models)
const {sizeReactors, cascade, profile} = models
const inputs = {mode:'batch',thermal:'isothermal',order:1,k:0.5,feed:1,initial:1,q:10,volume:40,duration:10,
  stages:4,inletT:300,initialT:300,jacketT:290,ea:45,enthalpy:-40,capacity:4,exchange:.2}
function near(actual,expected,tolerance=1e-7) { assert.ok(Math.abs(actual-expected)<tolerance, actual+' differs from '+expected) }
test('Steady sizing agrees with known reaction orders',()=>{
  near(sizeReactors(10,.5,1,1,.8).pfr,20*Math.log(5))
  near(sizeReactors(10,.5,1,1,.8).cstr,80)
  near(sizeReactors(10,.5,2,0,.8).pfr,32)
  near(sizeReactors(10,.5,2,2,.8).pfr,40)
  near(sizeReactors(10,.5,2,1.000000001,.8).pfr,20*Math.log(5))
})
test('A fractional-order batch depletes at finite time',()=>{
  const data=profile({...inputs,order:.5})
  near(data[24].c,.25)
  near(data.at(-1).c,0)
})
test('Batch decay and PFR residence-time equivalence',()=>{
  near(profile(inputs).at(-1).c,Math.exp(-5))
  near(profile({...inputs,mode:'tube'}).at(-1).c,Math.exp(-2))
})
test('Startup from an empty solute inventory approaches the analytical solution',()=>{
  const data=profile({...inputs,mode:'startup',initial:0})
  near(data.at(-1).c,(1-Math.exp(-.75*10))/3,1e-5)
})
test('Equal-volume CSTRs conserve material at every stage',()=>{
  cascade(inputs).forEach((p,i)=>near(p.c,(1+.5)**(-i)))
})
test('Adiabatic temperature rise conserves reaction energy',()=>{
  for(const p of profile({...inputs,thermal:'adiabatic'})) near(p.t,300+10*(1-p.c))
})
test('Jacket cooling at zero reaction enthalpy follows Newton cooling',()=>{
  const end=profile({...inputs,thermal:'jacketed',enthalpy:0}).at(-1)
  near(end.t,290+10*Math.exp(-2))
})
