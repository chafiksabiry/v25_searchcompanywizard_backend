import express from 'express';
import session from 'express-session';
import cors from 'cors';
import dotenv from 'dotenv';
import { LinkedInClient } from 'node-linkedin-v2';
import { onboardingProgressRoutes } from './src/infrastructure/routes/onboardingProgressRoutes';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5001;

// LinkedIn API credentials
const CLIENT_ID = process.env.LINKEDIN_CLIENT_ID;
const CLIENT_SECRET = process.env.LINKEDIN_CLIENT_SECRET;
const REDIRECT_URI = 'http://localhost:5001/auth/linkedin/callback';

const linkedIn = new LinkedInClient({
  clientId: CLIENT_ID,
  clientSecret: CLIENT_SECRET,
  redirectUri: REDIRECT_URI
});

// Middleware
app.use(cors());

app.use(express.json());
app.use(session({
  secret: process.env.SESSION_SECRET || 'your-secret-key',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

// Routes
app.get('/auth/linkedin', (req, res) => {
  const authUrl = linkedIn.getAuthorizationUrl(['r_organization_social']);
  res.json({ url: authUrl });
});

app.get('/auth/linkedin/callback', async (req, res) => {
  try {
    const { code } = req.query;
    const { accessToken } = await linkedIn.getAccessToken(code);
    req.session.accessToken = accessToken;
    res.redirect('http://localhost:5173');
  } catch (error) {
    console.error('LinkedIn auth error:', error);
    res.status(500).json({ error: 'Authentication failed' });
  }
});

app.get('/api/company/:name', async (req, res) => {
  try {
    if (!req.session.accessToken) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const { name } = req.params;
    const response = await linkedIn.companySearch({
      q: name,
      count: 10
    });

    res.json(response);
  } catch (error) {
    console.error('Company search error:', error);
    res.status(500).json({ error: 'Failed to search company' });
  }
});

app.use('/api', onboardingProgressRoutes);

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});