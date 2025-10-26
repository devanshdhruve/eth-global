# Quick Start Guide - DataChain Setup

## Prerequisites
- Node.js 18+ and npm
- Python 3.10+
- Hedera testnet account
- OpenAI API key
- Clerk account

---

## 1. Environment Setup

### UI Environment Variables
Create `ui/.env.local`:
```env
# Hedera Configuration
HEDERA_TESTNET_ACCOUNT_ID=0.0.xxxxx
HEDERA_TESTNET_PRIVATE_KEY=your-private-key-here
PROJECT_TOPICS_ID=0.0.xxxxx
SCREENING_TOPICS_ID=0.0.xxxxx
TASK_COMPLETION_TOPIC_ID=0.0.xxxxx

# Clerk Authentication
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_xxxxx
CLERK_SECRET_KEY=sk_test_xxxxx

# IPFS (Optional - has default)
PINATA_GATEWAY=https://gateway.pinata.cloud/ipfs
PINATA_API_KEY=your-pinata-api-key
PINATA_SECRET_KEY=your-pinata-secret
```

### Agents Environment Variables
Create `agents/.env`:
```env
# Hedera Configuration
HEDERA_TESTNET_ACCOUNT_ID=0.0.xxxxx
HEDERA_TESTNET_PRIVATE_KEY=your-private-key-here
HEDERA_TESTNET_OPERATOR_KEY=your-private-key-here
PROJECT_TOPICS_ID=0.0.xxxxx
SCREENING_TOPICS_ID=0.0.xxxxx
SCREENING_TOPIC_ID=0.0.xxxxx
TASK_COMPLETION_TOPIC_ID=0.0.xxxxx

# OpenAI
OPENAI_API_KEY=sk-xxxxx
```

### Screening Service Environment Variables
Create `screening-service/.env`:
```env
OPENAI_API_KEY=sk-xxxxx
```

---

## 2. Install Dependencies

### UI
```bash
cd ui
npm install
```

### Agents
```bash
cd agents
npm install
```

### Screening Service
```bash
cd screening-service
python -m venv venv

# Windows
venv\Scripts\activate

# Linux/Mac
source venv/bin/activate

pip install -r requirements.txt
```

---

## 3. Create HCS Topics (One-time Setup)

```bash
cd agents
npx tsx -e "
import { createTopics } from '../hedera/hcs/topics';
createTopics().then(() => console.log('Topics created!'));
"
```

This will create:
- projects-updates topic
- screening-results topic
- task-assignments topic
- task-completion topic
- payments topic

**Important**: Update your `.env` files with the generated topic IDs.

---

## 4. Running the Application

### Terminal 1: Screening Service
```bash
cd screening-service
venv\Scripts\activate  # Windows
python main.py
```

Service will run on `http://127.0.0.1:8000`

### Terminal 2: UI (Next.js)
```bash
cd ui
npm run dev
```

UI will run on `http://localhost:3000`

### Terminal 3: Agents
```bash
cd agents
npx tsx index.ts
```

This starts:
- TaskManagerAgent
- TaskAssignmentAgent
- AnnotatorAgents
- Screening subscriptions

---

## 5. Testing the Complete Flow

### Step 1: Create a Project (as Client)
1. Go to `http://localhost:3000/login`
2. Sign in with Clerk
3. Set role to "client" at `/api/set-role` (or via UI if available)
4. Navigate to `/client/create-project`
5. Fill in project details
6. Upload a CSV file with tasks (format: columns with 'text' or 'content')
7. Submit

### Step 2: Screen for Project (as Annotator)
1. Sign out and sign in as different user (or use incognito)
2. Set role to "annotator" and add your Hedera wallet address
3. Navigate to `/projects`
4. Click on a project
5. Click "Start Screening"
6. Answer the AI-generated questions
7. Submit for grading
8. If you pass (score >= 70), project will appear in "Your Projects"

### Step 3: Annotate Tasks
1. From "Your Projects" tab, click the project you passed screening for
2. Review project overview and guidelines
3. Click "Start Annotating"
4. For each task:
   - Read the task text (fetched from IPFS)
   - Select a label (Positive, Negative, Neutral, Mixed)
   - Optionally add notes
   - Adjust confidence slider
   - Click "Save & Continue"
5. Repeat until all tasks are completed
6. See completion screen with total reward

