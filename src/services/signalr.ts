/**
 * SignalR Service - Real-time communication
 */
import * as signalR from "@microsoft/signalr";
import { API_URL, SIGNALR_HUBS } from "../api/config";

class SignalRService {
  private chatConnection: signalR.HubConnection | null = null;
  private sessionConnection: signalR.HubConnection | null = null;
  private notificationConnection: signalR.HubConnection | null = null;
  private accessToken: string | null = null;

  setAccessToken(token: string | null) {
    this.accessToken = token;
  }

  private createConnection(hub: string): signalR.HubConnection {
    return new signalR.HubConnectionBuilder()
      .withUrl(`${API_URL}${hub}`, {
        accessTokenFactory: () => {
          // Refuse to open the hub without a valid token. Returning '' would
          // let SignalR open an unauthenticated WebSocket against backend hubs.
          if (!this.accessToken) {
            throw new Error("SignalR: missing access token");
          }
          return this.accessToken;
        },
      })
      .withAutomaticReconnect([0, 2000, 5000, 10000, 30000])
      .configureLogging(signalR.LogLevel.Warning)
      .build();
  }

  // Chat Hub
  async connectChat(): Promise<void> {
    if (this.chatConnection?.state === signalR.HubConnectionState.Connected) {
      return;
    }
    if (!this.accessToken) {
      // Silently no-op when not authenticated; caller can retry post-login.
      if (__DEV__) console.warn("[signalr] connectChat skipped: no token");
      return;
    }

    this.chatConnection = this.createConnection(SIGNALR_HUBS.CHAT);
    await this.chatConnection.start();
  }

  async disconnectChat(): Promise<void> {
    if (this.chatConnection) {
      await this.chatConnection.stop();
      this.chatConnection = null;
    }
  }

  onReceiveMessage(callback: (message: any) => void): void {
    this.chatConnection?.on("receiveMessage", callback);
  }

  onTypingIndicator(callback: (isTyping: boolean) => void): void {
    this.chatConnection?.on("typingIndicator", callback);
  }

  offReceiveMessage(): void {
    this.chatConnection?.off("receiveMessage");
  }

  offTypingIndicator(): void {
    this.chatConnection?.off("typingIndicator");
  }

  // Session Hub
  async connectSession(): Promise<void> {
    if (
      this.sessionConnection?.state === signalR.HubConnectionState.Connected
    ) {
      return;
    }

    this.sessionConnection = this.createConnection(SIGNALR_HUBS.SESSION);
    await this.sessionConnection.start();
  }

  async disconnectSession(): Promise<void> {
    if (this.sessionConnection) {
      await this.sessionConnection.stop();
      this.sessionConnection = null;
    }
  }

  async joinSessionRoom(sessionId: string): Promise<void> {
    await this.sessionConnection?.invoke("JoinSession", sessionId);
  }

  async leaveSessionRoom(sessionId: string): Promise<void> {
    await this.sessionConnection?.invoke("LeaveSession", sessionId);
  }

  onSessionStarted(callback: (session: any) => void): void {
    this.sessionConnection?.on("sessionStarted", callback);
  }

  onUserJoined(callback: (user: any) => void): void {
    this.sessionConnection?.on("userJoined", callback);
  }

  onUserLeft(callback: (userId: string) => void): void {
    this.sessionConnection?.on("userLeft", callback);
  }

  onSessionEnded(callback: (sessionId: string) => void): void {
    this.sessionConnection?.on("sessionEnded", callback);
  }

  // Notification Hub
  async connectNotifications(): Promise<void> {
    if (
      this.notificationConnection?.state ===
      signalR.HubConnectionState.Connected
    ) {
      return;
    }

    this.notificationConnection = this.createConnection(
      SIGNALR_HUBS.NOTIFICATION,
    );
    await this.notificationConnection.start();
  }

  async disconnectNotifications(): Promise<void> {
    if (this.notificationConnection) {
      await this.notificationConnection.stop();
      this.notificationConnection = null;
    }
  }

  onNotification(callback: (notification: any) => void): void {
    this.notificationConnection?.on("notification", callback);
  }

  // Cleanup all connections
  async disconnectAll(): Promise<void> {
    await Promise.all([
      this.disconnectChat(),
      this.disconnectSession(),
      this.disconnectNotifications(),
    ]);
  }
}

export const signalRService = new SignalRService();
export default signalRService;
