import { useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { message, Typography, Space } from 'antd';
import { ExtractionStatus, Extraction } from '../types';

const WS_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:3000';

const { Text, Link } = Typography;
export const useWebSocket = (
  userId: string | null,
  onUpdate: (update: Extraction) => void,
  onView: (data: Extraction) => void,
  isAuthenticated: boolean,
) => {
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (!userId) return;

    // Connect to WebSocket
    const socket = io(WS_URL, {
      transports: ['websocket'],
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('WebSocket connected');
      socket.emit('subscribe', userId);
    });

    socket.on('extraction-update', (update: Extraction) => {
      console.log('Received extraction update:', update);
      onUpdate(update);

      // Show Ant Design message notification
      if (update.status === ExtractionStatus.EXTRACTED) {
        message.success({
          content: (
            <Space>
              <Text strong>Extraction completed successfully</Text>
              <Link
                onClick={() => {
                  onView(update as Extraction);
                }}
              >
                View
              </Link>
            </Space>
          ),
          duration: 10,
        });
      } else if (update.status === ExtractionStatus.INVALID) {
        message.warning({
          content: (
            <Space>
              <Text strong>Extraction failed. Invalid receipt</Text>
              <Text type="secondary" className="text-sm">
                {update.failureReason}
              </Text>
              <Link
                onClick={() => {
                  onView(update as Extraction);
                }}
              >
                View
              </Link>
            </Space>
          ),
          duration: 10,
        });
      } else if (update.status === ExtractionStatus.FAILED) {
        message.error({
          content: (
            <Space>
              <Text strong>Extraction failed:</Text>
              <Text type="secondary" className="text-sm">
                {update.failureReason}
              </Text>
              <Link
                onClick={() => {
                  onView(update as Extraction);
                }}
              >
                View
              </Link>
            </Space>
          ),
          duration: 10,
        });
      }
    });

    socket.on('disconnect', () => {
      console.log('WebSocket disconnected');
    });

    return () => {
      socket.emit('unsubscribe', userId);
      socket.disconnect();
    };
  }, [isAuthenticated]);
};
