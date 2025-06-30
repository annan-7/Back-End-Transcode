# Video Transcoding API

A powerful video transcoding API built with Express.js and FFmpeg that converts videos to multiple qualities and outputs them in HLS (M3U8) format.

## Features

- 🎥 **Multi-quality transcoding**: 320p, 480p, 720p, 1080p
- 📱 **HLS streaming**: Output in M3U8 format for adaptive streaming
- 🔄 **Asynchronous processing**: Non-blocking transcoding jobs
- 📊 **Real-time progress tracking**: Monitor transcoding status
- 🛡️ **Security**: Rate limiting, CORS, and input validation
- 📁 **Organized storage**: Separate upload and transcoded file directories
- 🔍 **Comprehensive monitoring**: System status and job statistics

## Prerequisites

- Node.js (v14 or higher)
- FFmpeg installed on your system

### Installing FFmpeg

**Ubuntu/Debian:**
```bash
sudo apt update
sudo apt install ffmpeg
```

**macOS:**
```bash
brew install ffmpeg
```

**Windows:**
Download from [FFmpeg official website](https://ffmpeg.org/download.html)

## Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd trans-code
```

2. Install dependencies:
```bash
npm install
```

3. Start the server:
```bash
npm start
```

For development with auto-restart:
```bash
npm run dev
```

The API will be available at `http://localhost:3000`

## API Endpoints

### Health Check
- `GET /health` - Check API status

### Upload Management
- `POST /api/upload/video` - Upload a video file
- `GET /api/upload/video/:fileId` - Get video information
- `GET /api/upload/videos` - List all uploaded videos
- `DELETE /api/upload/video/:fileId` - Delete uploaded video

### Transcoding
- `POST /api/transcode/start` - Start transcoding job
- `GET /api/transcode/status/:jobId` - Get job status
- `GET /api/transcode/jobs` - List all active jobs
- `DELETE /api/transcode/cancel/:jobId` - Cancel transcoding job
- `GET /api/transcode/video/:fileId` - Get transcoded video info
- `GET /api/transcode/videos` - List all transcoded videos
- `DELETE /api/transcode/video/:fileId` - Delete transcoded video

### Status & Monitoring
- `GET /api/status/system` - Get system status
- `GET /api/status/storage` - Get storage usage
- `GET /api/status/jobs/stats` - Get job statistics

### Video Streaming
- `GET /videos/:fileId/master.m3u8` - Master playlist
- `GET /videos/:fileId/:quality/playlist.m3u8` - Quality-specific playlist

## Usage Examples

### 1. Upload a Video

```bash
curl -X POST http://localhost:3000/api/upload/video \
  -F "video=@/path/to/your/video.mp4"
```

Response:
```json
{
  "message": "Video uploaded successfully",
  "fileId": "550e8400-e29b-41d4-a716-446655440000",
  "filename": "550e8400-e29b-41d4-a716-446655440000.mp4",
  "size": 52428800,
  "uploadedAt": "2024-01-15T10:30:00.000Z"
}
```

### 2. Start Transcoding

```bash
curl -X POST http://localhost:3000/api/transcode/start \
  -H "Content-Type: application/json" \
  -d '{
    "fileId": "550e8400-e29b-41d4-a716-446655440000",
    "qualities": ["320p", "480p", "720p", "1080p"]
  }'
```

Response:
```json
{
  "message": "Transcoding job started",
  "jobId": "6ba7b810-9dad-11d1-80b4-00c04fd430c8",
  "fileId": "550e8400-e29b-41d4-a716-446655440000",
  "qualities": ["320p", "480p", "720p", "1080p"],
  "status": "processing"
}
```

### 3. Check Job Status

```bash
curl http://localhost:3000/api/transcode/status/6ba7b810-9dad-11d1-80b4-00c04fd430c8
```

Response:
```json
{
  "id": "6ba7b810-9dad-11d1-80b4-00c04fd430c8",
  "status": "processing",
  "progress": 45,
  "qualities": ["320p", "480p", "720p", "1080p"],
  "segments": {
    "320p": { "status": "completed", "progress": 100 },
    "480p": { "status": "processing", "progress": 60 },
    "720p": { "status": "processing", "progress": 30 },
    "1080p": { "status": "processing", "progress": 15 }
  }
}
```

### 4. Get Transcoded Video Info

```bash
curl http://localhost:3000/api/transcode/video/550e8400-e29b-41d4-a716-446655440000
```

Response:
```json
{
  "fileId": "550e8400-e29b-41d4-a716-446655440000",
  "masterPlaylistUrl": "/videos/550e8400-e29b-41d4-a716-446655440000/master.m3u8",
  "qualities": ["320p", "480p", "720p", "1080p"],
  "qualityInfo": {
    "320p": {
      "playlistUrl": "/videos/550e8400-e29b-41d4-a716-446655440000/320p/playlist.m3u8",
      "totalSize": 10485760,
      "fileCount": 15
    }
  }
}
```

## File Structure

```
trans-code/
├── server.js              # Main server file
├── package.json           # Dependencies and scripts
├── README.md             # This file
├── uploads/              # Original uploaded videos
├── transcoded/           # Transcoding output
│   └── {fileId}/
│       ├── master.m3u8   # Master playlist
│       ├── 320p/
│       │   ├── playlist.m3u8
│       │   └── segment_*.ts
│       ├── 480p/
│       ├── 720p/
│       └── 1080p/
├── routes/               # API route handlers
│   ├── upload.js
│   ├── transcode.js
│   └── status.js
└── utils/               # Utility functions
    └── transcoder.js
```

## Quality Configurations

| Quality | Resolution | Video Bitrate | Audio Bitrate |
|---------|------------|---------------|---------------|
| 320p    | 568x320    | 500k          | 64k           |
| 480p    | 854x480    | 1000k         | 96k           |
| 720p    | 1280x720   | 2500k         | 128k          |
| 1080p   | 1920x1080  | 5000k         | 192k          |

## Environment Variables

- `PORT` - Server port (default: 3000)
- `NODE_ENV` - Environment mode (development/production)
- `ALLOWED_ORIGINS` - CORS allowed origins (comma-separated)

## Error Handling

The API includes comprehensive error handling:
- Input validation
- File type checking
- FFmpeg error handling
- Rate limiting
- Graceful error responses

## Security Features

- **Rate Limiting**: 100 requests per 15 minutes per IP
- **CORS Protection**: Configurable allowed origins
- **Helmet**: Security headers
- **Input Validation**: File type and size validation
- **File Size Limits**: 500MB maximum upload size

## Monitoring

Use the status endpoints to monitor:
- System health and performance
- Storage usage
- Job statistics
- Active transcoding jobs

## Troubleshooting

### Common Issues

1. **FFmpeg not found**: Ensure FFmpeg is installed and in your PATH
2. **Permission errors**: Check directory permissions for uploads/transcoded folders
3. **Memory issues**: Large videos may require more system memory
4. **Disk space**: Ensure sufficient disk space for transcoding

### Logs

Check the console output for detailed logs including:
- Upload progress
- Transcoding status
- Error messages
- System information

