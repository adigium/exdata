import { Websocket } from '../types';

export class WebsocketRequestManager {
  private pendingRequests: Map<string, Websocket.Request>;

  constructor() {
    this.pendingRequests = new Map<string, Websocket.Request>();
  }

  public getRequests(): Map<string, Websocket.Request> {
    return this.pendingRequests;
  }

  public addRequest(request: Websocket.Request): void {
    this.pendingRequests.set(request.id, request);
  }

  public getRequest(requestId: string): Websocket.Request | undefined {
    return this.pendingRequests.get(requestId);
  }

  public removeRequest(requestId: string): void {
    this.pendingRequests.delete(requestId);
  }

  public clearRequestsForWebsocket(websocketId: string): void {
    this.pendingRequests.forEach((request, requestId) => {
      if (request.websocketId === websocketId) {
        this.pendingRequests.delete(requestId);
      }
    });
  }
}
