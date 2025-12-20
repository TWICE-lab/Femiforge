const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Ensure upload directories exist
const createUploadDirectories = () => {
  const directories = [
    'uploads',
    'uploads/photos',
    'uploads/videos',
    'uploads/thumbnails'
  ];

  directories.forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  });
};

createUploadDirectories();

// File filter
const fileFilter = (req, file, cb) => {
  const allowedImageTypes = /jpeg|jpg|png|gif|webp/;
  const allowedVideoTypes = /mp4|webm|ogg|mov|avi/;

  if (req.path.includes('photos')) {
    const isImage = allowedImageTypes.test(path.extname(file.originalname).toLowerCase());
    const isMimeTypeImage = allowedImageTypes.test(file.mimetype);
    
    if (isImage && isMimeTypeImage) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed (jpeg, jpg, png, gif, webp)'), false);
    }
  } else if (req.path.includes('videos')) {
    const isVideo = allowedVideoTypes.test(path.extname(file.originalname).toLowerCase());
    const isMimeTypeVideo = allowedVideoTypes.test(file.mimetype);
    
    if (isVideo && isMimeTypeVideo) {
      cb(null, true);
    } else {
      cb(new Error('Only video files are allowed (mp4, webm, ogg, mov, avi)'), false);
    }
  } else {
    cb(null, true);
  }
};

// Storage configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    if (req.path.includes('photos')) {
      cb(null, 'uploads/photos/');
    } else if (req.path.includes('videos')) {
      cb(null, 'uploads/videos/');
    } else if (req.path.includes('thumbnails')) {
      cb(null, 'uploads/thumbnails/');
    } else {
      cb(null, 'uploads/');
    }
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const extension = path.extname(file.originalname);
    cb(null, file.fieldname + '-' + uniqueSuffix + extension);
  }
});

// Multer upload instances
const uploadPhoto = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit for photos
  },
  fileFilter: fileFilter
}).single('image');

const uploadVideo = multer({
  storage: storage,
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB limit for videos
  },
  fileFilter: fileFilter
}).single('video');

const uploadThumbnail = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit for thumbnails
  },
  fileFilter: fileFilter
}).single('thumbnail');

module.exports = {
  uploadPhoto,
  uploadVideo,
  uploadThumbnail
};