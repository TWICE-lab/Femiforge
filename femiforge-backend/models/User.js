const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    required: true,
    minlength: 6
  },
  role: {
    type: String,
    enum: ['admin', 'viewer'],
    default: 'admin'
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  lastLogin: {
    type: Date
  }
});

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Method to compare password
userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Create admin user if not exists
userSchema.statics.createAdminIfNotExists = async function() {
  const Admin = this;
  const adminEmail = process.env.ADMIN_EMAIL;
  const adminPassword = process.env.ADMIN_PASSWORD;
  
  const adminExists = await Admin.findOne({ email: adminEmail });
  
  if (!adminExists) {
    const admin = new Admin({
      email: adminEmail,
      password: adminPassword,
      role: 'admin'
    });
    await admin.save();
    console.log('👑 Admin user created successfully');
  }
};

module.exports = mongoose.model('User', userSchema);