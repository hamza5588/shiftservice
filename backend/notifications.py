from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends, HTTPException, Body
from typing import List
from auth import get_current_user, require_roles

router = APIRouter(
    prefix="/notifications",
    tags=["notifications"]
)


class NotificationManager:
    """
    Beheert actieve WebSocket-verbindingen en verstuurt notificaties.
    """

    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)

    async def send_personal_notification(self, message: str, websocket: WebSocket):
        await websocket.send_text(message)

    async def broadcast(self, message: str):
        for connection in self.active_connections:
            await connection.send_text(message)


manager = NotificationManager()


@router.websocket("/ws")
async def notifications_websocket(websocket: WebSocket, current_user: dict = Depends(get_current_user)):
    """
    WebSocket endpoint voor realtime notificaties.
    Alleen geauthenticeerde gebruikers kunnen verbinden.
    Zodra een gebruiker verbindt, wordt deze toegevoegd aan de actieve verbindingen.
    Elk ontvangen bericht kan (optioneel) worden verwerkt of simpelweg als bevestiging worden teruggestuurd.
    """
    await manager.connect(websocket)
    try:
        while True:
            # In dit voorbeeld lezen we berichten die de client stuurt, maar de backend kan ook zelfstandig notificaties sturen.
            data = await websocket.receive_text()
            # Voor demonstratiedoeleinden broadcasten we het bericht met de gebruikersnaam erbij.
            await manager.broadcast(f"{current_user.get('username')}: {data}")
    except WebSocketDisconnect:
        manager.disconnect(websocket)


@router.post("/send", status_code=200)
async def send_notification(message: str = Body(..., embed=True),
                            current_user: dict = Depends(require_roles(["admin", "planner"]))):
    """
    Endpoint om een notificatie naar alle verbonden gebruikers te sturen.
    Alleen toegankelijk voor admins en planners.
    De notificatie wordt via de NotificationManager gebroadcast.
    """
    if not message:
        raise HTTPException(status_code=400, detail="Message is required.")
    await manager.broadcast(message)
    return {"detail": "Notification sent."}
