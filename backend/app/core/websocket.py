import json
from typing import Dict, Set, Any
from fastapi import WebSocket

class WebSocketManager:
    def __init__(self):
        # Maps task_id to a set of active WebSockets
        self.active_task_connections: Dict[str, Set[WebSocket]] = {}
        # Global connections for general activity and notifications
        self.global_connections: Set[WebSocket] = set()

    async def connect_task(self, task_id: str, websocket: WebSocket):
        await websocket.accept()
        if task_id not in self.active_task_connections:
            self.active_task_connections[task_id] = set()
        self.active_task_connections[task_id].add(websocket)

    def disconnect_task(self, task_id: str, websocket: WebSocket):
        if task_id in self.active_task_connections:
            self.active_task_connections[task_id].discard(websocket)
            if not self.active_task_connections[task_id]:
                del self.active_task_connections[task_id]

    async def connect_global(self, websocket: WebSocket):
        await websocket.accept()
        self.global_connections.add(websocket)

    def disconnect_global(self, websocket: WebSocket):
        self.global_connections.discard(websocket)

    async def broadcast_task_event(self, task_id: str, event_type: str, data: Any):
        payload = json.dumps({"type": event_type, "task_id": task_id, "data": data}, default=str)
        if task_id in self.active_task_connections:
            disconnected = []
            for ws in list(self.active_task_connections[task_id]):
                try:
                    await ws.send_text(payload)
                except Exception:
                    disconnected.append(ws)
            for ws in disconnected:
                self.disconnect_task(task_id, ws)

    async def broadcast_global(self, event_type: str, data: Any):
        payload = json.dumps({"type": event_type, "data": data}, default=str)
        disconnected = []
        for ws in list(self.global_connections):
            try:
                await ws.send_text(payload)
            except Exception:
                disconnected.append(ws)
        for ws in disconnected:
            self.disconnect_global(ws)

ws_manager = WebSocketManager()
