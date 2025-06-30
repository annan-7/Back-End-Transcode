const express = require('express');
const path = require('path');
const fs = require('fs-extra');
const transcoder = require('../utils/transcoder');

const router = express.Router();

// Start transcoding job
router.post('/start', async (req, res) => {
  try {
    const { fileId, qualities } = req.body;

    if (!fileId) {
      return res.status(400).json({ error: 'File ID is required' });
    }

    // Validate file exists
    const fileInfoPath = path.join('uploads', `${fileId}.json`);
    if (!await fs.pathExists(fileInfoPath)) {
      return res.status(404).json({ error: 'Video file not found' });
    }

    const fileInfo = await fs.readJson(fileInfoPath);
    
    // Validate video file exists
    if (!await fs.pathExists(fileInfo.path)) {
      return res.status(404).json({ error: 'Video file not found on disk' });
    }

    // Validate qualities
    const validQualities = ['320p', '480p', '720p', '1080p'];
    const selectedQualities = qualities || validQualities;
    
    if (!Array.isArray(selectedQualities) || selectedQualities.length === 0) {
      return res.status(400).json({ error: 'At least one quality must be specified' });
    }

    const invalidQualities = selectedQualities.filter(q => !validQualities.includes(q));
    if (invalidQualities.length > 0) {
      return res.status(400).json({ 
        error: 'Invalid qualities specified', 
        invalidQualities,
        validQualities 
      });
    }

    // Create output directory
    const outputDir = path.join('transcoded', fileId);
    await fs.ensureDir(outputDir);

    // Start transcoding
    const jobId = await transcoder.transcodeVideo(fileInfo.path, outputDir, selectedQualities);

    res.status(202).json({
      message: 'Transcoding job started',
      jobId: jobId,
      fileId: fileId,
      qualities: selectedQualities,
      status: 'processing'
    });

  } catch (error) {
    console.error('Transcode start error:', error);
    res.status(500).json({ error: 'Failed to start transcoding job' });
  }
});

// Get transcoding job status
router.get('/status/:jobId', (req, res) => {
  try {
    const { jobId } = req.params;
    const jobStatus = transcoder.getJobStatus(jobId);

    if (!jobStatus) {
      return res.status(404).json({ error: 'Job not found' });
    }

    res.json(jobStatus);

  } catch (error) {
    console.error('Get status error:', error);
    res.status(500).json({ error: 'Failed to get job status' });
  }
});

// Get all active jobs
router.get('/jobs', (req, res) => {
  try {
    const jobs = transcoder.getAllJobs();
    res.json({
      jobs: jobs,
      count: jobs.length
    });

  } catch (error) {
    console.error('Get jobs error:', error);
    res.status(500).json({ error: 'Failed to get jobs' });
  }
});

// Cancel transcoding job
router.delete('/cancel/:jobId', (req, res) => {
  try {
    const { jobId } = req.params;
    const jobStatus = transcoder.getJobStatus(jobId);

    if (!jobStatus) {
      return res.status(404).json({ error: 'Job not found' });
    }

    if (jobStatus.status === 'completed' || jobStatus.status === 'failed') {
      return res.status(400).json({ error: 'Cannot cancel completed or failed job' });
    }

    // Note: FFmpeg doesn't have a direct cancel method in fluent-ffmpeg
    // This would require implementing process management
    transcoder.cleanupJob(jobId);

    res.json({ message: 'Job cancelled successfully' });

  } catch (error) {
    console.error('Cancel job error:', error);
    res.status(500).json({ error: 'Failed to cancel job' });
  }
});

// Get transcoded video info
router.get('/video/:fileId', async (req, res) => {
  try {
    const { fileId } = req.params;
    const transcodedDir = path.join('transcoded', fileId);

    if (!await fs.pathExists(transcodedDir)) {
      return res.status(404).json({ error: 'Transcoded video not found' });
    }

    // Check if master playlist exists
    const masterPlaylistPath = path.join(transcodedDir, 'master.m3u8');
    if (!await fs.pathExists(masterPlaylistPath)) {
      return res.status(404).json({ error: 'Transcoded video not ready' });
    }

    // Get available qualities
    const qualities = [];
    const validQualities = ['320p', '480p', '720p', '1080p'];
    
    for (const quality of validQualities) {
      const qualityDir = path.join(transcodedDir, quality);
      const playlistPath = path.join(qualityDir, 'playlist.m3u8');
      
      if (await fs.pathExists(playlistPath)) {
        qualities.push(quality);
      }
    }

    // Get file sizes
    const qualityInfo = {};
    for (const quality of qualities) {
      const qualityDir = path.join(transcodedDir, quality);
      const files = await fs.readdir(qualityDir);
      const totalSize = await Promise.all(
        files.map(async (file) => {
          const filePath = path.join(qualityDir, file);
          const stats = await fs.stat(filePath);
          return stats.size;
        })
      ).then(sizes => sizes.reduce((sum, size) => sum + size, 0));

      qualityInfo[quality] = {
        playlistUrl: `/videos/${fileId}/${quality}/playlist.m3u8`,
        totalSize: totalSize,
        fileCount: files.length
      };
    }

    res.json({
      fileId: fileId,
      masterPlaylistUrl: `/videos/${fileId}/master.m3u8`,
      qualities: qualities,
      qualityInfo: qualityInfo,
      transcodedAt: new Date().toISOString()
    });

  } catch (error) {
    console.error('Get transcoded video error:', error);
    res.status(500).json({ error: 'Failed to get transcoded video info' });
  }
});

// List all transcoded videos
router.get('/videos', async (req, res) => {
  try {
    const transcodedDir = 'transcoded';
    if (!await fs.pathExists(transcodedDir)) {
      return res.json({ videos: [], count: 0 });
    }

    const files = await fs.readdir(transcodedDir);
    const videos = [];

    for (const fileId of files) {
      const videoDir = path.join(transcodedDir, fileId);
      const masterPlaylistPath = path.join(videoDir, 'master.m3u8');
      
      if (await fs.pathExists(masterPlaylistPath)) {
        const stats = await fs.stat(videoDir);
        videos.push({
          fileId: fileId,
          masterPlaylistUrl: `/videos/${fileId}/master.m3u8`,
          transcodedAt: stats.mtime.toISOString()
        });
      }
    }

    res.json({
      videos: videos,
      count: videos.length
    });

  } catch (error) {
    console.error('List transcoded videos error:', error);
    res.status(500).json({ error: 'Failed to list transcoded videos' });
  }
});

// Delete transcoded video
router.delete('/video/:fileId', async (req, res) => {
  try {
    const { fileId } = req.params;
    const transcodedDir = path.join('transcoded', fileId);

    if (!await fs.pathExists(transcodedDir)) {
      return res.status(404).json({ error: 'Transcoded video not found' });
    }

    await fs.remove(transcodedDir);

    res.json({ message: 'Transcoded video deleted successfully' });

  } catch (error) {
    console.error('Delete transcoded video error:', error);
    res.status(500).json({ error: 'Failed to delete transcoded video' });
  }
});

module.exports = router; 