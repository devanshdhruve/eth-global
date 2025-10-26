# How to Run the Complete ETH Online Project

## Fixed Issues
✅ Removed hardcoded .env paths from all agents  
✅ Added proper environment variable validation  
✅ Fixed TypeScript import paths and aliases  
✅ Updated index.ts with correct createProject signature  

---

## Prerequisites

### 1. Set up Environment Variables

Create/update `.env` file in **agents** folder:
```env
# Hedera Testnet Configuration
HEDERA_TESTNET_ACCOUNT_ID=0.0.xxxxx
HEDERA_TESTNET_PRIVATE_KEY=your-private-key-here
HEDERA_TESTNET_OPERATOR_KEY=your-private-key-here

# HCS Topic IDs
PROJECT_TOPICS_ID=0.0.xxxxx
SCREENING_TOPICS_ID=0.0.xxxxx
SCREENING_TOPIC_ID=0.0.xxxxx

# OpenAI
OPENAI_API_KEY=sk-xxxxx
```

Create/update `.env.local` in **ui** folder:
```env
# Hedera Configuration
HEDERA_TESTNET_ACCOUNT_ID=0.0.xxxxx
HEDERA_TESTNET_PRIVATE_KEY=your-private-key-here

# HCS Topic IDs
PROJECT_TOPICS_ID=0.0.xxxxx
SCREENING_TOPICS_ID=0.0.xxxxx

# Clerk Authentication (if using)
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_xxx
CLERK_SECRET_KEY=sk_xxx
```

### 2. Install Dependencies

```powershell
# Install UI dependencies
cd ui
npm install --legacy-peer-deps

# Install Agents dependencies
cd ..\agents
npm install

# Install Python dependencies (if using screening.py)
python -m venv venv
.\venv\Scripts\Activate.ps1
pip install openai python-dotenv
```

---

## Running the Complete System (3 Terminals)

### Terminal 1: Next.js UI + API Routes
```powershell
cd "C:\Users\dines\Desktop\Hack Projects\eth_online\ui"
npm run dev
```
**What it does:**
- Runs Next.js on http://localhost:3000
- Serves frontend UI
- Provides API endpoints: `/api/projects`, `/api/screening-result`, `/api/upload`

---

### Terminal 2: TypeScript Agents (Task Manager + Assignment)
```powershell
cd "C:\Users\dines\Desktop\Hack Projects\eth_online\agents"
npx tsx index.ts
```
**What it does:**
- Initializes TaskManagerAgent
- Creates sample projects with IPFS hashes
- Listens to HCS for screening results
- Handles project assignment/failure logic

**Note:** If you get errors:
- Check that `.env` file exists in `agents` folder
- Verify `HEDERA_TESTNET_PRIVATE_KEY` is set correctly
- Make sure HCS topic IDs are valid

---

### Terminal 3: Python Screening Agent (Optional)
```powershell
cd "C:\Users\dines\Desktop\Hack Projects\eth_online\agents"
.\venv\Scripts\Activate.ps1
python screening.py
```
**What it does:**
- Evaluates screening tests using OpenAI
- Publishes screening results (pass/fail) to HCS

**Note:** Requires `OPENAI_API_KEY` in `.env`

---

## Complete Workflow

1. **User visits UI** → http://localhost:3000/projects
2. **Sees available projects** from HCS (via `/api/projects`)
3. **Clicks "Start Screening"** → takes a test
4. **Submits test** → API publishes to HCS screening-results topic
5. **Python agent evaluates** → uses OpenAI to grade, publishes result
6. **TaskAssignmentAgent listens** → sees screening result on HCS:
   - ✅ **Pass** → assigns project to user, adds to "Your Projects"
   - ❌ **Fail** → marks project as failed, shows "Screening Failed" badge
7. **UI refreshes** → user sees updated status in "Your Projects" tab

---

## Troubleshooting

### Error: "Cannot read properties of undefined (reading 'startsWith')"
**Cause:** `HEDERA_TESTNET_PRIVATE_KEY` is undefined  
**Fix:** Add it to your `.env` file in the agents folder

### Error: "File 'hedera/hcs/topics.ts' is not under 'rootDir'"
**Cause:** TypeScript config issue  
**Fix:** Already fixed - removed `rootDir` from `agents/tsconfig.json`

### Error: "Expected 5 arguments, but got 3" in index.ts
**Cause:** createProject signature changed  
**Fix:** Already fixed - added tasks array and instruction parameters

### UI shows "No projects found"
**Possible causes:**
1. No projects published to HCS yet → Run Terminal 2 first
2. Invalid HCS topic IDs in `.env`
3. Mirror node API issues → Check console logs

### "Your Projects" is empty
**Possible causes:**
1. No screening results yet → Complete a screening test first
2. `currentUserId` placeholder in API doesn't match your test data
3. Check browser console and server logs for errors

---

## Key Files Changed

- ✅ `agents/taskmanager.ts` - Removed hardcoded dotenv path, added env validation
- ✅ `agents/screening.ts` - Removed hardcoded dotenv path
- ✅ `agents/tsconfig.json` - Fixed rootDir and added path aliases
- ✅ `agents/index.ts` - Updated createProject calls with proper arguments
- ✅ `hedera/hcs/topics.ts` - Removed hardcoded path, flexible env vars
- ✅ `ui/app/api/projects/route.ts` - Added screening status handling
- ✅ `ui/app/projects/page.tsx` - Shows pass/fail badges dynamically

---

## Next Steps

1. **Create actual HCS topics** and update `.env` with real topic IDs
2. **Replace** `currentUserId = "user-123-placeholder"` in `/api/projects/route.ts` with real auth
3. **Test the flow:**
   - Create a project
   - Submit a screening test
   - Verify assignment or failure shows correctly
4. **Add authentication** (Clerk/wallet-based) for real user identification

---

## Architecture Summary

```
┌─────────────────┐
│   Next.js UI    │ ← User interacts here
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  API Routes     │ ← /api/projects, /api/screening-result
│  (Next.js)      │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Hedera HCS     │ ← Immutable message topics
│  (Consensus)    │    - projects-updates
└────────┬────────┘    - screening-results
         │              - task-assignments
         ▼
┌─────────────────────────────────┐
│  Off-chain Agents               │
│  ┌──────────────────────────┐  │
│  │ TaskManagerAgent         │  │ ← Creates projects
│  │ TaskAssignmentAgent      │  │ ← Assigns/fails based on screening
│  │ ScreeningAgent (Python)  │  │ ← Evaluates tests with OpenAI
│  └──────────────────────────┘  │
└─────────────────────────────────┘
```

Good luck! 🚀
