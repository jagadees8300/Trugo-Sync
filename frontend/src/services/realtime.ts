import { io, Socket } from 'socket.io-client';

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
  socket = io('http://localhost:5000', {
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
