import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';

@WebSocketGateway({
  cors: {
    origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
    credentials: true,
  },
})
export class WebsocketGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(WebsocketGateway.name);
  private userSockets: Map<string, Set<string>> = new Map();

  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);

    // Remove from user socket mapping
    for (const [userId, sockets] of this.userSockets.entries()) {
      sockets.delete(client.id);
      if (sockets.size === 0) {
        this.userSockets.delete(userId);
      }
    }
  }

  @SubscribeMessage('subscribe')
  handleSubscribe(client: Socket, userId: string) {
    if (!this.userSockets.has(userId)) {
      this.userSockets.set(userId, new Set());
    }
    this.userSockets.get(userId).add(client.id);

    this.logger.log(`Client ${client.id} subscribed to user ${userId}`);
    return { success: true };
  }

  @SubscribeMessage('unsubscribe')
  handleUnsubscribe(client: Socket, userId: string) {
    const sockets = this.userSockets.get(userId);
    if (sockets) {
      sockets.delete(client.id);
      if (sockets.size === 0) {
        this.userSockets.delete(userId);
      }
    }

    this.logger.log(`Client ${client.id} unsubscribed from user ${userId}`);
    return { success: true };
  }

  emitExtractionUpdate(userId: string, data: any) {
    const sockets = this.userSockets.get(userId);
    if (sockets && sockets.size > 0) {
      sockets.forEach((socketId) => {
        this.server.to(socketId).emit('extraction-update', data);
      });

      this.logger.log(
        `Emitted extraction update to ${sockets.size} client(s) for user ${userId}`,
      );
    }
  }
}
