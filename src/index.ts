import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import { connectDB } from './infrastructure/database/mongoose';
import { errorHandler } from './infrastructure/middleware/errorHandler';
import { companyRoutes } from './infrastructure/routes/companyRoutes';
import { onboardingProgressRoutes } from './infrastructure/routes/onboardingProgressRoutes';
import { openaiRoutes } from './infrastructure/routes/openaiRoutes';
// import { userRoutes } from './infrastructure/routes/userRoutes';

import { Request, Response } from 'express';

const app = express();
const port = process.env.PORT || 5001;

// Middleware
app.enable('trust proxy'); // Required for Railway/Heroku proxies

const allowedOrigins = [
  'https://harx25pageslinks.netlify.app',
  'https://harx25register.netlify.app',
  'http://localhost:5173',
  'http://localhost:4000',
  'http://localhost:3000'
];

app.use(cors({
  // Temporarily allow all for debugging 502s, then restrict back
  origin: true,
  credentials: true
}));
app.use(morgan('dev'));
app.use(express.json());

// Routes
app.use('/api/companies', companyRoutes);
app.use('/api/openai', openaiRoutes);
app.use('/api/onboarding', onboardingProgressRoutes);

// Start server
const startServer = async () => {
  try {
    const dbConnected = await connectDB();

    if (!dbConnected) {
      console.warn('⚠️  Server starting WITHOUT Database connection.');
    }

    // Explicitly bind to 0.0.0.0 for Docker/Railway
    const server = app.listen(Number(port), '0.0.0.0', () => {
      console.log(`Server running on port ${port} and bounded to 0.0.0.0`);
      if (!dbConnected) {
        console.log('⚠️  NOTE: Database is NOT connected. API calls requiring DB will fail.');
      }
    });

    // Fix for 502 Bad Gateway errors behind Load Balancers (Railway/AWS/Nginx)
    // Node.js default is 5s, LB is usually 60s. If Node closes connection while LB is reusing it => 502.
    server.keepAliveTimeout = 120 * 1000;
    server.headersTimeout = 120 * 1000;

  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();