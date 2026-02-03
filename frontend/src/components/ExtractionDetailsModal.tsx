import { useState } from 'react';
import {
  Modal,
  Descriptions,
  Table,
  Image,
  Button,
  Space,
  Tag,
  Alert,
  message,
  Row,
  Col,
} from 'antd';
import { getStatusColor, getStatusText } from '../utils';
import { DeleteOutlined, ArrowLeftOutlined } from '@ant-design/icons';
import { Extraction, ExtractionStatus } from '../types';
import dayjs from 'dayjs';

interface ExtractionDetailsModalProps {
  extraction: Extraction;
  open: boolean;
  onClose: () => void;
  onDelete: (id: string) => Promise<void>;
}

export const ExtractionDetailsModal: React.FC<ExtractionDetailsModalProps> = ({
  extraction,
  open,
  onClose,
  onDelete,
}) => {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    try {
      setDeleting(true);
      await onDelete(extraction.id);
      message.success('Extraction deleted successfully');
      onClose();
    } catch (error) {
      message.error('Failed to delete extraction');
      setDeleting(false);
    }
  };

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency || 'USD',
    }).format(amount);
  };

  const columns = [
    {
      title: 'Item Name',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: 'Qty',
      dataIndex: 'qty',
      key: 'qty',
    },
    {
      title: 'Cost',
      dataIndex: 'cost',
      key: 'cost',
      align: 'right' as const,
      render: (cost: number) =>
        formatCurrency(cost, extraction.currency || 'USD'),
    },
  ];

  return (
    <>
      <Modal
        title={
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <Space>
              <Button
                type="text"
                icon={<ArrowLeftOutlined />}
                onClick={onClose}
              />
              <span> {extraction.filename}</span>
            </Space>

            <Tag
              data-testid="modal-header-tag"
              color={getStatusColor(extraction.status)}
              style={{ fontSize: 14, padding: '4px 12px' }}
            >
              {getStatusText(extraction.status)}
            </Tag>
          </div>
        }
        closable={false}
        open={open}
        onCancel={onClose}
        width={900}
        footer={[
          <Button
            key="delete"
            danger
            icon={<DeleteOutlined />}
            onClick={() => setShowDeleteConfirm(true)}
            disabled={deleting}
          >
            Delete
          </Button>,
          <Button key="close" type="primary" onClick={onClose}>
            Done
          </Button>,
        ]}
      >
        <Row gutter={24}>
          {/* Left Column: Receipt Image */}
          <Col span={10}>
            <div
              style={{
                height: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: '#fafafa',
                borderRadius: 8,
                padding: 12,
              }}
            >
              <Image
                src={extraction.imageUrl}
                alt={extraction.filename}
                style={{ maxHeight: 400, maxWidth: '100%', borderRadius: 8 }}
                preview={false}
              />
            </div>
          </Col>

          {/* Right Column: Details */}
          <Col span={14}>
            <Space direction="vertical" size="middle" style={{ width: '100%' }}>
              {/* Alerts */}
              {extraction.status === ExtractionStatus.EXTRACTING && (
                <Alert
                  title="Extraction in Progress"
                  description="Please wait while we extract data from your receipt..."
                  type="info"
                />
              )}
              {extraction.status === ExtractionStatus.INVALID && (
                <Alert
                  title="Invalid Receipt"
                  description={
                    extraction.failureReason ||
                    'The uploaded image is not a valid receipt'
                  }
                  type="warning"
                  showIcon
                />
              )}
              {extraction.status === ExtractionStatus.FAILED && (
                <Alert
                  title="Extraction Failed"
                  description={
                    extraction.failureReason ||
                    'An error occurred during extraction'
                  }
                  type="error"
                  showIcon
                />
              )}

              {/* Extracted Data */}
              {extraction.status === ExtractionStatus.EXTRACTED && (
                <>
                  <Descriptions bordered column={2}>
                    <Descriptions.Item label="Vendor" span={2}>
                      {extraction.vendorName || '-'}
                    </Descriptions.Item>
                    <Descriptions.Item label="Date">
                      {extraction.date
                        ? dayjs(extraction.date).format('MMMM D, YYYY')
                        : '-'}
                    </Descriptions.Item>
                    <Descriptions.Item label="Currency">
                      {extraction.currency || '-'}
                    </Descriptions.Item>
                  </Descriptions>

                  {extraction.items && extraction.items.length > 0 && (
                    <>
                      <h3 style={{ marginBottom: 8 }}>Items</h3>
                      <Table
                        columns={columns}
                        dataSource={extraction.items.map((item, index) => ({
                          ...item,
                          key: index,
                        }))}
                        pagination={false}
                        size="small"
                        scroll={{ y: 240 }}
                        summary={() => (
                          <>
                            {extraction.tax !== undefined && (
                              <Table.Summary.Row>
                                <Table.Summary.Cell
                                  colSpan={2}
                                  index={0}
                                  align="right"
                                >
                                  <strong>Tax/GST</strong>
                                </Table.Summary.Cell>
                                <Table.Summary.Cell index={1} align="right">
                                  {formatCurrency(
                                    extraction.tax,
                                    extraction.currency!,
                                  )}
                                </Table.Summary.Cell>
                              </Table.Summary.Row>
                            )}
                            {extraction.total !== undefined && (
                              <Table.Summary.Row>
                                <Table.Summary.Cell
                                  colSpan={2}
                                  index={0}
                                  align="right"
                                >
                                  <strong style={{ fontSize: 16 }}>
                                    Total
                                  </strong>
                                </Table.Summary.Cell>
                                <Table.Summary.Cell index={1} align="right">
                                  <strong style={{ fontSize: 16 }}>
                                    {formatCurrency(
                                      extraction.total,
                                      extraction.currency!,
                                    )}
                                  </strong>
                                </Table.Summary.Cell>
                              </Table.Summary.Row>
                            )}
                          </>
                        )}
                      />
                    </>
                  )}
                </>
              )}
            </Space>
          </Col>
        </Row>
      </Modal>

      {/* Delete Confirmation */}
      <Modal
        title="Delete Extraction"
        open={showDeleteConfirm}
        onOk={handleDelete}
        onCancel={() => setShowDeleteConfirm(false)}
        okText="Yes"
        okButtonProps={{ danger: true, loading: deleting }}
        cancelButtonProps={{ disabled: deleting }}
      >
        <p>Are you sure you want to permanently delete this record?</p>
      </Modal>
    </>
  );
};
