# Blog MONKEE Setup Guide

## Architecture Overview

This application consists of:
- **Frontend**: React/TypeScript app hosted on Netlify
- **Backend**: Node.js/Express server hosted on Render
- **Database**: PostgreSQL (managed by Render)

## Backend Setup (Render)

### 1. Environment Variables
Set these environment variables in your Render dashboard:

```bash
DATABASE_URL=postgresql://username:password@host:port/database
GEMINI_API_KEY_BACKEND=your_gemini_api_key_here
PORT=3001
```

### 2. Dependencies
The backend automatically installs dependencies from `backend/package.json`:
- Express server
- PostgreSQL client
- Google Generative AI
- CORS middleware
- Winston logging

### 3. API Endpoints
- `/api/gemini-proxy` - Handles all Gemini AI API calls
- `/api/crawl` - Web crawler for discovering URLs
- `/api/clients/:clientId/used-topics` - Tracks used topics
- `/api/clients/:clientId/sitemap-urls` - Stores sitemap URLs
- `/api/sitemap-proxy` - Proxies sitemap requests

## Frontend Setup (Netlify)

### 1. Environment Variables
Create a `.env.local` file in the root directory:

```bash
VITE_BACKEND_URL=https://your-app-name.onrender.com
```

### 2. Dependencies
Install frontend dependencies:
```bash
npm install
```

### 3. Configuration
The frontend now uses a centralized API configuration (`config/api.ts`) that:
- Routes all AI calls through the backend proxy
- Manages backend URL configuration
- Provides consistent API endpoint management

## Key Changes Made

### Frontend (geminiService.ts)
- ✅ Removed direct Gemini API calls
- ✅ Implemented `callGeminiProxy` function
- ✅ Implemented `callGeminiImageProxy` function
- ✅ All AI calls now go through backend for security

### Backend (server.js)
- ✅ Enhanced Gemini proxy to handle both text and image generation
- ✅ Fixed duplicate server startup code
- ✅ Proper error handling for AI API calls

### Configuration
- ✅ Centralized API configuration
- ✅ Environment variable management
- ✅ Consistent backend URL usage

## Security Benefits

1. **API Key Protection**: Gemini API keys are only stored on the backend
2. **CORS Management**: Backend handles cross-origin requests
3. **Rate Limiting**: Backend can implement API call throttling
4. **Request Validation**: Backend validates all incoming requests

## Development vs Production

### Development
- Backend runs on `http://localhost:3001`
- Frontend uses local backend by default

### Production
- Backend runs on Render (e.g., `https://your-app.onrender.com`)
- Frontend uses production backend via `VITE_BACKEND_URL`

## Troubleshooting

### Common Issues

1. **CORS Errors**: Ensure backend has CORS enabled
2. **API Key Errors**: Check `GEMINI_API_KEY_BACKEND` on backend
3. **Connection Errors**: Verify `VITE_BACKEND_URL` on frontend
4. **Database Errors**: Check `DATABASE_URL` on backend

### Debug Steps

1. Check backend logs in Render dashboard
2. Verify environment variables are set correctly
3. Test backend endpoints directly
4. Check browser console for frontend errors

## Deployment Checklist

### Backend (Render)
- [ ] Environment variables configured
- [ ] Database connection working
- [ ] Gemini API key set
- [ ] Server starts without errors

### Frontend (Netlify)
- [ ] Environment variables set
- [ ] Backend URL configured
- [ ] Build completes successfully
- [ ] API calls work in production
