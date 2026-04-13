# Proof-of-Neural-Work Prototype - Execution Plan

## Steps (Approved &amp; In Progress)

### ✅ Step 0: Understand files
- Analyzed test_qaoa.py corruption (null bytes everywhere)
- test_kontour_governance.py clean pytest for Bell Scores (genesis 2000, quantum advantage 2500+)
- Poetry project with algokit pytest deps

### ✅ Step 1: Fix test_qaoa.py null bytes
- Clean code written &amp; saved successfully
- Reconstruct clean UTF-8 QAOA simulator from garbled source

### ⏳ Step 2: Verify test suite
- cd projects/leviathancoin-contracts &amp;&amp; poetry install &amp;&amp; poetry run pytest
- Expected: Green for test_kontour_governance.py etc.
- Standalone test_qaoa.py python execution

### ⏳ Step 3: Git &amp; GH CLI
- git status/branch/remote
- gh auth status (login if needed)

### ⏳ Step 4: Open PR
- git add . &amp;&amp; git commit -m "fix: test_qaoa.py null bytes, PoNW prototype"
- git push
- gh pr create --title "feat: Kontour Governance PoNW Prototype" --body "QAOA fixed, Bell Scores passing" --base main

### ⏳ Step 5: Post-merge
- Deploy leviathancoin-frontend to Vercel
- Or freeze for Seed Round

**Next: Run pytest after file fix.**
