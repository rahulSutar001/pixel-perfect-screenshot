<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- Market data, crises and volatility math live in src/lib/market-data.ts (pure functions) and shared UI state in src/lib/tracker-store.tsx; swap mock getters for live queries there so pages stay unchanged.
- ML forecasts plug in via the VolForecaster interface in src/lib/forecast.ts; keep inputs/outputs as plain arrays for external model services.
