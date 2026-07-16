import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Server, Socket } from 'socket.io';

@WebSocketGateway({
  cors: { origin: '*' },
  namespace: '/',
})
export class EventsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(EventsGateway.name);

  constructor(private readonly jwtService: JwtService) {}

  async handleConnection(client: Socket) {
    try {
      const token =
        (client.handshake.auth?.token as string) ||
        (client.handshake.query?.token as string) ||
        client.handshake.headers.authorization?.replace('Bearer ', '');
      if (!token) {
        client.disconnect();
        return;
      }
      const payload = this.jwtService.verify(token, { secret: 'super-secret' });
      const userId = payload.sub as string;
      client.data.userId = userId;
      await client.join(`user:${userId}`);
      this.logger.log(`Client connected: ${userId}`);
    } catch {
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    if (client.data?.userId) {
      this.logger.log(`Client disconnected: ${client.data.userId}`);
    }
  }

  emitNotification(userId: string, notification: unknown) {
    this.server.to(`user:${userId}`).emit('notification', notification);
  }

  emitActivity(room: string, payload: unknown) {
    this.server.to(room).emit('activity', payload);
  }

  @SubscribeMessage('join')
  handleJoin(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: { room?: string },
  ) {
    if (body?.room) {
      void client.join(body.room);
    }
    return { ok: true };
  }
}
