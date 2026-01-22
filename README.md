# QuickShare

A secure, serverless file and text sharing platform. Create password-protected containers to share content between devices instantly. No login required!

## Features

- 📦 **Containers**: Create named containers with password protection
- 📁 **File Sharing**: Upload and download files (up to 50MB)
- 📝 **Text Sharing**: Share text/clipboard content between devices
- 🔐 **Password Protection**: All containers are password-protected
- 🔍 **Search**: Find containers by name
- 🚫 **No Login Required**: Anyone can create or access containers

## Tech Stack

- **Frontend**: React 19, TypeScript, Vite, TailwindCSS
- **Backend**: Node.js, Express, MongoDB, Multer
- **Security**: bcryptjs for password hashing

## Project Structure

```
QuickShare/
├── backend/                # Backend API
│   ├── models/            # MongoDB models
│   │   └── Container.js   # Container schema
│   ├── routes/            # API routes
│   │   └── containers.js  # Container endpoints
│   ├── uploads/           # File storage
│   ├── index.js           # Express server
│   ├── package.json       # Backend dependencies
│   └── .env               # Backend config
├── frontend/              # Frontend React app
│   ├── components/        # React components
│   ├── services/          # API client
│   │   └── storageService.ts
│   ├── App.tsx            # Main app component
│   ├── index.tsx          # Entry point
│   ├── package.json       # Frontend dependencies
│   └── .env               # Frontend config
├── package.json           # Root scripts
└── README.md
```

## Prerequisites

- Node.js 18+
- MongoDB (local or Atlas)

## Setup & Installation

### 1. Install All Dependencies

```bash
npm install
npm run install:all
```

### 2. Configure Environment

**Backend** (`backend/.env`):
```env
PORT=5000
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/quickshare
FRONTEND_URL=http://localhost:3000
MAX_FILE_SIZE=52428800
```

**Frontend** (`frontend/.env`):
```env
VITE_API_URL=http://localhost:5000/api
```

### 3. Start the Application

**Run Both Together:**
```bash
npm run dev
```

**Or Run Separately:**

Terminal 1 - Backend:
```bash
npm run backend
```

Terminal 2 - Frontend:
```bash
npm run frontend
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/containers` | Create new container |
| GET | `/api/containers/search?q=` | Search containers |
| POST | `/api/containers/:id/verify` | Unlock container |
| GET | `/api/containers/:id` | Get container details |
| PUT | `/api/containers/:id/text` | Update text content |
| POST | `/api/containers/:id/files` | Upload file |
| GET | `/api/containers/:id/files/:fileId/download` | Download file |
| DELETE | `/api/containers/:id/files/:fileId` | Delete file |

## Usage

1. **Create a Container**: Click "Create New Container", enter a name and password
2. **Share Files**: Upload files to your container
3. **Share Text**: Use the text tab to paste/type shared content
4. **Access from Another Device**: Search for your container by name, enter password
5. **Download Files**: Click download on any file to save it locally

## License

MIT

