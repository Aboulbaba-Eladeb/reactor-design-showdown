# Reactor Design Showdown

A responsive, browser-based reactor sizing calculator built with Next.js App Router, TypeScript, and Tailwind CSS. Change the feed rate, rate constant, or conversion to update both reactor volumes and the Levenspiel plot.

## Run locally

Use Node.js 22 LTS or newer. Run `npm ci`, then `npm run dev`, and open the local URL printed in your terminal. To generate a static production site, run `npm run build`. The output is in `out/`.

## Model

Assumes an ideal steady-state, isothermal reactor, constant density, and a first-order irreversible reaction. With volumetric flow Q in L/min, k in min⁻¹, and fractional conversion X, the CSTR volume is (Q/k)X/(1−X) and the PFR volume is −(Q/k)ln(1−X). At 10 L/min, 0.5 min⁻¹, and 80% conversion the volumes are 80.0 L and 32.2 L.

## Model workspaces

**Compare volumes** sizes steady-state isothermal CSTRs and PFRs for any power-law order from 0 through 4. The rate constant's units follow the selected order.

**Explore profiles** supports closed batch runs, CSTR startup, steady plug flow, and equal-volume isothermal tanks in series. Select an adiabatic or constant-temperature jacket model for the first three. The reference rate constant is specified at the feed temperature (or the chosen batch reference temperature). The thermal model uses Arrhenius kinetics, constant density and heat capacity, and a signed reaction enthalpy. Negative enthalpy releases heat.

Profiles use exact frozen-temperature reaction steps interleaved with flow and jacket exchange, refining the time grid until successive sampled concentrations and temperatures agree. Batch target times use linear interpolation between samples. Tank cascades solve the outlet material balance per stage. Run `npm test` for analytical checks of the balances and sizing equations.
