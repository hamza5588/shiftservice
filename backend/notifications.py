from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends, HTTPException, Body, Query
from typing import List, Dict, Optional
from datetime import datetime
from pydantic import BaseModel
from auth import get_current_user, require_roles
from database import get_db
from sqlalchemy.orm import Session
from models import ChatMessage, User
from sqlalchemy import and_, or_
import json
import jwt
from jose import JWTError
from config import SECRET_KEY, ALGORITHM
from urllib.parse import unquote

router = APIRouter(
    prefix="/notifications",
    tags=["notifications"]
)

class ChatMessageCreate(BaseModel):
    content: str
    receiver_id: str
    shift_id: Optional[int] = None

class ChatMessageResponse(BaseModel):
    id: int
    sender_id: str
    receiver_id: str
    content: str
    timestamp: datetime
    shift_id: Optional[int] = None
    sender_name: str

    class Config:
        from_attributes = True

class ChatManager:
    """
    Manages active WebSocket connections and chat messages.
    """

    def __init__(self):
        self.active_connections: Dict[str, WebSocket] = {}
        self.user_connections: Dict[str, List[str]] = {}

    async def connect(self, websocket: WebSocket, user_id: str):
        await websocket.accept()
        self.active_connections[user_id] = websocket
        if user_id not in self.user_connections:
            self.user_connections[user_id] = []

    def disconnect(self, user_id: str):
        if user_id in self.active_connections:
            del self.active_connections[user_id]
        if user_id in self.user_connections:
            del self.user_connections[user_id]

    async def send_personal_message(self, message: dict, receiver_id: str):
        if receiver_id in self.active_connections:
            await self.active_connections[receiver_id].send_json(message)

    async def broadcast(self, message: str):
        for connection in self.active_connections.values():
            await connection.send_text(message)

chat_manager = ChatManager()

@router.websocket("/ws/chat/{user_id}")
async def chat_websocket(
    websocket: WebSocket,
    user_id: str,
    token: str = Query(None)
):
    """
    WebSocket endpoint for real-time chat.
    Only authenticated users can connect.
    Each user gets their own WebSocket connection for private messaging.
    """
    try:
        print(f"WebSocket connection attempt for user {user_id}")
        print(f"Token provided: {'Yes' if token else 'No'}")
        print(f"Full token: {token}")

        if not token:
            print("No token provided")
            await websocket.close(code=4000, reason="No authentication token provided")
            return

        # Verify the token and get the current user
        try:
            # Decode the token
            try:
                print(f"Attempting to decode token: {token[:20]}...")
                print(f"Using SECRET_KEY: {SECRET_KEY}")
                print(f"Using ALGORITHM: {ALGORITHM}")
                
                payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
                print(f"Token payload: {payload}")
                
                username: str = payload.get("sub")
                if username is None:
                    print("No username in token payload")
                    await websocket.close(code=4001, reason="Invalid token payload")
                    return
                
                print(f"Username from token: {username}")

                # Get the user from the database
                db = next(get_db())
                user = db.query(User).filter(User.username == username).first()
                
                if not user:
                    print(f"No user found for username: {username}")
                    await websocket.close(code=4001, reason="User not found")
                    return

                # Get the user ID and ensure it's a string
                current_user_id = str(user.id)
                print(f"Current user ID: {current_user_id}")
                print(f"Requested user ID: {user_id}")
                
                # Compare the user IDs
                if current_user_id != user_id:
                    print(f"User ID mismatch: {current_user_id} != {user_id}")
                    await websocket.close(code=4003, reason="Not authorized")
                    return
                
                print("Authentication successful, accepting WebSocket connection")
                await chat_manager.connect(websocket, current_user_id)
                
                try:
                    while True:
                        data = await websocket.receive_json()
                        print(f"Received message: {data}")
                        
                        # Handle incoming chat messages
                        if data.get("type") == "message":
                            message = data.get("content")
                            receiver_id = data.get("receiver_id")
                            shift_id = data.get("shift_id")
                            
                            # Store message in database
                            db_message = ChatMessage(
                                sender_id=int(current_user_id),
                                receiver_id=int(receiver_id),
                                content=message,
                                shift_id=shift_id
                            )
                            db.add(db_message)
                            db.commit()
                            db.refresh(db_message)
                            
                            # Get sender's name
                            sender = db.query(User).filter(User.id == current_user_id).first()
                            sender_name = sender.full_name if sender else "Unknown"
                            
                            # Prepare message response
                            message_response = {
                                "type": "message",
                                "id": db_message.id,
                                "sender_id": current_user_id,
                                "receiver_id": receiver_id,
                                "content": message,
                                "timestamp": db_message.timestamp.isoformat(),
                                "shift_id": shift_id,
                                "sender_name": sender_name
                            }
                            
                            print(f"Sending message response: {message_response}")
                            
                            # Send to receiver if online
                            await chat_manager.send_personal_message(message_response, str(receiver_id))
                            # Send back to sender for confirmation
                            await chat_manager.send_personal_message(message_response, current_user_id)
                            
                except WebSocketDisconnect:
                    print(f"WebSocket disconnected for user {current_user_id}")
                    chat_manager.disconnect(current_user_id)
                except Exception as e:
                    print(f"Error in WebSocket connection: {str(e)}")
                    await websocket.close(code=1011, reason="Internal server error")
                    
            except JWTError as e:
                print(f"JWT decode error: {str(e)}")
                print(f"Error type: {type(e)}")
                print(f"Error details: {e.__dict__}")
                await websocket.close(code=4001, reason="Invalid token")
                return
                
        except Exception as e:
            print(f"Authentication error: {str(e)}")
            print(f"Error type: {type(e)}")
            print(f"Error details: {e.__dict__}")
            await websocket.close(code=4001, reason="Invalid authentication token")
            return
            
    except Exception as e:
        print(f"Error in WebSocket authentication: {str(e)}")
        print(f"Error type: {type(e)}")
        print(f"Error details: {e.__dict__}")
        await websocket.close(code=4000, reason="Authentication failed")

