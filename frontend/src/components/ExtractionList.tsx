import { useState } from 'react';
import {
  Tag,
  Dropdown,
  Button,
  Empty,
  Spin,
  Modal,
  message,
  Typography,
  Image,
} from 'antd';
import {
  EllipsisOutlined,
  DeleteOutlined,
  FileImageOutlined,
} from '@ant-design/icons';
import { Extraction } from '../types';
import { getStatusColor, getStatusText } from '../utils';
import dayjs from 'dayjs';

const { Text } = Typography;

interface ExtractionListProps {
  extractions: Extraction[];
  loading: boolean;
  onSelect: (extraction: Extraction) => void;
  onDelete: (id: string) => Promise<void>;
}

export const ExtractionList: React.FC<ExtractionListProps> = ({
  extractions,
  loading,
  onSelect,
  onDelete,
}) => {
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    if (!deleteId) return;

    try {
      setDeleting(true);
      await onDelete(deleteId);
      message.success('Extraction deleted successfully');
      setDeleteId(null);
    } catch (error) {
      message.error('Failed to delete extraction');
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '48px' }}>
        <Spin data-testid="loading-spinner" size="large" />
      </div>
    );
  }

  if (extractions.length === 0) {
    return (
      <div className="empty-list">
        <Empty
          image={
            <FileImageOutlined style={{ fontSize: 64, color: '#bfbfbf' }} />
          }
          description="No extractions found"
        >
          <p>
            Click <strong>"New Extraction"</strong> to begin
          </p>
        </Empty>
      </div>
    );
  }

  return (
    <>
      <div className="extraction-list">
        {extractions.map((extraction) => (
          <div
            key={extraction.id}
            className="extraction-row"
            onClick={() => onSelect(extraction)}
          >
            <div className="thumbnail">
              <Image
                src={extraction.imageUrl}
                alt={extraction.filename}
                width={40}
                height={40}
                style={{ objectFit: 'cover', borderRadius: 4 }}
                preview={false}
              />
            </div>
            <div className="details">
              <Text strong className="filename">
                {extraction.filename}
              </Text>
              <Text type="secondary" className="timestamp">
                {dayjs(extraction.createdAt).format('DD/MM/YYYY  h:mma')}
              </Text>
            </div>
            <div className="action-container">
              <div className="actions" onClick={(e) => e.stopPropagation()}>
                <Dropdown
                  menu={{
                    items: [
                      {
                        key: 'delete',
                        icon: <DeleteOutlined />,
                        label: 'Delete',
                        danger: true,
                        onClick: () => setDeleteId(extraction.id),
                      },
                    ],
                  }}
                  trigger={['click']}
                >
                  <Button
                    type="text"
                    icon={<EllipsisOutlined />}
                    onClick={(e) => e.stopPropagation()}
                  />
                </Dropdown>
              </div>
              <div className="status">
                <Tag color={getStatusColor(extraction.status)}>
                  {getStatusText(extraction.status)}
                </Tag>
              </div>
            </div>
          </div>
        ))}
      </div>

      <Modal
        title="Delete Extraction"
        open={!!deleteId}
        onOk={handleDelete}
        onCancel={() => setDeleteId(null)}
        okText="Delete"
        okButtonProps={{ danger: true, loading: deleting }}
        cancelButtonProps={{ disabled: deleting }}
      >
        <p>
          Are you sure you want to delete this extraction? This action cannot be
          undone.
        </p>
      </Modal>
    </>
  );
};
