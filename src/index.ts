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

const app = express();
const port = process.env.PORT || 5001;

// Middleware
app.use(cors());
app.use(morgan('dev'));
app.use(express.json());

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
    await connectDB();
    app.listen(port, () => {
      console.log(`Server running on port  ${port}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();