### Step 4: Verify on Hedera
1. Go to [Hedera Testnet Explorer](https://hashscan.io/testnet/)
2. Search for your topic IDs
3. View messages to see:
   - Project creation events
   - Screening results
   - Task completions

---

## 6. API Endpoints Reference

### Frontend APIs (Next.js)
- `GET /api/projects` - List all projects
- `GET /api/projects/[id]` - Get project details
- `GET /api/projects/[id]/tasks` - Get project tasks
- `POST /api/screening-result` - Submit screening result
- `POST /api/annotations/submit` - Submit annotation
- `GET /api/user/profile` - Get user profile
- `POST /api/set-role` - Set user role and wallet
- `POST /api/upload` - Upload project tasks

### Screening Service APIs (Python)
- `GET http://127.0.0.1:8000/` - Service info
- `GET http://127.0.0.1:8000/health` - Health check
- `POST http://127.0.0.1:8000/generate-questions` - Generate screening questions
- `POST http://127.0.0.1:8000/submit-screening` - Grade screening

---

## 7. Troubleshooting

### Screening Service Not Working
- Check that Python virtual environment is activated
- Verify `OPENAI_API_KEY` is set in `.env`
- Check logs for errors: service runs on port 8000

### Tasks Not Loading
- Verify `PINATA_GATEWAY` is accessible
- Check IPFS hashes are valid
- Look for CORS issues in browser console

### Annotations Not Submitting
- Verify `TASK_COMPLETION_TOPIC_ID` is set
- Check Hedera account has sufficient HBAR for transactions
- Look for authentication errors (user must be signed in)

### Agent Not Assigning Projects
- Verify agents are running (`npx tsx index.ts`)
- Check agent console for errors
- Verify `SCREENING_TOPICS_ID` matches in all `.env` files

### Authentication Issues
- Verify Clerk keys are correct
- Check that user has set wallet address in profile
- Try signing out and back in

---

## 8. Development Tips

### Viewing HCS Messages
```bash
# In agents directory
npx tsx -e "
import { client } from '../hedera/hcs/topics';
import { TopicMessageQuery } from '@hashgraph/sdk';

new TopicMessageQuery()
  .setTopicId('0.0.YOUR_TOPIC_ID')
  .subscribe(client, null, (message) => {
    console.log(Buffer.from(message.contents).toString());
  });
"
```

### Testing Without Screening
Temporarily modify `/api/projects/[id]/tasks/route.ts` to skip screening check:
```typescript
// Comment out this block:
// if (!userPassed) {
//   return NextResponse.json(...);
// }
```

### Clearing Browser Cache
If seeing old data, clear cache and hard reload:
- Chrome/Edge: Ctrl+Shift+Delete
- Or use Incognito/Private mode

---

## 9. Project Structure

```
eth_online/
├── ui/                          # Next.js frontend
│   ├── app/
│   │   ├── api/                 # API routes
│   │   │   ├── projects/        # ✅ Lists projects
│   │   │   │   └── [id]/        # ✅ Project details
│   │   │   │       └── tasks/   # ✅ Fetch tasks from IPFS
│   │   │   ├── annotations/     # ✅ Submit annotations
│   │   │   ├── screening-result/# ✅ Submit screening results
│   │   │   ├── user/profile/    # ✅ Get user profile
│   │   │   └── set-role/        # ✅ Set user role
│   │   └── projects/
│   │       ├── page.tsx         # ✅ Projects list (real data)
│   │       ├── [id]/page.tsx    # ✅ Annotation page (real data)
│   │       └── screening/page.tsx# ✅ Screening test
│   └── .env.local               # ✅ Environment variables
│
├── agents/                      # TypeScript agents
│   ├── taskmanager.ts           # ✅ Creates projects
│   ├── taskassignment.ts        # ✅ Assigns based on screening
│   ├── annotator.ts             # ✅ Subscribes to projects
│   ├── screening.ts             # ✅ AI screening
│   ├── index.ts                 # ✅ Main runner
│   └── .env                     # ✅ Environment variables
│
├── screening-service/           # ✅ Python FastAPI service
│   ├── main.py                  # ✅ OpenAI integration
│   ├── requirements.txt         # ✅ Dependencies
│   ├── .env                     # ✅ OpenAI API key
│   └── README.md                # ✅ Documentation
│
└── hedera/
    └── hcs/
        └── topics.ts            # ✅ HCS client setup
```

---

## 10. What's Next

### Ready to Implement:
1. Payment system (`/api/payments/trigger/route.ts`)
2. Client dashboard with real data
3. Review system
4. Health check endpoint
5. Database layer (Prisma + PostgreSQL)

### Already Working:
- ✅ Authentication with Clerk
- ✅ Project creation and upload
- ✅ Screening test generation and grading
- ✅ Project listing from HCS
- ✅ Task fetching from IPFS
- ✅ Annotation submission to HCS
- ✅ Assignment based on screening results

---

## Support

For issues or questions:
1. Check the console logs (browser + terminal)
2. Verify all environment variables are set
3. Check Hedera Testnet Explorer for HCS messages
4. Review `IMPLEMENTATION_SUMMARY.md` for detailed documentation

---

**Last Updated**: October 26, 2025
**Status**: Core annotation flow fully functional 🎉
