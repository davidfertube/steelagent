import azure.functions as func
from backend.server import app as fastapi_app

# This is the entry point for Azure Functions Python V2 model
app = func.AsgiFunctionApp(app=fastapi_app, http_auth_level=func.AuthLevel.ANONYMOUS)
