/**
 * Menangani semua permintaan HTTP POST ke API firmware.
 */
class ApiService {
  async post(endpoint, body, isJson = true) {
    try {
      const headers = isJson ? { "Content-Type": "application/json" } : {};
      const bodyToSend = isJson ? JSON.stringify(body) : body;
      const response = await fetch(endpoint, {
        method: "POST",
        headers: headers,
        body: bodyToSend,
        keepalive: isJson, // Gunakan keepalive untuk request pratinjau yang sering
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return response;
    } catch (error) {
      console.error(`API POST to ${endpoint} failed:`, error);
      // Lempar kembali error agar bisa ditangani oleh pemanggil
      throw error;
    }
  }
}

export default ApiService;
