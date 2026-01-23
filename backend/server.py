from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from backend.agent import run_agent
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="Steel Knowledge API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class QueryRequest(BaseModel):
    query: str

@app.post("/api/chat")
async def chat(request: QueryRequest):
    try:
        response = run_agent(request.query)
        return {"response": response}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/health")
async def health():
    return {"status": "ok"}
