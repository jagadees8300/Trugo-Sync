import { io, Socket } from 'socket.io-client';

const REALTIME_URL =
  import.meta.env.VITE_API_URL !== undefined
    ? import.meta.env.VITE_API_URL
    : import.meta.env.PROD
      ? window.location.origin
      : 'http://localhost:5000';

let socket: Socket | null = null;

export function connectRealtime(onNotification?: (payload: unknown) => void) {
  const token = localStorage.getItem('token');
  if (!token) return null;

  if (socket?.connected) {
    if (onNotification) {
      socket.off('notification');
      socket.on('notification', onNotification);
    }
    return socket;
  }

  socket?.disconnect();
  socket = io(REALTIME_URL, {
    auth: { token },
    transports: ['websocket', 'polling'],
  });

  if (onNotification) {
    socket.on('notification', onNotification);
  }

  return socket;
}

export function disconnectRealtime() {
  socket?.disconnect();
  socket = null;
}

export function getRealtimeSocket() {
  return socket;
}
