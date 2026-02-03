import { useState, useCallback } from 'react';
import {
  Modal,
  Upload,
  Button,
  Space,
  Typography,
  message,
  Card,
  Divider,
  Spin,
} from 'antd';
import {
  CloudUploadOutlined,
  FileImageOutlined,
  LoadingOutlined,
} from '@ant-design/icons';
import type { UploadProps } from 'antd';
import { extractionService } from '../services/extraction.service';
import { Extraction } from '../types';
import { CloseOutlined } from '@ant-design/icons';
import { useAuth } from '../hooks/useAuth';

const { Dragger } = Upload;
const { Text } = Typography;

interface NewExtractionModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: (extraction: Extraction) => void;
}

export const NewExtractionModal: React.FC<NewExtractionModalProps> = ({
  open,
  onClose,
  onSuccess,
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [fileLoadedTime, setFileLoadedTime] = useState<Date | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const options: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  };
  const { token } = useAuth();

  const uploadProps: UploadProps = {
    name: 'file',
    multiple: false,
    accept: 'image/jpeg,image/jpg,image/png',
    beforeUpload: (file) => {
      const isImage =
        file.type === 'image/jpeg' ||
        file.type === 'image/jpg' ||
        file.type === 'image/png';
      if (!isImage) {
        message.error('You can only upload JPG/PNG files!', 10);
        return Upload.LIST_IGNORE;
      }
      const isLt10M = file.size / 1024 / 1024 < 10;
      if (!isLt10M) {
        message.error('Image must be smaller than 10MB!', 10);
        return Upload.LIST_IGNORE;
      }
      console.log(file);
      setFile(file);
      setFileLoadedTime(new Date());
      return false;
    },
    onRemove: () => {
      onRemoveFile();
    },
    fileList: file
      ? [{ uid: '-1', name: file.name, status: 'done', url: '' }]
      : [],
  };

  const handleSubmit = async () => {
    if (!file) return;

    try {
      setSubmitting(true);
      const extraction = await extractionService.createExtraction(file);
      message.success('Receipt submitted successfully!');
      onSuccess(extraction);
      handleClose();
    } catch (error: any) {
      message.error(
        error.response?.data?.message || 'Failed to submit receipt',
      );
    } finally {
      setSubmitting(false);
    }
  };

  const onRemoveFile = () => {
    setFile(null);
    setFileLoadedTime(null);
  };

  const handleClose = () => {
    if (!submitting) {
      setFile(null);
      setFileLoadedTime(null);
      onClose();
    }
  };

  return (
    <Modal
      title="New Extraction"
      open={open}
      onCancel={handleClose}
      closeIcon={<CloseOutlined />}
      footer={[
        <Button key="cancel" onClick={handleClose} disabled={submitting}>
          Cancel
        </Button>,
        <Button
          key="submit"
          type="primary"
          onClick={handleSubmit}
          disabled={!file || submitting}
        >
          Extract
        </Button>,
      ]}
      width={600}
      className="custom-modal min-height-300"
    >
      <Space
        orientation="vertical"
        style={{ width: 400, margin: '0 auto', alignSelf: 'center' }}
        size="large"
      >
        {!file && (
          <Dragger {...uploadProps}>
            <p className="ant-upload-drag-icon">
              {submitting ? <LoadingOutlined /> : <CloudUploadOutlined />}
            </p>
            <p className="ant-upload-text">
              {submitting ? 'Submitting Receipt...' : 'Choose file to upload'}
            </p>
            <p className="ant-upload-hint">
              Support for JPG, JPEG, PNG files. Maximum size 10MB.
            </p>
          </Dragger>
        )}

        {file && submitting && (
          <div style={{ textAlign: 'center', padding: '48px' }}>
            <Spin size="large" />
            <Text>Submitting...</Text>
          </div>
        )}

        {file && !submitting && (
          <Card style={{ maxWidth: 400, margin: '0 auto' }}>
            <Space
              orientation="horizontal"
              align="center"
              style={{ width: '100%', justifyContent: 'space-between' }}
            >
              <Space orientation="horizontal" align="center">
                <FileImageOutlined style={{ fontSize: 62, color: '#1890ff' }} />
                <Space orientation="vertical" size={4}>
                  <Text type="secondary" strong>
                    {file.name} - ({(file.size / 1024 / 1024).toFixed(2)} MB)
                  </Text>
                  <Divider style={{ margin: 0 }}></Divider>
                  <Text type="secondary">
                    Uploaded by
                    {atob(token as string)
                      .split('@')[0]
                      .toLowerCase()}
                  </Text>
                  <Text type="secondary">
                    {fileLoadedTime?.toLocaleString('en-US', options)}
                  </Text>
                </Space>
              </Space>

              {/* Right side: close icon aligned middle */}
              <CloseOutlined
                onClick={onRemoveFile}
                style={{ fontSize: 18, color: '#999', cursor: 'pointer' }}
              />
            </Space>
          </Card>
        )}
      </Space>
    </Modal>
  );
};
