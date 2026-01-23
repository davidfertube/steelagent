import os
import time
from dotenv import load_dotenv
from langchain_community.document_loaders import PyPDFLoader, DirectoryLoader
from langchain_google_genai import GoogleGenerativeAIEmbeddings
from langchain_experimental.text_splitter import SemanticChunker
from langchain_community.vectorstores import Pinecone as PineconeVectorStore
from pinecone import Pinecone, ServerlessSpec

load_dotenv()

# Configuration
GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY")
PINECONE_API_KEY = os.getenv("PINECONE_API_KEY")
INDEX_NAME = os.getenv("PINECONE_INDEX_NAME", "steel-index")
DATA_DIR = "./data"  # Place your PDFs here

if not GOOGLE_API_KEY:
    raise ValueError("GOOGLE_API_KEY not found in .env")

def ingest_data():
    print("🚀 Starting Ingestion Process...")
    
    # 1. Load Documents
    if not os.path.exists(DATA_DIR):
        os.makedirs(DATA_DIR)
        print(f"⚠️ created {DATA_DIR}. Please put PDFs there.")
        return

    print(f"📂 Loading PDFs from {DATA_DIR}...")
    loader = DirectoryLoader(DATA_DIR, glob="**/*.pdf", loader_cls=PyPDFLoader)
    docs = loader.load()
    
    if not docs:
        print("❌ No documents found.")
        return
        
    print(f"✅ Loaded {len(docs)} documents.")

    # 2. Semantic Chunking
    print("🧠 Performing Semantic Chunking (this may take a while)...")
    embeddings = GoogleGenerativeAIEmbeddings(model="models/embedding-001")
    
    # Breakpoint threshold type can be adjusted (percentile, standard_deviation, interquartile)
    text_splitter = SemanticChunker(
        embeddings=embeddings,
        breakpoint_threshold_type="percentile" 
    )
    
    chunks = text_splitter.split_documents(docs)
    print(f"🔪 Split into {len(chunks)} semantic chunks.")

    # 3. Upsert to Pinecone
    print("🌲 Connecting to Pinecone...")
    
    if not PINECONE_API_KEY:
        print("❌ PINECONE_API_KEY is missing. Skipping upload.")
        return

    pc = Pinecone(api_key=PINECONE_API_KEY)
    
    # Check if index exists, if not create strictly if needed, but usually we assume it exists or use create_index
    # For this script we'll rely on the user or existing index to keep it simple, or create if missing
    existing_indexes = [i.name for i in pc.list_indexes()]
    if INDEX_NAME not in existing_indexes:
        print(f"⚠️ Index {INDEX_NAME} not found. Creating...")
        pc.create_index(
            name=INDEX_NAME,
            dimension=768, # models/embedding-001 is 768
            metric="cosine",
            spec=ServerlessSpec(cloud="aws", region="us-east-1")
        )
        while not pc.describe_index(INDEX_NAME).status["ready"]:
            time.sleep(1)
            
    print("📤 Uploading vectors...")
    PineconeVectorStore.from_documents(
        chunks, 
        embeddings, 
        index_name=INDEX_NAME
    )
    print("✅ Ingestion Complete!")

if __name__ == "__main__":
    ingest_data()
