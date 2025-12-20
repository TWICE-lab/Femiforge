const express = require('express');
const router = express.Router();
const { 
  getAllPhotos, 
  getPhoto, 
  uploadPhoto, 
  updatePhoto, 
  deletePhoto,
  getPhotoStats
} = require('../controllers/photoController');
const { protect, authorize } = require('../middleware/authMiddleware');
const { uploadPhoto: uploadPhotoMiddleware } = require('../middleware/uploadMiddleware');

// Public routes
router.get('/', getAllPhotos);
router.get('/:id', getPhoto);

// Protected admin routes
router.post('/', protect, authorize('admin'), (req, res, next) => {
  uploadPhotoMiddleware(req, res, function(err) {
    if (err) {
      return res.status(400).json({
        success: false,
        message: err.message
      });
    }
    next();
  });
}, uploadPhoto);

router.put('/:id', protect, authorize('admin'), (req, res, next) => {
  uploadPhotoMiddleware(req, res, function(err) {
    if (err) {
      return res.status(400).json({
        success: false,
        message: err.message
      });
    }
    next();
  });
}, updatePhoto);

router.delete('/:id', protect, authorize('admin'), deletePhoto);
router.get('/stats/totals', protect, authorize('admin'), getPhotoStats);

module.exports = router;