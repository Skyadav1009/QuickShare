const express = require('express');
const router = express.Router();
const Container = require('../models/Container');
const { v2: cloudinary } = require('cloudinary');
const fs = require('fs');

// Hardcoded Super Admin Credentials
const ADMIN_USERNAME = 'shivam';
const ADMIN_PASSWORD = 'qwertyuiop';
const ADMIN_TOKEN = 'SUPER_SECRET_ADMIN_TOKEN_99'; // A simple static token for validation

// Middleware to check admin token
const requireAdminToken = (req, res, next) => {
    const token = req.headers['x-super-admin-token'];
    if (token !== ADMIN_TOKEN) {
        return res.status(403).json({ error: 'Unauthorized: Invalid Admin Token' });
    }
    next();
};

// POST /api/admin/login
router.post('/login', (req, res) => {
    const { username, password } = req.body;

    if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
        return res.json({ success: true, token: ADMIN_TOKEN });
    }

    return res.status(401).json({ error: 'Invalid username or password' });
});

// GET /api/admin/containers
router.get('/containers', requireAdminToken, async (req, res) => {
    try {
        // Fetch all containers, latest first
        const containers = await Container.find({}).sort({ createdAt: -1 });

        // Return summary data so payload isn't too huge
        const summaries = containers.map(c => ({
            id: c._id,
            name: c.name,
            createdAt: c.createdAt,
            fileCount: c.files.length,
            viewCount: c.currentViews,
            readOnly: c.readOnly,
            webhookUrl: c.webhookUrl || ''
        }));

        res.json(summaries);
    } catch (error) {
        console.error('Failed to fetch admin containers:', error);
        res.status(500).json({ error: 'Failed to fetch containers' });
    }
});

// DELETE /api/admin/containers/:id
router.delete('/containers/:id', requireAdminToken, async (req, res) => {
    try {
        const container = await Container.findById(req.params.id);

        if (!container) {
            return res.status(404).json({ error: 'Container not found' });
        }

        // 1. Delete all Cloudinary files connected to this container
        for (const file of container.files) {
            try {
                if (file.publicId) {
                    const resourceType = file.resourceType || 'raw';
                    await cloudinary.uploader.destroy(file.publicId, { resource_type: resourceType });
                } else if (file.path && !file.path.startsWith('http') && fs.existsSync(file.path)) {
                    fs.unlinkSync(file.path);
                }
            } catch (e) {
                console.error('Error deleting file during admin container deletion:', e);
            }
        }

        // 2. Delete the container from the database
        await Container.findByIdAndDelete(req.params.id);

        res.json({ success: true });
    } catch (error) {
        console.error('Admin delete container error:', error);
        res.status(500).json({ error: 'Failed to delete container' });
    }
});

module.exports = router;
