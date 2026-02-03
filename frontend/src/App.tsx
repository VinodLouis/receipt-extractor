import { useEffect, useState } from 'react';
import { Layout, Typography, Button, Space } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { ExtractionList } from './components/ExtractionList';
import { NewExtractionModal } from './components/NewExtractionModal';
import { ExtractionDetailsModal } from './components/ExtractionDetailsModal';
import { extractionService } from './services/extraction.service';
import { Extraction } from './types';
import { useAuth } from './hooks/useAuth';
import { EmailForm } from './components/Email';
import { useWebSocket } from './hooks/useWebSockets';

const { Header, Content } = Layout;
const { Title } = Typography;

function App() {
  const [extractions, setExtractions] = useState<Extraction[]>([]);
  const [isNewExtractionOpen, setIsNewExtractionOpen] = useState(false);
  const [selectedExtraction, setSelectedExtraction] =
    useState<Extraction | null>(null);
  const [loading, setLoading] = useState(false);

  const { isAuthenticated, token, login } = useAuth();

  const loadExtractions = async () => {
    try {
      setLoading(true);
      const data = await extractionService.getExtractions();
      setExtractions(data);
    } catch (error) {
      console.error('Failed to load extractions:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated && !loading) {
      loadExtractions();
    }
  }, [isAuthenticated]);

  useWebSocket(
    token,
    (update) => {
      setExtractions((prev) =>
        prev.map((ext) =>
          ext.id === update.id
            ? {
                ...ext,
                ...update,
              }
            : ext,
        ),
      );

      // Update selected extraction if it's open
      if (selectedExtraction?.id === update.id) {
        setSelectedExtraction((prev) => ({
          ...prev!,
          ...update,
        }));
      }
    },
    (data: Extraction) => {
      setSelectedExtraction(data);
    },
    isAuthenticated && !loading,
  );

  const handleExtractionCreated = (extraction: Extraction) => {
    setExtractions((prev) => [extraction, ...prev]);
    setIsNewExtractionOpen(false);
  };

  const handleDelete = async (id: string) => {
    try {
      await extractionService.delete(id);
      setExtractions((prev) => prev.filter((ext) => ext.id !== id));
      if (selectedExtraction?.id === id) {
        setSelectedExtraction(null);
      }
    } catch (error) {
      console.error('Failed to delete extraction:', error);
      throw error;
    }
  };

  if (!isAuthenticated) {
    return <EmailForm onSubmit={login}></EmailForm>;
  }

  return (
    <Layout
      style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}
    >
      <Header
        style={{
          background: '#fff',
          padding: '0 24px',
          borderBottom: '1px solid #f0f0f0',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', height: '100%' }}>
          <Title level={3} style={{ margin: 0, color: '#1890ff' }}>
            📄 Receipt Extractor
          </Title>
        </div>
      </Header>

      <Content
        style={{
          display: 'flex',
          flexDirection: 'column',
          flex: 1,
          padding: '24px',
          maxWidth: 1200,
          margin: '0 auto',
          width: '100%',
        }}
      >
        <div className="app-container">
          <div className="header-info">
            <div className="header-title">
              <Title level={2}>My Extractions</Title>
            </div>
            <div className="header-btn-container">
              <Button
                type="primary"
                icon={<PlusOutlined />}
                size="large"
                onClick={() => setIsNewExtractionOpen(true)}
              >
                New Extraction
              </Button>
            </div>
          </div>

          <div className="extraction-list-container">
            <ExtractionList
              extractions={extractions}
              loading={loading}
              onSelect={setSelectedExtraction}
              onDelete={handleDelete}
            />
          </div>
        </div>

        {isNewExtractionOpen && (
          <NewExtractionModal
            open={isNewExtractionOpen}
            onClose={() => setIsNewExtractionOpen(false)}
            onSuccess={handleExtractionCreated}
          />
        )}

        {selectedExtraction && (
          <ExtractionDetailsModal
            extraction={selectedExtraction}
            open={!!selectedExtraction}
            onClose={() => setSelectedExtraction(null)}
            onDelete={handleDelete}
          />
        )}
      </Content>
    </Layout>
  );
}

export default App;
