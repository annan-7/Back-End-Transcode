const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs-extra');
const { v4: uuidv4 } = require('uuid');

const router = express.Router();

// Configure multer for video uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    const uniqueId = uuidv4();
    const ext = path.extname(file.originalname);
    const filename = `${uniqueId}${ext}`;
    cb(null, filename);
  }
});

// File filter for video files
const fileFilter = (req, file, cb) => {
  const allowedTypes = [
    'video/mp4',
    'video/avi',
    'video/mov',
    'video/wmv',
    'video/flv',
    'video/webm',
    'video/mkv',
    'video/m4v'
  ];

  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only video files are allowed.'), false);
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 500 * 1024 * 1024, // 500MB limit
    files: 1
  }
});

// Upload video endpoint
router.post('/video', upload.single('video'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No video file uploaded' });
    }

    const fileInfo = {
      id: path.parse(req.file.filename).name,
      originalName: req.file.originalname,
      filename: req.file.filename,
      size: req.file.size,
      mimetype: req.file.mimetype,
      path: req.file.path,
      uploadedAt: new Date().toISOString()
    };

    // Store file info (in a real app, you'd use a database)
    const fileInfoPath = path.join('uploads', `${fileInfo.id}.json`);
    await fs.writeJson(fileInfoPath, fileInfo);

    res.status(201).json({
      message: 'Video uploaded successfully',
      fileId: fileInfo.id,
      filename: fileInfo.filename,
      size: fileInfo.size,
      uploadedAt: fileInfo.uploadedAt
    });

  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: 'Failed to upload video' });
  }
});

// Get uploaded video info
router.get('/video/:fileId', async (req, res) => {
  try {
    const { fileId } = req.params;
    const fileInfoPath = path.join('uploads', `${fileId}.json`);

    if (!await fs.pathExists(fileInfoPath)) {
      return res.status(404).json({ error: 'Video not found' });
    }

    const fileInfo = await fs.readJson(fileInfoPath);
    res.json(fileInfo);

  } catch (error) {
    console.error('Get video info error:', error);
    res.status(500).json({ error: 'Failed to get video info' });
  }
});

// List all uploaded videos
router.get('/videos', async (req, res) => {
  try {
    const uploadsDir = 'uploads';
    const files = await fs.readdir(uploadsDir);
    const videoFiles = [];

    for (const file of files) {
      if (file.endsWith('.json')) {
        const fileInfo = await fs.readJson(path.join(uploadsDir, file));
        videoFiles.push({
          id: fileInfo.id,
          originalName: fileInfo.originalName,
          size: fileInfo.size,
          uploadedAt: fileInfo.uploadedAt
        });
      }
    }

    res.json({
      videos: videoFiles,
      count: videoFiles.length
    });

  } catch (error) {
    console.error('List videos error:', error);
    res.status(500).json({ error: 'Failed to list videos' });
  }
});

// Delete uploaded video
router.delete('/video/:fileId', async (req, res) => {
  try {
    const { fileId } = req.params;
    const fileInfoPath = path.join('uploads', `${fileId}.json`);

    if (!await fs.pathExists(fileInfoPath)) {
      return res.status(404).json({ error: 'Video not found' });
    }

    const fileInfo = await fs.readJson(fileInfoPath);
    
    // Delete the video file
    await fs.remove(fileInfo.path);
    
    // Delete the info file
    await fs.remove(fileInfoPath);

    res.json({ message: 'Video deleted successfully' });

  } catch (error) {
    console.error('Delete video error:', error);
    res.status(500).json({ error: 'Failed to delete video' });
  }
});

module.exports = router; 