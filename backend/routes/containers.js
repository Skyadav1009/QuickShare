const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const Container = require('../models/Container');

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '..', 'uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + '-' + file.originalname);
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE) || 50 * 1024 * 1024 // 50MB default
  }
});

// Create a new container
router.post('/', async (req, res) => {
  try {
    const { name, password } = req.body;

    if (!name || !password) {
      return res.status(400).json({ error: 'Name and password are required' });
    }

    // Check if container name already exists (case-insensitive)
    const existing = await Container.findOne({ 
      name: { $regex: new RegExp(`^${name}$`, 'i') } 
    });
    
    if (existing) {
      return res.status(409).json({ error: 'Container name already exists. Please choose another.' });
    }

    const container = new Container({
      name,
      passwordHash: password // Will be hashed by pre-save middleware
    });

    await container.save();
    res.status(201).json(container.toSafeObject());
  } catch (error) {
    console.error('Create container error:', error);
    res.status(500).json({ error: 'Failed to create container' });
  }
});

// Get all recent containers (for homepage listing)
router.get('/recent', async (req, res) => {
  try {
    const containers = await Container.find({})
      .sort({ createdAt: -1 })
      .limit(50);

    res.json(containers.map(c => c.toSummary()));
  } catch (error) {
    console.error('Get recent containers error:', error);
    res.status(500).json({ error: 'Failed to get containers' });
  }
});

// Search containers by name
router.get('/search', async (req, res) => {
  try {
    const { q } = req.query;
    
    if (!q || q.trim().length === 0) {
      return res.json([]);
    }

    const containers = await Container.find({
      name: { $regex: q, $options: 'i' }
    })
    .sort({ createdAt: -1 })
    .limit(20);

    res.json(containers.map(c => c.toSummary()));
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({ error: 'Search failed' });
  }
});

// Verify password for a container
router.post('/:id/verify', async (req, res) => {
  try {
    const { password } = req.body;
    const container = await Container.findById(req.params.id);

    if (!container) {
      return res.status(404).json({ error: 'Container not found' });
    }

    const isValid = await container.verifyPassword(password);
    
    if (!isValid) {
      return res.status(401).json({ error: 'Incorrect password' });
    }

    // Update last accessed
    container.lastAccessed = new Date();
    await container.save();

    res.json(container.toSafeObject());
  } catch (error) {
    console.error('Verify error:', error);
    res.status(500).json({ error: 'Verification failed' });
  }
});

// Get container by ID (requires password in header for security)
router.get('/:id', async (req, res) => {
  try {
    const container = await Container.findById(req.params.id);

    if (!container) {
      return res.status(404).json({ error: 'Container not found' });
    }

    res.json(container.toSafeObject());
  } catch (error) {
    console.error('Get container error:', error);
    res.status(500).json({ error: 'Failed to get container' });
  }
});

// Update text content
router.put('/:id/text', async (req, res) => {
  try {
    const { text } = req.body;
    const container = await Container.findById(req.params.id);

    if (!container) {
      return res.status(404).json({ error: 'Container not found' });
    }

    container.textContent = text || '';
    container.lastAccessed = new Date();
    await container.save();

    res.json({ success: true });
  } catch (error) {
    console.error('Update text error:', error);
    res.status(500).json({ error: 'Failed to update text' });
  }
});

// Upload file to container
router.post('/:id/files', upload.single('file'), async (req, res) => {
  try {
    const container = await Container.findById(req.params.id);

    if (!container) {
      // Delete uploaded file if container not found
      if (req.file) {
        fs.unlinkSync(req.file.path);
      }
      return res.status(404).json({ error: 'Container not found' });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const fileData = {
      filename: req.file.filename,
      originalName: req.file.originalname,
      mimetype: req.file.mimetype,
      size: req.file.size,
      path: req.file.path
    };

    container.files.push(fileData);
    container.lastAccessed = new Date();
    await container.save();

    const addedFile = container.files[container.files.length - 1];
    
    res.status(201).json({
      id: addedFile._id,
      name: addedFile.originalName,
      type: addedFile.mimetype,
      size: addedFile.size,
      createdAt: addedFile.createdAt
    });
  } catch (error) {
    console.error('File upload error:', error);
    if (req.file) {
      fs.unlinkSync(req.file.path);
    }
    res.status(500).json({ error: 'Failed to upload file' });
  }
});

// Download file from container
router.get('/:id/files/:fileId/download', async (req, res) => {
  try {
    const container = await Container.findById(req.params.id);

    if (!container) {
      return res.status(404).json({ error: 'Container not found' });
    }

    const file = container.files.id(req.params.fileId);
    
    if (!file) {
      return res.status(404).json({ error: 'File not found' });
    }

    if (!fs.existsSync(file.path)) {
      return res.status(404).json({ error: 'File not found on disk' });
    }

    res.download(file.path, file.originalName);
  } catch (error) {
    console.error('Download error:', error);
    res.status(500).json({ error: 'Failed to download file' });
  }
});

// Delete file from container
router.delete('/:id/files/:fileId', async (req, res) => {
  try {
    const container = await Container.findById(req.params.id);

    if (!container) {
      return res.status(404).json({ error: 'Container not found' });
    }

    const file = container.files.id(req.params.fileId);
    
    if (!file) {
      return res.status(404).json({ error: 'File not found' });
    }

    // Delete file from disk
    if (fs.existsSync(file.path)) {
      fs.unlinkSync(file.path);
    }

    // Remove from container
    container.files.pull(req.params.fileId);
    container.lastAccessed = new Date();
    await container.save();

    res.json({ success: true });
  } catch (error) {
    console.error('Delete file error:', error);
    res.status(500).json({ error: 'Failed to delete file' });
  }
});

module.exports = router;
