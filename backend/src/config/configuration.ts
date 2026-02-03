export default () => ({
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT, 10) || 3000,

  database: {
    url: process.env.DATABASE_URL,
  },

  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT, 10) || 6379,
    imageTTL: parseInt(process.env.REDIS_IMAGE_TTL, 10) || 900,
  },

  aws: {
    region: process.env.AWS_REGION || 'us-east-1',
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    s3BucketName: process.env.S3_BUCKET_NAME,
  },

  ollama: {
    host: process.env.OLLAMA_HOST || 'http://localhost:11434',
    model: process.env.OLLAMA_MODEL || 'llava:13b',
  },

  cors: {
    origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  },
});
