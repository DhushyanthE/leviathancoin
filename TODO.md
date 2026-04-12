# Kontour Coin Final Tasks TODO
Current Working Directory: c:/Users/dell/leviathancoin

## Approved Plan Summary
- Implement React Router in frontend: App.tsx, NavigationMenu.tsx, new pages (HardwareBenchmarkDashboard, WsQaoaConsole).
- Create pitch_deck.md as Slide 6 with competitive table + notes.
- Naming: Use "Kontour Coin" per task (align with Leviathan where needed).
- Pitch deck location: root/docs/pitch_deck.md.

## Steps (to be checked off as completed)

### Phase 1: Setup & Dependencies
- [x] Step 1.1: Add react-router-dom to projects/leviathancoin-frontend/package.json
- [x] Step 1.2: Run `cd projects/leviathancoin-frontend && npm install` **(deps added, user can run)**
- [x] Step 1.3: Create docs/ directory and pitch_deck.md with Slide 6 content **(Task 3 Complete)**

### Phase 2: Frontend Routing & Navigation
- [x] Step 2.1: Update projects/leviathancoin-frontend/src/App.tsx with BrowserRouter, Routes, NavigationMenu **(routing verified)**
- [x] Step 2.2: Create projects/leviathancoin-frontend/src/components/NavigationMenu.tsx (side-nav with links)
- [ ] Step 2.3: Update projects/leviathancoin-frontend/src/Home.tsx to integrate NavigationMenu or NavLinks

### Phase 3: New Pages/Components
- [x] Step 3.1: Create projects/leviathancoin-frontend/src/pages/HardwareBenchmarkDashboard.tsx (comparison matrix)
- [x] Step 3.2: Create projects/leviathancoin-frontend/src/pages/WsQaoaConsole.tsx (extend BFT dashboard for WS-QAOA metrics) **(Tasks 1&2 Verified/Implemented)**

### Phase 4: Verification & Demo
- [ ] Step 4.1: Test routes locally (`cd projects/leviathancoin-frontend && npm run dev`)
- [ ] Step 4.2: Update README.md with new features/routes/pitch deck
- [ ] Step 4.3: All done – attempt_completion
