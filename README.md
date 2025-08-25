# Blog MONKEE - AI-Powered Blog Content Generation

A comprehensive AI-powered application for generating blog posts for multiple clients using Google's Gemini AI.

## Architecture

- **Frontend**: React/TypeScript app hosted on Netlify
- **Backend**: Node.js/Express server hosted on Render  
- **Database**: PostgreSQL (managed by Render)
- **AI**: Google Gemini API (secured through backend proxy)

## Features

- 🤖 AI-powered blog content generation
- 👥 Multi-client management
- 🔍 Web crawling and sitemap analysis
- 📝 WordPress integration
- 🎨 AI-generated featured images
- 📊 SEO optimization with keywords and outlines

## Quick Start

### Prerequisites
- Node.js 18+
- PostgreSQL database
- Google Gemini API key

### 1. Backend Setup (Render)
1. Deploy the `backend/` folder to Render
2. Set environment variables:
   - `DATABASE_URL` - PostgreSQL connection string
   - `GEMINI_API_KEY_BACKEND` - Your Gemini API key
3. The server will automatically create required database tables

### 2. Frontend Setup (Netlify)
1. Set environment variable:
   - `VITE_BACKEND_URL` - Your Render backend URL
2. Deploy to Netlify

### 3. Local Development
```bash
# Install dependencies
npm install

# Start backend (in backend/ directory)
cd backend && npm start

# Start frontend (in root directory)
npm run dev
```

## Documentation

- [Setup Guide](SETUP.md) - Detailed setup instructions
- [API Documentation](config/api.ts) - Backend API endpoints

## Security

- All Gemini API calls are proxied through the backend
- API keys are never exposed to the frontend
- CORS is properly configured for production deployment
