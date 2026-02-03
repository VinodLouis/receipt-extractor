import { Form, Input, Button, Typography } from 'antd';
const { Title } = Typography;
export const EmailForm = ({
  onSubmit,
}: {
  onSubmit: (email: string) => void;
}) => {
  const [form] = Form.useForm();

  return (
    <div
      style={{
        maxWidth: 400,
        border: '1px solid #d9d9d9',
        margin: '100px auto',
        padding: 24,
      }}
    >
      <Title
        level={2}
        style={{ margin: 25, textAlign: 'center', color: '#1890ff' }}
      >
        Receipt Extractor
      </Title>
      <Form
        form={form}
        onFinish={({ email }) => onSubmit(email)}
        layout="vertical"
      >
        <Form.Item
          name="email"
          rules={[
            { required: true, message: 'Email is required' },
            { type: 'email', message: 'Invalid email' },
          ]}
        >
          <Input size="large" placeholder="your@email.com" />
        </Form.Item>
        <Form.Item shouldUpdate>
          {() => (
            <Button
              type="primary"
              htmlType="submit"
              block
              size="large"
              disabled={
                !form.isFieldsTouched(true) ||
                form.getFieldsError().some(({ errors }) => errors.length)
              }
            >
              Continue
            </Button>
          )}
        </Form.Item>
      </Form>
    </div>
  );
};
