const express = require('express');
const router = express.Router();
const Photo = require('../models/Photo');
const multer = require('multer');
const path = require('path');
const jwt = require('jsonwebtoken');
const JWT_SECRET = 'your_jwt_secret'; // Use env variable in production

// JWT auth middleware
function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: 'No token provided' });
  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
}

router.use(authMiddleware);

// Set up Multer storage
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/');
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + path.extname(file.originalname));
  }
});
const upload = multer({ storage: storage });

// POST /api/photos (with file upload support)
router.post('/', upload.single('image'), async (req, res) => {
  try {
    let imageUrl = req.body.imageUrl;
    if (req.file) {
      imageUrl = `/uploads/${req.file.filename}`;
    }
    const photo = new Photo({
      title: req.body.title,
      description: req.body.description,
      imageUrl: imageUrl,
      user: req.user.userId // Associate photo with logged-in user
    });
    await photo.save();
    res.status(201).json(photo);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// GET /api/photos (only user's photos)
router.get('/', async (req, res) => {
  const photos = await Photo.find({ user: req.user.userId });
  res.json(photos);
});

// GET /api/photos/:id (only if owned by user)
router.get('/:id', async (req, res) => {
  const photo = await Photo.findOne({ _id: req.params.id, user: req.user.userId });
  if (!photo) return res.status(404).json({ error: 'Not found' });
  res.json(photo);
});

// PUT /api/photos/:id (only if owned by user, support file upload)
router.put('/:id', upload.single('image'), async (req, res) => {
  try {
    const update = {
      title: req.body.title,
      description: req.body.description,
    };
    if (req.file) {
      update.imageUrl = `/uploads/${req.file.filename}`;
    } else if (req.body.imageUrl) {
      update.imageUrl = req.body.imageUrl;
    }
    const photo = await Photo.findOneAndUpdate(
      { _id: req.params.id, user: req.user.userId },
      update,
      { new: true }
    );
    if (!photo) return res.status(404).json({ error: 'Not found' });
    res.json(photo);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// DELETE /api/photos/:id (only if owned by user)
router.delete('/:id', async (req, res) => {
  const photo = await Photo.findOneAndDelete({ _id: req.params.id, user: req.user.userId });
  if (!photo) return res.status(404).json({ error: 'Not found' });
  res.json({ message: 'Photo deleted' });
});

module.exports = router; 