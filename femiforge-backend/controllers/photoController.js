const Photo = require('../models/Photo');
const fs = require('fs');
const path = require('path');

// @desc    Get all photos
// @route   GET /api/photos
// @access  Public
exports.getAllPhotos = async (req, res) => {
  try {
    const { category, featured, limit, page } = req.query;
    
    // Build query
    let query = {};
    
    if (category) {
      query.category = category;
    }
    
    if (featured === 'true') {
      query.featured = true;
    }
    
    // Pagination
    const pageNum = parseInt(page) || 1;
    const limitNum = parseInt(limit) || 20;
    const skip = (pageNum - 1) * limitNum;
    
    // Execute query
    const photos = await Photo.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum)
      .populate('uploadedBy', 'email');
    
    const total = await Photo.countDocuments(query);
    
    res.status(200).json({
      success: true,
      count: photos.length,
      total,
      pages: Math.ceil(total / limitNum),
      currentPage: pageNum,
      data: photos
    });
  } catch (error) {
    console.error('Get photos error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching photos'
    });
  }
};

// @desc    Get single photo
// @route   GET /api/photos/:id
// @access  Public
exports.getPhoto = async (req, res) => {
  try {
    const photo = await Photo.findById(req.params.id)
      .populate('uploadedBy', 'email');
    
    if (!photo) {
      return res.status(404).json({
        success: false,
        message: 'Photo not found'
      });
    }
    
    // Increment view count
    photo.views += 1;
    await photo.save();
    
    res.status(200).json({
      success: true,
      data: photo
    });
  } catch (error) {
    console.error('Get photo error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching photo'
    });
  }
};

// @desc    Upload new photo
// @route   POST /api/photos
// @access  Private/Admin
exports.uploadPhoto = async (req, res) => {
  try {
    const { title, description, category, date } = req.body;
    
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Please upload an image file'
      });
    }
    
    // Create photo object
    const photo = new Photo({
      title,
      description,
      category,
      imageUrl: `/uploads/photos/${req.file.filename}`,
      date: date || Date.now(),
      uploadedBy: req.user.id
    });
    
    await photo.save();
    
    res.status(201).json({
      success: true,
      message: 'Photo uploaded successfully',
      data: photo
    });
  } catch (error) {
    console.error('Upload photo error:', error);
    
    // Clean up uploaded file if error occurs
    if (req.file) {
      const filePath = path.join(__dirname, '..', req.file.path);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }
    
    res.status(500).json({
      success: false,
      message: 'Server error while uploading photo'
    });
  }
};

// @desc    Update photo
// @route   PUT /api/photos/:id
// @access  Private/Admin
exports.updatePhoto = async (req, res) => {
  try {
    const { title, description, category, date, featured } = req.body;
    
    let photo = await Photo.findById(req.params.id);
    
    if (!photo) {
      return res.status(404).json({
        success: false,
        message: 'Photo not found'
      });
    }
    
    // Check if user is authorized to update
    if (photo.uploadedBy.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this photo'
      });
    }
    
    // Update fields
    photo.title = title || photo.title;
    photo.description = description || photo.description;
    photo.category = category || photo.category;
    photo.date = date || photo.date;
    photo.featured = featured !== undefined ? featured : photo.featured;
    
    // Handle new image upload if provided
    if (req.file) {
      // Delete old image file
      if (photo.imageUrl && photo.imageUrl.startsWith('/uploads/')) {
        const oldFilePath = path.join(__dirname, '..', photo.imageUrl);
        if (fs.existsSync(oldFilePath)) {
          fs.unlinkSync(oldFilePath);
        }
      }
      
      photo.imageUrl = `/uploads/photos/${req.file.filename}`;
    }
    
    await photo.save();
    
    res.status(200).json({
      success: true,
      message: 'Photo updated successfully',
      data: photo
    });
  } catch (error) {
    console.error('Update photo error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while updating photo'
    });
  }
};

// @desc    Delete photo
// @route   DELETE /api/photos/:id
// @access  Private/Admin
exports.deletePhoto = async (req, res) => {
  try {
    const photo = await Photo.findById(req.params.id);
    
    if (!photo) {
      return res.status(404).json({
        success: false,
        message: 'Photo not found'
      });
    }
    
    // Check if user is authorized to delete
    if (photo.uploadedBy.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this photo'
      });
    }
    
    // Delete image file
    if (photo.imageUrl && photo.imageUrl.startsWith('/uploads/')) {
      const filePath = path.join(__dirname, '..', photo.imageUrl);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }
    
    await photo.deleteOne();
    
    res.status(200).json({
      success: true,
      message: 'Photo deleted successfully'
    });
  } catch (error) {
    console.error('Delete photo error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while deleting photo'
    });
  }
};

// @desc    Get photo statistics
// @route   GET /api/photos/stats
// @access  Private/Admin
exports.getPhotoStats = async (req, res) => {
  try {
    const totalPhotos = await Photo.countDocuments();
    const totalViews = await Photo.aggregate([
      { $group: { _id: null, totalViews: { $sum: '$views' } } }
    ]);
    const photosByCategory = await Photo.aggregate([
      { $group: { _id: '$category', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);
    const recentUploads = await Photo.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .select('title category views createdAt');
    
    res.status(200).json({
      success: true,
      data: {
        totalPhotos,
        totalViews: totalViews[0]?.totalViews || 0,
        photosByCategory,
        recentUploads
      }
    });
  } catch (error) {
    console.error('Get photo stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching photo statistics'
    });
  }
};