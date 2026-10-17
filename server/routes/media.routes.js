'use strict';

const router = require('express').Router();
const { proxyToApi } = require('../shared/proxy');
const { handleUpload } = require('../shared/upload');

// profile image upload: multipart parsed by multer, re-sent to mercury as multipart
router.post('/users/profile', handleUpload((m) => m.single('imageData')), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file provided' });
  const form = new FormData();
  form.append(req.file.fieldname, new Blob([req.file.buffer], { type: req.file.mimetype }), req.file.originalname);
  return proxyToApi(req, res, 'mercury', '/profile/image', { body: form });
});

module.exports = router;
