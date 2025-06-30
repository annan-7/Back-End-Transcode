const ffmpeg = require('fluent-ffmpeg');
const path = require('path');
const fs = require('fs-extra');
const { v4: uuidv4 } = require('uuid');

// Quality configurations
const QUALITY_CONFIGS = {
  '320p': {
    width: 568,
    height: 320,
    bitrate: '500k',
    audioBitrate: '64k'
  },
  '480p': {
    width: 854,
    height: 480,
    bitrate: '1000k',
    audioBitrate: '96k'
  },
  '720p': {
    width: 1280,
    height: 720,
    bitrate: '2500k',
    audioBitrate: '128k'
  },
  '1080p': {
    width: 1920,
    height: 1080,
    bitrate: '5000k',
    audioBitrate: '192k'
  }
};

class Transcoder {
  constructor() {
    this.activeJobs = new Map();
  }

  async transcodeVideo(inputPath, outputDir, qualities = ['320p', '480p', '720p', '1080p']) {
    const jobId = uuidv4();
    const jobInfo = {
      id: jobId,
      status: 'processing',
      progress: 0,
      qualities: qualities,
      outputDir: outputDir,
      startTime: new Date().toISOString(),
      segments: {},
      errors: []
    };

    this.activeJobs.set(jobId, jobInfo);

    try {
      // Create output directory
      await fs.ensureDir(outputDir);

      // Get video info
      const videoInfo = await this.getVideoInfo(inputPath);
      jobInfo.videoInfo = videoInfo;

      // Transcode each quality
      const transcodePromises = qualities.map(quality => 
        this.transcodeQuality(inputPath, outputDir, quality, jobId)
      );

      await Promise.all(transcodePromises);

      // Create master playlist
      await this.createMasterPlaylist(outputDir, qualities, jobId);

      jobInfo.status = 'completed';
      jobInfo.endTime = new Date().toISOString();
      jobInfo.progress = 100;

    } catch (error) {
      jobInfo.status = 'failed';
      jobInfo.error = error.message;
      jobInfo.endTime = new Date().toISOString();
      throw error;
    }

    return jobId;
  }

  async getVideoInfo(inputPath) {
    return new Promise((resolve, reject) => {
      ffmpeg.ffprobe(inputPath, (err, metadata) => {
        if (err) {
          reject(err);
          return;
        }

        const videoStream = metadata.streams.find(stream => stream.codec_type === 'video');
        const audioStream = metadata.streams.find(stream => stream.codec_type === 'audio');

        resolve({
          duration: metadata.format.duration,
          size: metadata.format.size,
          bitrate: metadata.format.bit_rate,
          video: videoStream ? {
            width: videoStream.width,
            height: videoStream.height,
            codec: videoStream.codec_name,
            bitrate: videoStream.bit_rate
          } : null,
          audio: audioStream ? {
            codec: audioStream.codec_name,
            bitrate: audioStream.bit_rate,
            channels: audioStream.channels
          } : null
        });
      });
    });
  }

  async transcodeQuality(inputPath, outputDir, quality, jobId) {
    const config = QUALITY_CONFIGS[quality];
    const qualityDir = path.join(outputDir, quality);
    const playlistPath = path.join(qualityDir, 'playlist.m3u8');
    const segmentPattern = path.join(qualityDir, 'segment_%03d.ts');

    await fs.ensureDir(qualityDir);

    return new Promise((resolve, reject) => {
      const jobInfo = this.activeJobs.get(jobId);
      
      ffmpeg(inputPath)
        .outputOptions([
          '-c:v libx264',
          '-c:a aac',
          '-b:v ' + config.bitrate,
          '-b:a ' + config.audioBitrate,
          '-vf scale=' + config.width + ':' + config.height,
          '-preset fast',
          '-crf 23',
          '-f hls',
          '-hls_time 10',
          '-hls_list_size 0',
          '-hls_segment_filename ' + segmentPattern,
          '-hls_flags independent_segments'
        ])
        .output(playlistPath)
        .on('start', (commandLine) => {
          console.log(`Started transcoding ${quality}: ${commandLine}`);
          jobInfo.segments[quality] = { status: 'processing', progress: 0 };
        })
        .on('progress', (progress) => {
          if (jobInfo.segments[quality]) {
            jobInfo.segments[quality].progress = Math.round(progress.percent || 0);
            jobInfo.progress = this.calculateOverallProgress(jobInfo);
          }
        })
        .on('end', () => {
          console.log(`Completed transcoding ${quality}`);
          jobInfo.segments[quality] = { status: 'completed', progress: 100 };
          resolve();
        })
        .on('error', (err) => {
          console.error(`Error transcoding ${quality}:`, err);
          jobInfo.segments[quality] = { status: 'failed', error: err.message };
          jobInfo.errors.push({ quality, error: err.message });
          reject(err);
        })
        .run();
    });
  }

  async createMasterPlaylist(outputDir, qualities, jobId) {
    const masterPlaylistPath = path.join(outputDir, 'master.m3u8');
    let playlistContent = '#EXTM3U\n#EXT-X-VERSION:3\n\n';

    qualities.forEach(quality => {
      const config = QUALITY_CONFIGS[quality];
      const bandwidth = parseInt(config.bitrate) * 1000; // Convert to bits
      
      playlistContent += `#EXT-X-STREAM-INF:BANDWIDTH=${bandwidth},RESOLUTION=${config.width}x${config.height}\n`;
      playlistContent += `${quality}/playlist.m3u8\n`;
    });

    await fs.writeFile(masterPlaylistPath, playlistContent);
    console.log('Master playlist created:', masterPlaylistPath);
  }

  calculateOverallProgress(jobInfo) {
    const segments = Object.values(jobInfo.segments);
    if (segments.length === 0) return 0;
    
    const totalProgress = segments.reduce((sum, segment) => sum + segment.progress, 0);
    return Math.round(totalProgress / segments.length);
  }

  getJobStatus(jobId) {
    return this.activeJobs.get(jobId) || null;
  }

  getAllJobs() {
    return Array.from(this.activeJobs.values());
  }

  cleanupJob(jobId) {
    this.activeJobs.delete(jobId);
  }

  // Cleanup old completed jobs (older than 24 hours)
  cleanupOldJobs() {
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    for (const [jobId, jobInfo] of this.activeJobs.entries()) {
      if (jobInfo.status === 'completed' && new Date(jobInfo.endTime) < oneDayAgo) {
        this.activeJobs.delete(jobId);
      }
    }
  }
}

// Create singleton instance
const transcoder = new Transcoder();

// Cleanup old jobs every hour
setInterval(() => {
  transcoder.cleanupOldJobs();
}, 60 * 60 * 1000);

module.exports = transcoder; 