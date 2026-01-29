const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const fileSchema = new mongoose.Schema({
  filename: { type: String, required: true },
  originalName: { type: String, required: true },
  mimetype: { type: String, required: true },
  size: { type: Number, required: true },
  path: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});

const messageSchema = new mongoose.Schema({
  sender: { 
    type: String, 
    enum: ['owner', 'visitor'], 
    required: true 
  },
  text: { type: String, default: '' },
  imageUrl: { type: String, default: '' }, // For image messages
  createdAt: { type: Date, default: Date.now }
});

const containerSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    index: true
  },
  passwordHash: {
    type: String,
    required: true
  },
  textContent: {
    type: String,
    default: ''
  },
  files: [fileSchema],
  messages: [messageSchema],
  maxViews: {
    type: Number,
    default: 0 // 0 means unlimited views
  },
  currentViews: {
    type: Number,
    default: 0
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  lastAccessed: {
    type: Date,
    default: Date.now
  }
});

// Hash password before saving
containerSchema.pre('save', async function(next) {
  // Only hash if password is modified (new container)
  if (!this.isModified('passwordHash')) return next();
  
  try {
    const salt = await bcrypt.genSalt(10);
    this.passwordHash = await bcrypt.hash(this.passwordHash, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Method to verify password
containerSchema.methods.verifyPassword = async function(password) {
  return bcrypt.compare(password, this.passwordHash);
};

// Method to return safe container data (without password)
containerSchema.methods.toSafeObject = function() {
  return {
    id: this._id,
    name: this.name,
    textContent: this.textContent,
    files: this.files.map(f => ({
      id: f._id,
      name: f.originalName,
      type: f.mimetype,
      size: f.size,
      createdAt: f.createdAt
    })),
    messages: this.messages.map(m => ({
      id: m._id,
      sender: m.sender,
      text: m.text,
      imageUrl: m.imageUrl,
      createdAt: m.createdAt
    })),
    maxViews: this.maxViews,
    currentViews: this.currentViews,
    createdAt: this.createdAt,
    lastAccessed: this.lastAccessed
  };
};

// Static method to get summary (for search results)
containerSchema.methods.toSummary = function() {
  return {
    id: this._id,
    name: this.name,
    fileCount: this.files.length,
    hasText: !!this.textContent,
    maxViews: this.maxViews,
    currentViews: this.currentViews,
    createdAt: this.createdAt
  };
};

module.exports = mongoose.model('Container', containerSchema);
