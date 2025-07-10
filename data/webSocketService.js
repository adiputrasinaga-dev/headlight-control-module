/**
 * Mengelola koneksi dan komunikasi WebSocket.
 */
class WebSocketService {
  constructor(url) {
    this.socket = null;
    this.url = url;
    this.onMessageHandler = () => {};
    this.onConnectionStatusChange = () => {};
  }

  connect() {
    this.socket = new WebSocket(this.url);

    this.socket.onopen = () => {
      console.log("WebSocket connected.");
      this.onConnectionStatusChange(true);
    };

    this.socket.onclose = () => {
      console.log("WebSocket disconnected. Reconnecting in 2s...");
      this.onConnectionStatusChange(false);
      setTimeout(() => this.connect(), 2000);
    };

    this.socket.onerror = (error) => {
      console.error("WebSocket error:", error);
      this.socket.close();
    };

    this.socket.onmessage = (event) => {
      this.onMessageHandler(event.data);
    };
  }

  setOnMessageHandler(handler) {
    this.onMessageHandler = handler;
  }

  setOnConnectionStatusChange(handler) {
    this.onConnectionStatusChange = handler;
  }

  send(data) {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify(data));
    } else {
      console.warn("WebSocket not open. Message not sent:", data);
    }
  }
}

export default WebSocketService;
