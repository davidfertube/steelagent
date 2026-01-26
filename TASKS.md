# Steel Agent - Launch Checklist

## ✅ COMPLETED
- [x] Frontend UI (Next.js 16)
- [x] Backend RAG pipeline (FastAPI + LangGraph)
- [x] Source citations with expandable previews
- [x] Steel crystal visualization
- [x] Mobile-responsive design
- [x] Azure deployment infrastructure (Bicep)
- [x] CI/CD pipelines (GitHub Actions)
- [x] Unit tests (frontend + backend)

---

## 🚀 YOUR TODO LIST (To Make It Production-Ready)

### Step 1: Get API Keys (5 min)
- [ ] **Google AI Studio** → https://aistudio.google.com/app/apikey
  - Create API key, copy it
- [ ] **Pinecone** → https://app.pinecone.io
  - Sign up, create index named `steel-index` (dimension: 768, metric: cosine)
  - Copy API key

### Step 2: Configure Environment (2 min)
- [ ] Create `.env` file in project root:
```bash
cp .env.example .env
```
- [ ] Add your keys to `.env`:
```
GOOGLE_API_KEY=your_google_api_key
PINECONE_API_KEY=your_pinecone_api_key
PINECONE_INDEX_NAME=steel-index
```

### Step 3: Add Documents (10 min)
- [ ] Create `/data` folder if it doesn't exist
- [ ] Add PDF documents (ASTM standards, material specs, etc.)
- [ ] Recommended: Start with 5-10 PDFs for testing

### Step 4: Ingest Documents (5 min)
```bash
# Install Python dependencies
pip install -r requirements.txt

# Run ingestion
python backend/ingest.py
```

### Step 5: Start the App (1 min)
```bash
# Terminal 1 - Frontend
npm run dev

# Terminal 2 - Backend
uvicorn backend.server:app --reload --port 8000
```

### Step 6: Test It
- [ ] Open http://localhost:3000
- [ ] Try these queries:
  - "What is the yield strength of A106 Grade B?"
  - "Does 4140 steel meet NACE MR0175 requirements?"
  - "Compare A53 and A106 for high-temperature service"

---

## 🌐 AZURE DEPLOYMENT (Optional - For Live Demo)

### Step 1: Azure Setup
- [ ] Create Azure account (if needed)
- [ ] Install Azure CLI: `brew install azure-cli`
- [ ] Login: `az login`

### Step 2: Create Service Principal
```bash
az ad sp create-for-rbac --name "steel-agent-gh" --role contributor \
  --scopes /subscriptions/YOUR_SUBSCRIPTION_ID \
  --sdk-auth
```

### Step 3: Add GitHub Secrets
Go to: GitHub → Settings → Secrets → Actions
- [ ] `AZURE_CLIENT_ID`
- [ ] `AZURE_TENANT_ID`
- [ ] `AZURE_SUBSCRIPTION_ID`
- [ ] `GOOGLE_API_KEY`
- [ ] `PINECONE_API_KEY`

### Step 4: Deploy
```bash
# Deploy infrastructure
gh workflow run infra-deploy.yml -f environment=dev

# Push to trigger app deployment
git push origin main
```

---

## 📸 PORTFOLIO (After Launch)

- [ ] Take screenshot (1200x630)
- [ ] Update portfolio project card
- [ ] Add live demo link

---

## Quick Commands

| Task | Command |
|------|---------|
| Start frontend | `npm run dev` |
| Start backend | `uvicorn backend.server:app --reload --port 8000` |
| Run tests | `npm test && pytest backend/tests/` |
| Ingest docs | `python backend/ingest.py` |
| Build | `npm run build` |

---

## URLs

- **Frontend**: http://localhost:3000
- **Backend**: http://localhost:8000
- **Health Check**: http://localhost:8000/health
- **GitHub**: https://github.com/davidfertube/knowledge_tool
