/**
 * Simplified server for Render.com deployment
 * Serves the static Vite build and provides API proxy endpoints
 */

import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

// CORS configuration
app.use(cors());
app.use(express.json({ limit: '50mb' }));

// Environment variables for API keys (set in Render dashboard)
const GROQ_KEY = process.env.GROQ_KEY || null;

// Serve static files from dist folder (Vite build output)
const distPath = path.join(__dirname, 'dist');
app.use(express.static(distPath));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Groq API proxy endpoint
app.post('/api/groq', async (req, res) => {
  if (!GROQ_KEY) {
    return res.status(500).json({ error: 'GROQ_KEY not configured' });
  }

  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GROQ_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(req.body)
    });

    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error('Groq API error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Simple in-memory storage for demo (in production, use a real database)
let pillarsData = {};

// Load initial data if exists
const dataFile = path.join(__dirname, 'data.json');
try {
  if (fs.existsSync(dataFile)) {
    pillarsData = JSON.parse(fs.readFileSync(dataFile, 'utf8'));
  }
} catch (e) {
  console.log('No initial data file found');
}

// Save data endpoint
app.post('/api/save', (req, res) => {
  try {
    pillarsData = { ...pillarsData, ...req.body };
    fs.writeFileSync(dataFile, JSON.stringify(pillarsData, null, 2));
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Load data endpoint
app.get('/api/load', (req, res) => {
  res.json(pillarsData);
});

// Fallback to index.html for SPA routing
app.get('*', (req, res) => {
  res.sendFile(path.join(distPath, 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Pillars server running on port ${PORT}`);
  console.log(`GROQ_KEY configured: ${GROQ_KEY ? 'Yes' : 'No'}`);
});
