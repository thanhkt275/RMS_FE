import { IWebSocketService } from '../interfaces/index';
import { RealtimeScoreUpdate } from '../types/index';
import { webSocketService } from "@/lib/websocket";

export class WebSocketServiceAdapter implements IWebSocketService {
  sendRealtimeScoreUpdate(data: RealtimeScoreUpdate): void {
    webSocketService.sendRealtimeScoreUpdate(data);
  }

  onScoreUpdate(callback: (data: any) => void): () => void {
    return webSocketService.onScoreUpdate(callback);
  }
}
