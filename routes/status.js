const express = require('express');
const fs = require('fs-extra');
const path = require('path');
const transcoder = require('../utils/transcoder');

const router = express.Router();

// Get overall system status
router.get('/system', async (req, res) => {
  try {
    const uploadsDir = 'uploads';
    const transcodedDir = 'transcoded';
    
    // Get upload directory stats
    let uploadStats = { exists: false, fileCount: 0, totalSize: 0 };
    if (await fs.pathExists(uploadsDir)) {
      const files = await fs.readdir(uploadsDir);
      const videoFiles = files.filter(file => !file.endsWith('.json'));
      const totalSize = await Promise.all(
        videoFiles.map(async (file) => {
          const filePath = path.join(uploadsDir, file);
          const stats = await fs.stat(filePath);
          return stats.size;
        })
      ).then(sizes => sizes.reduce((sum, size) => sum + size, 0));
      
      uploadStats = {
        exists: true,
        fileCount: videoFiles.length,
        totalSize: totalSize
      };
    }

    // Get transcoded directory stats
    let transcodedStats = { exists: false, videoCount: 0, totalSize: 0 };
    if (await fs.pathExists(transcodedDir)) {
      const files = await fs.readdir(transcodedDir);
      const videoDirs = [];
      
      for (const file of files) {
        const videoDir = path.join(transcodedDir, file);
        const stats = await fs.stat(videoDir);
        if (stats.isDirectory()) {
          const masterPlaylistPath = path.join(videoDir, 'master.m3u8');
          if (await fs.pathExists(masterPlaylistPath)) {
            videoDirs.push(file);
          }
        }
      }

      const totalSize = await Promise.all(
        videoDirs.map(async (fileId) => {
          const videoDir = path.join(transcodedDir, fileId);
          const files = await fs.readdir(videoDir);
          const fileSizes = await Promise.all(
            files.map(async (file) => {
              const filePath = path.join(videoDir, file);
              const stats = await fs.stat(filePath);
              return stats.isFile() ? stats.size : 0;
            })
          );
          return fileSizes.reduce((sum, size) => sum + size, 0);
        })
      ).then(sizes => sizes.reduce((sum, size) => sum + size, 0));

      transcodedStats = {
        exists: true,
        videoCount: videoDirs.length,
        totalSize: totalSize
      };
    }

    // Get active jobs
    const activeJobs = transcoder.getAllJobs();
    const processingJobs = activeJobs.filter(job => job.status === 'processing');
    const completedJobs = activeJobs.filter(job => job.status === 'completed');
    const failedJobs = activeJobs.filter(job => job.status === 'failed');

    res.json({
      system: {
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        platform: process.platform,
        nodeVersion: process.version
      },
      storage: {
        uploads: uploadStats,
        transcoded: transcodedStats
      },
      jobs: {
        active: activeJobs.length,
        processing: processingJobs.length,
        completed: completedJobs.length,
        failed: failedJobs.length
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('System status error:', error);
    res.status(500).json({ error: 'Failed to get system status' });
  }
});

// Get storage usage
router.get('/storage', async (req, res) => {
  try {
    const uploadsDir = 'uploads';
    const transcodedDir = 'transcoded';
    
    const storageInfo = {};

    // Upload directory details
    if (await fs.pathExists(uploadsDir)) {
      const files = await fs.readdir(uploadsDir);
      const videoFiles = files.filter(file => !file.endsWith('.json'));
      
      const uploadDetails = await Promise.all(
        videoFiles.map(async (file) => {
          const filePath = path.join(uploadsDir, file);
          const stats = await fs.stat(filePath);
          const infoPath = path.join(uploadsDir, `${path.parse(file).name}.json`);
          
          let originalName = file;
          if (await fs.pathExists(infoPath)) {
            const info = await fs.readJson(infoPath);
            originalName = info.originalName;
          }

          return {
            filename: file,
            originalName: originalName,
            size: stats.size,
            modified: stats.mtime.toISOString()
          };
        })
      );

      storageInfo.uploads = {
        count: videoFiles.length,
        files: uploadDetails,
        totalSize: uploadDetails.reduce((sum, file) => sum + file.size, 0)
      };
    } else {
      storageInfo.uploads = { count: 0, files: [], totalSize: 0 };
    }

    // Transcoded directory details
    if (await fs.pathExists(transcodedDir)) {
      const files = await fs.readdir(transcodedDir);
      const videoDirs = [];
      
      for (const file of files) {
        const videoDir = path.join(transcodedDir, file);
        const stats = await fs.stat(videoDir);
        if (stats.isDirectory()) {
          const masterPlaylistPath = path.join(videoDir, 'master.m3u8');
          if (await fs.pathExists(masterPlaylistPath)) {
            const qualityDirs = await fs.readdir(videoDir);
            const qualities = qualityDirs.filter(dir => 
              ['320p', '480p', '720p', '1080p'].includes(dir)
            );
            
            videoDirs.push({
              fileId: file,
              qualities: qualities,
              modified: stats.mtime.toISOString()
            });
          }
        }
      }

      storageInfo.transcoded = {
        count: videoDirs.length,
        videos: videoDirs
      };
    } else {
      storageInfo.transcoded = { count: 0, videos: [] };
    }

    res.json(storageInfo);

  } catch (error) {
    console.error('Storage status error:', error);
    res.status(500).json({ error: 'Failed to get storage status' });
  }
});

// Get job statistics
router.get('/jobs/stats', (req, res) => {
  try {
    const jobs = transcoder.getAllJobs();
    
    const stats = {
      total: jobs.length,
      byStatus: {
        processing: jobs.filter(job => job.status === 'processing').length,
        completed: jobs.filter(job => job.status === 'completed').length,
        failed: jobs.filter(job => job.status === 'failed').length
      },
      byQuality: {
        '320p': 0,
        '480p': 0,
        '720p': 0,
        '1080p': 0
      },
      averageDuration: 0
    };

    // Calculate quality usage
    jobs.forEach(job => {
      if (job.qualities) {
        job.qualities.forEach(quality => {
          if (stats.byQuality[quality] !== undefined) {
            stats.byQuality[quality]++;
          }
        });
      }
    });

    // Calculate average duration for completed jobs
    const completedJobs = jobs.filter(job => job.status === 'completed' && job.startTime && job.endTime);
    if (completedJobs.length > 0) {
      const totalDuration = completedJobs.reduce((sum, job) => {
        const start = new Date(job.startTime);
        const end = new Date(job.endTime);
        return sum + (end - start);
      }, 0);
      stats.averageDuration = totalDuration / completedJobs.length;
    }

    res.json(stats);

  } catch (error) {
    console.error('Job stats error:', error);
    res.status(500).json({ error: 'Failed to get job statistics' });
  }
});

module.exports = router; 