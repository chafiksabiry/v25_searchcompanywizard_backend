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
const allowedOrigins = [
  'https://harx25pageslinks.netlify.app',
  'https://harx25register.netlify.app',
  'http://localhost:5173',
  'http://localhost:4000',
  'http://localhost:3000'
];

app.use(cors({
  origin: function (origin: string | undefined, callback: (arg0: Error | null, arg1: boolean) => any) {
    // allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) === -1) {
      const msg = 'The CORS policy for this site does not allow access from the specified Origin.';
      return callback(new Error(msg), false);
    }
    return callback(null, true);
  },
  credentials: true
}));
app.use(morgan('dev'));
app.use(express.json());

// Health Check
app.get('/api/health', (req: Request, res: Response) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Root route for simple connectivity check
app.get('/', (req: Request, res: Response) => {
  res.status(200).send('Company Profile Backend API Running');
});

// Routes
app.use('/api/companies', companyRoutes);
app.use('/api/onboarding', onboardingProgressRoutes);
app.use('/api/openai', openaiRoutes);
// app.use('/api/users', userRoutes);

// Error handling
app.use(errorHandler);

// Start server
const startServer = async () => {
  try {
    const dbConnected = await connectDB();

    if (!dbConnected) {
      console.warn('⚠️  Server starting WITHOUT Database connection.');
    }

    app.listen(port, () => {
      console.log(`Server running on port  ${port}`);
      if (!dbConnected) {
        console.log('⚠️  NOTE: Database is NOT connected. API calls requiring DB will fail.');
      }
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();