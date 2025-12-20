const express = require('express');
const router = express.Router();
const multer = require('multer');
const { 
  getAllVideos, 
  getVideo, 
  uploadVideo, 
  updateVideo, 
  deleteVideo,
  getVideoStats
} = require('../controllers/videoController');
const { protect, authorize } = require('../middleware/authMiddleware');

// Configure multer for multiple files
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    if (file.fieldname === 'video') {
      cb(null, 'uploads/videos/');
    } else if (file.fieldname === 'thumbnail') {
      cb(null, 'uploads/thumbnails/');
    } else {
      cb(null, 'uploads/');
    }
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const extension = require('path').extname(file.originalname);
    cb(null, file.fieldname + '-' + uniqueSuffix + extension);
  }
});

const upload = multer({ 
  storage,
  limits: {
    fileSize: 100 * 1024 * 1024 // 100MB limit
  }
});

// Public routes
router.get('/', getAllVideos);
router.get('/:id', getVideo);

// Protected admin routes
router.post('/', 
  protect, 
  authorize('admin'),
  upload.fields([
    { name: 'video', maxCount: 1 },
    { name: 'thumbnail', maxCount: 1 }
  ]),
  uploadVideo
);

router.put('/:id',
  protect,
  authorize('admin'),
  upload.fields([
    { name: 'video', maxCount: 1 },
    { name: 'thumbnail', maxCount: 1 }
  ]),
  updateVideo
);

router.delete('/:id', protect, authorize('admin'), deleteVideo);
router.get('/stats/totals', protect, authorize('admin'), getVideoStats);

module.exports = router;