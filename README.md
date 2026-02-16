# Knowledge Vault

A modern web application to manage your personal knowledge. Capture quotes, organize insights, and build your own knowledge base.

![Version](https://img.shields.io/badge/version-1.0.0-blue)
![Firebase](https://img.shields.io/badge/firebase-10.8.0-orange)
![Vite](https://img.shields.io/badge/vite-5.0.0-646cff)
![Groq](https://img.shields.io/badge/groq-AI%20powered-f55036)

---

## Features

- 📖 **Personal Wiki** - Create and organize topics with custom icons
- 💡 **Insight Manager** - Capture insights from videos, articles, podcasts and books
- 📝 **Quote Repository** - Save and organize quotes with collections and tags
- 🔍 **Smart Search** - Filter by stance, collection, tags and keywords
- 🌍 **Multi-language** - Spanish and English interface
- 🔒 **Secure** - Email + Google authentication with Firebase
- 📱 **Responsive** - Works seamlessly on mobile, tablet and desktop
- 🎬 **YouTube Transcripts** - Automatic transcript extraction with multi-language support
- 🤖 **AI-Powered Descriptions** - Intelligent video description extraction using Groq AI

---

## Prerequisites

- [Node.js](https://nodejs.org/) v16 or higher
- [Firebase account](https://console.firebase.google.com/)
- [Netlify CLI](https://docs.netlify.com/cli/get-started/) (for YouTube transcript functionality)

---

## Installation

### 1. Clone and install dependencies

```bash
git clone <repository-url>
cd quote-vault
npm install
```

### 2. Install Netlify CLI (for YouTube transcripts)

```bash
npm install -g netlify-cli
```

This enables the serverless function that fetches YouTube transcripts using `yt-dlp`.

### 3. Firebase Setup

#### Create Firebase Project
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click **"Create project"**
3. Name your project (e.g., `knowledge-vault`)
4. Disable Google Analytics (optional)
5. Click **"Create project"**

#### Enable Authentication
1. Navigate to **Authentication** → **Get started**
2. Enable **Email/Password** sign-in method
3. (Optional) Enable **Google** sign-in method

#### Create Firestore Database
1. Navigate to **Firestore Database** → **Create database**
2. Start in **production mode**
3. Choose your nearest location
4. Click **Enable**

#### Configure Security Rules
Go to **Firestore Database** → **Rules** and paste:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    function isOwner(userId) {
      return request.auth != null && request.auth.uid == userId;
    }

    match /quotes/{quoteId} {
      allow read, write: if isOwner(resource.data.userId);
      allow create: if isOwner(request.resource.data.userId);
    }

    match /collections/{collectionId} {
      allow read, write: if isOwner(resource.data.userId);
      allow create: if isOwner(request.resource.data.userId);
    }

    match /topics/{topicId} {
      allow read, write: if isOwner(resource.data.userId);
      allow create: if isOwner(request.resource.data.userId);
    }

    match /insights/{insightId} {
      allow read, write: if isOwner(resource.data.userId);
      allow create: if isOwner(request.resource.data.userId);
    }

    match /knowledge/{entryId} {
      allow read, write: if isOwner(resource.data.userId);
      allow create: if isOwner(request.resource.data.userId);
    }
  }
}
```

Click **Publish**.

#### Create Indexes
Go to **Firestore Database** → **Indexes** → **Create index**

Create these three indexes:

**Index 1 - Quotes:**
- Collection ID: `quotes`
- Fields: `userId` (Ascending), `createdAt` (Descending)

**Index 2 - Insights:**
- Collection ID: `insights`
- Fields: `userId` (Ascending), `createdAt` (Descending)

**Index 3 - Topics:**
- Collection ID: `topics`
- Fields: `userId` (Ascending), `createdAt` (Descending)

Wait a few minutes for indexes to build.

#### Get Firebase Credentials
1. Go to **Project Settings** (gear icon)
2. Scroll to **Your apps** → Click web icon **</>**
3. Register app (name: `knowledge-vault-web`)
4. Copy the `firebaseConfig` values

### 4. Configure Environment Variables

Create a `.env` file from the example:

```bash
cp .env.example .env
```

Open `.env` and replace with your Firebase credentials:

```bash
VITE_FIREBASE_API_KEY=your_firebase_api_key
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
VITE_FIREBASE_MEASUREMENT_ID=G-XXXXXXXXXX
GROQ_API_KEY=your_groq_api_key_here
```

### 5. Configure Groq AI (Optional - Recommended)

Groq AI powers intelligent video description extraction for insights. While optional, it significantly improves the quality of auto-extracted descriptions from YouTube videos.

**Free tier:** 14,400 requests/day

#### Get Groq API Key

1. Go to [console.groq.com](https://console.groq.com)
2. Sign up for a free account
3. Navigate to **API Keys** → **Create API Key**
4. Copy your API key

#### Add to Environment Variables

Add to your `.env` file:

```bash
GROQ_API_KEY=your_groq_api_key_here
```

**For Netlify deployment:**
1. Go to your Netlify project
2. **Site settings** → **Environment variables**
3. Add variable: `GROQ_API_KEY` = `your_api_key`
4. Redeploy

**How it works:**
- ✅ With Groq: AI extracts clean 2-3 sentence descriptions from videos
- ❌ Without Groq: Fallback to regex-based extraction (less accurate)

---

## Run

### Development

**Option 1: With YouTube transcript support (recommended)**

```bash
netlify dev
```

This runs Vite dev server + Netlify Functions. Open [http://localhost:8888](http://localhost:8888)

**Option 2: Frontend only (no transcript functionality)**

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173)

### Production Build

```bash
npm run build
npm run preview
```

---

## Deployment

### Netlify (Recommended - includes YouTube transcripts)

**Via Netlify CLI:**

```bash
# Login to Netlify
netlify login

# Initialize Netlify site
netlify init

# Deploy
netlify deploy --prod
```

The deployment includes:
- Static frontend (Vite build)
- Netlify Function for YouTube transcripts
- Automatic yt-dlp binary download on first function execution

**Via Git Integration:**

1. Push your code to GitHub/GitLab
2. Connect repository in [Netlify Dashboard](https://app.netlify.com)
3. Build settings:
   - Build command: `npm run build`
   - Publish directory: `dist`
   - Functions directory: `netlify/functions` (auto-detected)

**Via Drag & Drop (Frontend only - no transcripts):**

```bash
npm run build
```

Drag the `dist` folder to [Netlify Drop](https://app.netlify.com/drop)

⚠️ This method doesn't include serverless functions, so YouTube transcript feature won't work.

### Vercel

```bash
npm install -g vercel
vercel
```

### Firebase Hosting

```bash
npm install -g firebase-tools
firebase login
firebase init hosting
npm run build
firebase deploy
```

---

## Technologies & APIs

### Core Stack
- **Frontend**: Vite + Vanilla JavaScript
- **Database**: Firebase Firestore (NoSQL)
- **Authentication**: Firebase Auth (Email/Password + Google)
- **Hosting**: Netlify (with serverless functions)

### YouTube Transcript Extraction
- **Backend**: Netlify Functions (Node.js serverless)
- **Tool**: [yt-dlp](https://github.com/yt-dlp/yt-dlp) via [yt-dlp-wrap](https://github.com/foxesdocode/yt-dlp-wrap)
- **Features**:
  - Automatic download of yt-dlp binary on first run
  - Support for manual subtitles and auto-generated captions
  - Multi-language support (100+ languages)
  - Formats: VTT and JSON3

### How it works
1. User provides YouTube video URL
2. Frontend sends video ID to Netlify Function (`/api/transcript`)
3. Function uses `yt-dlp` to fetch available subtitle tracks
4. Returns parsed subtitles with timestamps
5. Frontend displays interactive transcript with clickable timestamps

**Note**: No external API keys needed for YouTube transcripts. Everything runs on your Netlify instance.

---

## License

MIT License - feel free to use this project for personal or commercial purposes.

---

**Built with Firebase + Vite** 🚀
