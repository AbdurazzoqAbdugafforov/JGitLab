import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { Server as HttpServer, IncomingMessage } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import { ConfigService } from './config.service';
import { SecurityService } from './security.service';

@Injectable()
export class WebSocketService implements OnModuleDestroy {
  private wss: WebSocketServer | null = null;
  private readonly activeTaskConnections = new Map<string, Set<WebSocket>>();
  private readonly globalConnections = new Set<WebSocket>();
  private dbService: any = null;

  constructor(
    private readonly config: ConfigService,
    private readonly security: SecurityService,
  ) {}

  setDatabaseService(db: any) {
    this.dbService = db;
  }

  private authenticateUpgrade(request: IncomingMessage): boolean {
    if (!this.dbService) {
      return true; // fallback if db is not yet wired
    }

    let token: string | null = null;
    const rawUrl = request.url || '';
    const qIdx = rawUrl.indexOf('?');
    if (qIdx !== -1) {
      try {
        const params = new URLSearchParams(rawUrl.slice(qIdx + 1));
        token = params.get('token');
      } catch {
        // ignore parse error
      }
    }

    if (!token && request.headers.cookie) {
      const cookies = this.security.parseCookies({ headers: request.headers } as any);
      token = cookies[this.config.SESSION_COOKIE_NAME] || null;
    }

    if (!token && typeof request.headers.authorization === 'string') {
      const auth = request.headers.authorization;
      if (auth.toLowerCase().startsWith('bearer ')) {
        token = auth.slice(7).trim();
      }
    }

    if (!token) {
      return false;
    }

    const session = this.dbService.resolveSession(token);
    return Boolean(session);
  }

  attachToServer(server: HttpServer) {
    if (this.wss) return;
    this.wss = new WebSocketServer({ noServer: true });

    server.on('upgrade', (request: IncomingMessage, socket, head) => {
      const rawUrl = request.url || '';
      const pathname = rawUrl.split('?')[0];

      const isTaskWs = pathname.match(/^\/ws\/tasks\/([^/]+)$/);
      const isGlobalWs = pathname === '/ws/global';

      if (!isTaskWs && !isGlobalWs) {
        socket.destroy();
        return;
      }

      // Check authentication
      if (!this.authenticateUpgrade(request)) {
        socket.write('HTTP/1.1 401 Unauthorized\r\nConnection: close\r\n\r\n');
        socket.destroy();
        return;
      }

      if (isTaskWs) {
        const taskId = decodeURIComponent(isTaskWs[1]);
        this.wss!.handleUpgrade(request, socket, head, (ws) => {
          this.connectTask(taskId, ws);
        });
        return;
      }

      if (isGlobalWs) {
        this.wss!.handleUpgrade(request, socket, head, (ws) => {
          this.connectGlobal(ws);
        });
        return;
      }

      socket.destroy();
    });
  }

  private connectTask(taskId: string, ws: WebSocket) {
    if (!this.activeTaskConnections.has(taskId)) {
      this.activeTaskConnections.set(taskId, new Set());
    }
    this.activeTaskConnections.get(taskId)!.add(ws);

    ws.on('close', () => {
      this.disconnectTask(taskId, ws);
    });
    ws.on('error', () => {
      this.disconnectTask(taskId, ws);
    });
  }

  private disconnectTask(taskId: string, ws: WebSocket) {
    const set = this.activeTaskConnections.get(taskId);
    if (set) {
      set.delete(ws);
      if (set.size === 0) {
        this.activeTaskConnections.delete(taskId);
      }
    }
  }

  private connectGlobal(ws: WebSocket) {
    this.globalConnections.add(ws);
    ws.on('close', () => {
      this.globalConnections.delete(ws);
    });
    ws.on('error', () => {
      this.globalConnections.delete(ws);
    });
  }

  async broadcastTaskEvent(taskId: string, eventType: string, data: any) {
    const payload = JSON.stringify({
      type: eventType,
      task_id: taskId,
      data,
    });
    const set = this.activeTaskConnections.get(taskId);
    if (!set) return;

    for (const ws of Array.from(set)) {
      if (ws.readyState === WebSocket.OPEN) {
        try {
          ws.send(payload);
        } catch {
          this.disconnectTask(taskId, ws);
        }
      } else {
        this.disconnectTask(taskId, ws);
      }
    }
  }

  async broadcastGlobal(eventType: string, data: any) {
    const payload = JSON.stringify({
      type: eventType,
      data,
    });
    for (const ws of Array.from(this.globalConnections)) {
      if (ws.readyState === WebSocket.OPEN) {
        try {
          ws.send(payload);
        } catch {
          this.globalConnections.delete(ws);
        }
      } else {
        this.globalConnections.delete(ws);
      }
    }
  }

  onModuleDestroy() {
    for (const ws of Array.from(this.globalConnections)) {
      try {
        ws.terminate();
      } catch {}
    }
    this.globalConnections.clear();

    for (const set of this.activeTaskConnections.values()) {
      for (const ws of Array.from(set)) {
        try {
          ws.terminate();
        } catch {}
      }
    }
    this.activeTaskConnections.clear();

    if (this.wss) {
      try {
        this.wss.clients.forEach((c) => {
          try {
            c.terminate();
          } catch {}
        });
        this.wss.close();
      } catch {}
      this.wss = null;
    }
  }
}
