const Video = require('../models/Video');
const fs = require('fs');
const path = require('path');

// @desc    Get all videos
// @route   GET /api/videos
// @access  Public
exports.getAllVideos = async (req, res) => {
  try {
    const { category, type, featured, limit, page } = req.query;
    
    // Build query
    let query = {};
    
    if (category) {
      query.category = category;
    }
    
    if (type) {
      query.videoType = type;
    }
    
    if (featured === 'true') {
      query.featured = true;
    }
    
    // Pagination
    const pageNum = parseInt(page) || 1;
    const limitNum = parseInt(limit) || 20;
    const skip = (pageNum - 1) * limitNum;
    
    // Execute query
    const videos = await Video.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum)
      .populate('uploadedBy', 'email');
    
    const total = await Video.countDocuments(query);
    
    res.status(200).json({
      success: true,
      count: videos.length,
      total,
      pages: Math.ceil(total / limitNum),
      currentPage: pageNum,
      data: videos
    });
  } catch (error) {
    console.error('Get videos error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching videos'
    });
  }
};

// @desc    Get single video
// @route   GET /api/videos/:id
// @access  Public
exports.getVideo = async (req, res) => {
  try {
    const video = await Video.findById(req.params.id)
      .populate('uploadedBy', 'email');
    
    if (!video) {
      return res.status(404).json({
        success: false,
        message: 'Video not found'
      });
    }
    
    // Increment view count
    video.views += 1;
    await video.save();
    
    res.status(200).json({
      success: true,
      data: video
    });
  } catch (error) {
    console.error('Get video error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching video'
    });
  }
};

// @desc    Upload new video
// @route   POST /api/videos
// @access  Private/Admin
exports.uploadVideo = async (req, res) => {
  try {
    const { title, description, category, date, videoType, videoId } = req.body;
    
    // Validate required fields based on video type
    if (videoType === 'youtube' && !videoId) {
      return res.status(400).json({
        success: false,
        message: 'YouTube video ID is required for YouTube videos'
      });
    }
    
    if (videoType === 'upload' && !req.files?.video) {
      return res.status(400).json({
        success: false,
        message: 'Video file is required for uploaded videos'
      });
    }
    
    if (!req.files?.thumbnail) {
      return res.status(400).json({
        success: false,
        message: 'Thumbnail image is required'
      });
    }
    
    // Create video object
    const video = new Video({
      title,
      description,
      category,
      videoType,
      videoId: videoType === 'youtube' ? videoId : `uploaded_${Date.now()}`,
      thumbnailUrl: `/uploads/thumbnails/${req.files.thumbnail[0].filename}`,
      date: date || Date.now(),
      uploadedBy: req.user.id
    });
    
    // Handle uploaded video file
    if (videoType === 'upload' && req.files.video) {
      video.videoUrl = `/uploads/videos/${req.files.video[0].filename}`;
    }
    
    await video.save();
    
    res.status(201).json({
      success: true,
      message: 'Video uploaded successfully',
      data: video
    });
  } catch (error) {
    console.error('Upload video error:', error);
    
    // Clean up uploaded files if error occurs
    if (req.files) {
      Object.values(req.files).forEach(fileArray => {
        fileArray.forEach(file => {
          const filePath = path.join(__dirname, '..', file.path);
          if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
          }
        });
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Server error while uploading video'
    });
  }
};

// @desc    Update video
// @route   PUT /api/videos/:id
// @access  Private/Admin
exports.updateVideo = async (req, res) => {
  try {
    const { title, description, category, date, featured, videoType, videoId } = req.body;
    
    let video = await Video.findById(req.params.id);
    
    if (!video) {
      return res.status(404).json({
        success: false,
        message: 'Video not found'
      });
    }
    
    // Check if user is authorized to update
    if (video.uploadedBy.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this video'
      });
    }
    
    // Update fields
    video.title = title || video.title;
    video.description = description || video.description;
    video.category = category || video.category;
    video.date = date || video.date;
    video.featured = featured !== undefined ? featured : video.featured;
    video.videoType = videoType || video.videoType;
    video.videoId = videoId || video.videoId;
    
    // Handle new thumbnail if provided
    if (req.files?.thumbnail) {
      // Delete old thumbnail file
      if (video.thumbnailUrl && video.thumbnailUrl.startsWith('/uploads/')) {
        const oldFilePath = path.join(__dirname, '..', video.thumbnailUrl);
        if (fs.existsSync(oldFilePath)) {
          fs.unlinkSync(oldFilePath);
        }
      }
      
      video.thumbnailUrl = `/uploads/thumbnails/${req.files.thumbnail[0].filename}`;
    }
    
    // Handle new video file if provided
    if (video.videoType === 'upload' && req.files?.video) {
      // Delete old video file
      if (video.videoUrl && video.videoUrl.startsWith('/uploads/')) {
        const oldFilePath = path.join(__dirname, '..', video.videoUrl);
        if (fs.existsSync(oldFilePath)) {
          fs.unlinkSync(oldFilePath);
        }
      }
      
      video.videoUrl = `/uploads/videos/${req.files.video[0].filename}`;
    }
    
    await video.save();
    
    res.status(200).json({
      success: true,
      message: 'Video updated successfully',
      data: video
    });
  } catch (error) {
    console.error('Update video error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while updating video'
    });
  }
};

// @desc    Delete video
// @route   DELETE /api/videos/:id
// @access  Private/Admin
exports.deleteVideo = async (req, res) => {
  try {
    const video = await Video.findById(req.params.id);
    
    if (!video) {
      return res.status(404).json({
        success: false,
        message: 'Video not found'
      });
    }
    
    // Check if user is authorized to delete
    if (video.uploadedBy.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this video'
      });
    }
    
    // Delete files
    if (video.thumbnailUrl && video.thumbnailUrl.startsWith('/uploads/')) {
      const thumbnailPath = path.join(__dirname, '..', video.thumbnailUrl);
      if (fs.existsSync(thumbnailPath)) {
        fs.unlinkSync(thumbnailPath);
      }
    }
    
    if (video.videoType === 'upload' && video.videoUrl && video.videoUrl.startsWith('/uploads/')) {
      const videoPath = path.join(__dirname, '..', video.videoUrl);
      if (fs.existsSync(videoPath)) {
        fs.unlinkSync(videoPath);
      }
    }
    
    await video.deleteOne();
    
    res.status(200).json({
      success: true,
      message: 'Video deleted successfully'
    });
  } catch (error) {
    console.error('Delete video error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while deleting video'
    });
  }
};

// @desc    Get video statistics
// @route   GET /api/videos/stats
// @access  Private/Admin
exports.getVideoStats = async (req, res) => {
  try {
    const totalVideos = await Video.countDocuments();
    const totalViews = await Video.aggregate([
      { $group: { _id: null, totalViews: { $sum: '$views' } } }
    ]);
    const videosByCategory = await Video.aggregate([
      { $group: { _id: '$category', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);
    const videosByType = await Video.aggregate([
      { $group: { _id: '$videoType', count: { $sum: 1 } } }
    ]);
    const recentUploads = await Video.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .select('title category videoType views createdAt');
    
    res.status(200).json({
      success: true,
      data: {
        totalVideos,
        totalViews: totalViews[0]?.totalViews || 0,
        videosByCategory,
        videosByType,
        recentUploads
      }
    });
  } catch (error) {
    console.error('Get video stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching video statistics'
    });
  }
};