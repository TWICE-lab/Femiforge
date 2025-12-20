const mongoose = require('mongoose');

const videoSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Video title is required'],
    trim: true,
    maxlength: [200, 'Title cannot exceed 200 characters']
  },
  description: {
    type: String,
    required: [true, 'Video description is required'],
    trim: true,
    maxlength: [1000, 'Description cannot exceed 1000 characters']
  },
  category: {
    type: String,
    required: [true, 'Category is required'],
    enum: ['workshops', 'events', 'community', 'success', 'training'],
    lowercase: true
  },
  videoType: {
    type: String,
    required: true,
    enum: ['youtube', 'upload'],
    default: 'youtube'
  },
  videoId: {
    type: String,
    required: [true, 'Video ID is required']
  },
  thumbnailUrl: {
    type: String,
    required: [true, 'Thumbnail URL is required']
  },
  thumbnailPublicId: {
    type: String,
    default: null
  },
  date: {
    type: Date,
    required: [true, 'Date is required'],
    default: Date.now
  },
  uploadedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  views: {
    type: Number,
    default: 0
  },
  duration: {
    type: Number, // in seconds
    default: 0
  },
  featured: {
    type: Boolean,
    default: false
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Update updatedAt on save
videoSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Virtual for YouTube embed URL
videoSchema.virtual('youtubeEmbedUrl').get(function() {
  if (this.videoType === 'youtube') {
    return `https://www.youtube.com/embed/${this.videoId}`;
  }
  return null;
});

module.exports = mongoose.model('Video', videoSchema);