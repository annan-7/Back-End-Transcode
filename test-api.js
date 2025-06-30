const fs = require('fs');
const path = require('path');

// Simple test script to demonstrate API usage
console.log('🎬 Video Transcoding API Test Script');
console.log('=====================================\n');

console.log('This script demonstrates how to use the Video Transcoding API.\n');

console.log('📋 Available Endpoints:');
console.log('1. Health Check: GET /health');
console.log('2. Upload Video: POST /api/upload/video');
console.log('3. Start Transcoding: POST /api/transcode/start');
console.log('4. Check Job Status: GET /api/transcode/status/:jobId');
console.log('5. Get Transcoded Video: GET /api/transcode/video/:fileId');
console.log('6. System Status: GET /api/status/system\n');

console.log('🚀 Getting Started:');
console.log('1. Make sure FFmpeg is installed on your system');
console.log('2. Install dependencies: npm install');
console.log('3. Start the server: npm start');
console.log('4. The API will be available at http://localhost:3000\n');

console.log('📝 Example Usage with curl:');
console.log('');

console.log('# 1. Check API health');
console.log('curl http://localhost:3000/health');
console.log('');

console.log('# 2. Upload a video file');
console.log('curl -X POST http://localhost:3000/api/upload/video \\');
console.log('  -F "video=@/path/to/your/video.mp4"');
console.log('');

console.log('# 3. Start transcoding (replace FILE_ID with the ID from step 2)');
console.log('curl -X POST http://localhost:3000/api/transcode/start \\');
console.log('  -H "Content-Type: application/json" \\');
console.log('  -d \'{"fileId": "FILE_ID", "qualities": ["320p", "480p", "720p", "1080p"]}\'');
console.log('');

console.log('# 4. Check transcoding status (replace JOB_ID with the ID from step 3)');
console.log('curl http://localhost:3000/api/transcode/status/JOB_ID');
console.log('');

console.log('# 5. Get transcoded video info (replace FILE_ID)');
console.log('curl http://localhost:3000/api/transcode/video/FILE_ID');
console.log('');

console.log('# 6. Access the master playlist');
console.log('curl http://localhost:3000/videos/FILE_ID/master.m3u8');
console.log('');

console.log('📊 Monitoring:');
console.log('# Get system status');
console.log('curl http://localhost:3000/api/status/system');
console.log('');

console.log('# Get storage usage');
console.log('curl http://localhost:3000/api/status/storage');
console.log('');

console.log('# Get job statistics');
console.log('curl http://localhost:3000/api/status/jobs/stats');
console.log('');

console.log('🎯 Quality Options:');
console.log('- 320p: 568x320, 500k video, 64k audio');
console.log('- 480p: 854x480, 1000k video, 96k audio');
console.log('- 720p: 1280x720, 2500k video, 128k audio');
console.log('- 1080p: 1920x1080, 5000k video, 192k audio');
console.log('');

console.log('📁 File Structure:');
console.log('uploads/ - Original uploaded videos');
console.log('transcoded/ - HLS output files');
console.log('  └── {fileId}/');
console.log('      ├── master.m3u8');
console.log('      ├── 320p/');
console.log('      ├── 480p/');
console.log('      ├── 720p/');
console.log('      └── 1080p/');
console.log('');

console.log('🔧 Troubleshooting:');
console.log('- Ensure FFmpeg is installed: ffmpeg -version');
console.log('- Check server logs for detailed error messages');
console.log('- Verify file permissions on uploads/ and transcoded/ directories');
console.log('- Monitor disk space for large video files');
console.log('');

console.log('✨ Features:');
console.log('✅ Multi-quality transcoding (320p, 480p, 720p, 1080p)');
console.log('✅ HLS streaming with M3U8 playlists');
console.log('✅ Asynchronous job processing');
console.log('✅ Real-time progress tracking');
console.log('✅ Separate upload and transcoded storage');
console.log('✅ Comprehensive monitoring and status endpoints');
console.log('✅ Security features (rate limiting, CORS, validation)');
console.log('');

console.log('🎉 Ready to transcode videos!');
console.log('Start the server and try the examples above.\n'); 