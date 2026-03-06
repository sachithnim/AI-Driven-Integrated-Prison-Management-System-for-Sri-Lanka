from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from typing import List

router = APIRouter()

class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        self.active_connections.remove(websocket)

    async def broadcast(self, message: str):
        for connection in self.active_connections:
            await connection.send_text(message)

manager = ConnectionManager()

@router.websocket("/ws/alerts")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            # Keep connection open, wait for messages (ping/pong)
            data = await websocket.receive_text()
            # Echo or process client messages if needed
            # await websocket.send_text(f"Message text was: {data}")
    except WebSocketDisconnect:
        manager.disconnect(websocket)



@router.websocket("/ws/live/{camera_id}")
async def websocket_live_stream(websocket: WebSocket, camera_id: int):
    """
    Receive live video/audio from client.
    Protocol:
    - First byte: 0x01 (Video/JPEG), 0x02 (Audio/PCM Int16)
    - Rest: Payload
    """
    await websocket.accept()
    try:
        while True:
            data = await websocket.receive_bytes()
            if not data:
                break
                
            # print(f"WS received {len(data)} bytes from {camera_id}")
            msg_type = data[0]
            payload = data[1:]
            
            if msg_type == 0x01: # Video
                from app.services.violence_detector import detector
                await detector.process_live_frame(camera_id, payload)
            elif msg_type == 0x02: # Audio
                from app.services.violence_detector import detector
                await detector.process_live_audio(camera_id, payload)
                
    except WebSocketDisconnect:
        print(f"Client {camera_id} disconnected")
        # Optional: detector.remove_session(camera_id) if we want to clear buffers immediately
        # For now, let's keep it to allow reconnects to resume seamlessly or clear it.
        from app.services.violence_detector import detector
        detector.remove_session(camera_id)
    except Exception as e:
        print(f"Error in live stream {camera_id}: {e}")
        from app.services.violence_detector import detector
        detector.remove_session(camera_id)
