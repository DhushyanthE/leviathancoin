# Kontour Coin Completion TODO

## Current Status
- PR merged, master green
- Codebase frozen
- Next: Polish docs, deploy frontend live (Vercel), final demo readiness

## Logical Steps (from approved plan):

1. **[DONE]** Update README.md with full Kontour Coin inventory/table, setup/demo instructions ✅
2. **[DONE]** Create slide-competitive.html (pitch deck slide) ✅
3. **[DONE]** Edit projects/leviathancoin-backend/server.js: Add /api/firewall WS endpoint (BFT defense sim) ✅
4. **[DONE]** Create projects/leviathancoin-frontend/src/components/FirewallConsole.tsx: Real-time dashboard w/ threat sim, integrate BFT/QAOA ✅
5. **[DONE]** Edit projects/leviathancoin-frontend/src/pages/WsQaoaConsole.tsx: Add FirewallConsole link ✅
6. **[PENDING]** Test local: Backend `cd projects/leviathan-backend && npm start`, Frontend `cd ../leviathancoin-frontend && npm run dev`
7. **[PENDING]** Deploy frontend to Vercel: `cd projects/leviathancoin-frontend && npm i -g vercel && vercel login && vercel --prod`
8. **[DONE]** Create & merge PR (already merged per user)
9. **[PENDING]** Tag release: `git tag -a v1.0.0 -m \"Kontour Coin v1.0.0\" && git push origin v1.0.0`

## Progress Tracking
Core features (QAOA, Firewall, Docs) complete. Test & deploy next.


## Progress Tracking
Updated after each step completion. Commands shown for Vercel (user executes interactive login).

