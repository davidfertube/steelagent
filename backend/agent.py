import os
from dotenv import load_dotenv
from typing import Annotated, Sequence, TypedDict
from langchain_core.messages import BaseMessage, HumanMessage, AIMessage
from langchain_google_genai import ChatGoogleGenerativeAI, GoogleGenerativeAIEmbeddings
from langchain_community.vectorstores import Pinecone as PineconeVectorStore
from langgraph.graph import StateGraph, END

load_dotenv()

# --- Configuration ---
GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY")
PINECONE_INDEX_NAME = os.getenv("PINECONE_INDEX_NAME", "steel-index")

if not GOOGLE_API_KEY:
    raise ValueError("GOOGLE_API_KEY missing")

# --- Model & Vector Store ---
llm = ChatGoogleGenerativeAI(model="gemini-pro", temperature=0)
embeddings = GoogleGenerativeAIEmbeddings(model="models/embedding-001")
vectorstore = PineconeVectorStore(index_name=PINECONE_INDEX_NAME, embedding=embeddings)

# --- State ---
class AgentState(TypedDict):
    messages: Sequence[BaseMessage]
    context: str

# --- Nodes ---
def retrieve(state: AgentState):
    print("--- RETRIEVING ---")
    messages = state['messages']
    last_message = messages[-1].content
    
    # Retrieve relevant docs
    docs = vectorstore.similarity_search(last_message, k=5)
    context = "\n\n".join([doc.page_content for doc in docs])
    
    return {"context": context}

def generate(state: AgentState):
    print("--- GENERATING ---")
    messages = state['messages']
    context = state['context']
    question = messages[-1].content
    
    # System prompt injection
    prompt = f"""You are an expert material science and steel engineer. 
    Use the following pieces of retrieved context to answer the question. 
    If you don't know the answer, say that you don't know. 
    Use technical language but be concise.
    
    Context:
    {context}
    
    Question: {question}
    """
    
    response = llm.invoke([HumanMessage(content=prompt)])
    return {"messages": [response]}

# --- Graph ---
workflow = StateGraph(AgentState)
workflow.add_node("retrieve", retrieve)
workflow.add_node("generate", generate)

workflow.set_entry_point("retrieve")
workflow.add_edge("retrieve", "generate")
workflow.add_edge("generate", END)

app = workflow.compile()

# Helper function to run the graph
def run_agent(query: str):
    inputs = {"messages": [HumanMessage(content=query)]}
    result = app.invoke(inputs)
    return result['messages'][-1].content
