from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends
from typing import List
from auth import get_current_user

router = APIRouter(
    prefix="/chat",
    tags=["chat"]
)

class ConnectionManager:
    """Beheert actieve WebSocket-verbindingen."""
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)

    async def broadcast(self, message: str):
        """Verstuur een bericht naar alle actieve gebruikers."""
        for connection in self.active_connections:
            await connection.send_text(message)

manager = ConnectionManager()

@router.websocket("/ws/{username}")
async def websocket_endpoint(websocket: WebSocket, username: str, current_user: dict = Depends(get_current_user)):
    """
    WebSocket endpoint voor realtime chat.
    - Verifieert dat de ingelogde gebruiker overeenkomt met de opgegeven username.
    - Bij succesvolle verbinding wordt elk bericht van de gebruiker gebroadcast naar alle verbonden clients.
    """
    # Controleer of de ingelogde gebruiker de opgegeven username heeft
    if current_user.get("username") != username:
        await websocket.close(code=1008)  # Policy Violation
        return

    await manager.connect(websocket)
    try:
        while True:
            data = await websocket.receive_text()
            message = f"{username}: {data}"
            await manager.broadcast(message)
    except WebSocketDisconnect:
        manager.disconnect(websocket)