@router.post("/chat/send", response_model=ChatMessageResponse)
async def send_chat_message(
    message: ChatMessageCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Send a chat message to another user.
    The message will be stored in the database and sent via WebSocket if the receiver is online.
    """
    # Create and store the message
    db_message = ChatMessage(
        sender_id=current_user.id,
        receiver_id=message.receiver_id,
        content=message.content,
        shift_id=message.shift_id
    )
    db.add(db_message)
    db.commit()
    db.refresh(db_message)
    
    # Get sender's name
    sender = db.query(User).filter(User.id == current_user.id).first()
    sender_name = sender.full_name if sender else "Unknown"
    
    # Prepare message response
    message_response = ChatMessageResponse(
        id=db_message.id,
        sender_id=current_user.id,
        receiver_id=message.receiver_id,
        content=message.content,
        timestamp=db_message.timestamp,
        shift_id=message.shift_id,
        sender_name=sender_name
    )
    
    # Send via WebSocket if receiver is online
    if message.receiver_id in chat_manager.active_connections:
        await chat_manager.send_personal_message(
            message_response.dict(),
            message.receiver_id
        )
    
    return message_response

@router.get("/chat/history/{user_id}", response_model=List[ChatMessageResponse])
async def get_chat_history(
    user_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get chat history between the current user and another user.
    """
    try:
        print(f"Current user: {current_user}")
        print(f"Other user ID: {user_id}")
        
        # Convert user_id to integer
        other_user_id_int = int(user_id)
        
        # Get messages between the current user and the other user
        messages = db.query(ChatMessage).filter(
            ((ChatMessage.sender_id == current_user.id) & (ChatMessage.receiver_id == other_user_id_int)) |
            ((ChatMessage.sender_id == other_user_id_int) & (ChatMessage.receiver_id == current_user.id))
        ).order_by(ChatMessage.timestamp.asc()).all()
        
        print(f"Found {len(messages)} messages")
        
        # Get sender names
        sender_ids = {msg.sender_id for msg in messages}
        print(f"Sender IDs: {sender_ids}")
        
        senders = {user.id: user.full_name for user in db.query(User).filter(User.id.in_(sender_ids)).all()}
        print(f"Senders: {senders}")
        
        # Mark messages as read if current user is the receiver
        for msg in messages:
            if msg.receiver_id == current_user.id and not msg.read:
                msg.read = True
        db.commit()
        
        response = [
            ChatMessageResponse(
                id=msg.id,
                sender_id=msg.sender_id,
                receiver_id=msg.receiver_id,
                content=msg.content,
                timestamp=msg.timestamp,
                shift_id=msg.shift_id,
                sender_name=senders.get(msg.sender_id, "Unknown")
            )
            for msg in messages
        ]
        
        print(f"Response: {response}")
        return response
        
    except Exception as e:
        print(f"Error in get_chat_history: {str(e)}")
        print(f"Error type: {type(e)}")
        import traceback
        print("Traceback:")
        print(traceback.format_exc())
        raise HTTPException(status_code=500, detail=str(e))

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

@router.get("/unread-count", response_model=int)
async def get_unread_count(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get the number of unread messages for the current user.
    """
    try:
        # Count messages where the current user is the receiver and the message is unread
        unread_count = db.query(ChatMessage).filter(
            and_(
                ChatMessage.receiver_id == current_user.id,
                ChatMessage.read == False
            )
        ).count()
        
        print(f"Unread count for user {current_user.id}: {unread_count}")
        return unread_count
    except Exception as e:
        print(f"Error in get_unread_count: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/mark-read/{message_id}")
async def mark_message_as_read(
    message_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Mark a message as read.
    """
    try:
        message = db.query(ChatMessage).filter(
            and_(
                ChatMessage.id == message_id,
                ChatMessage.receiver_id == current_user.id
            )
        ).first()
        
        if not message:
            raise HTTPException(status_code=404, detail="Message not found")
        
        message.read = True
        db.commit()
        
        return {"status": "success"}
    except Exception as e:
        print(f"Error in mark_message_as_read: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
