'use strict';

const multer = require('multer');

const MAX_FILE_BYTES = 8 * 1024 * 1024;

/**
 * Express middleware that parses a multipart upload held in memory and turns multer failures
 * (size limit, unexpected field) into clean 4xx responses instead of unhandled errors.
 * @param {(m: import('multer').Multer) => import('express').RequestHandler} pick
 */
function handleUpload(pick, uploader = multer({ storage: multer.memoryStorage(), limits: { fileSize: MAX_FILE_BYTES, files: 1, fields: 10, parts: 11 } })) {
  const middleware = pick(uploader);
  return (req, res, next) => {
    middleware(req, res, (err) => {
      if (!err) return next();
      res.status(err.code === 'LIMIT_FILE_SIZE' ? 413 : 400).json({ error: err.message });
    });
  };
}

module.exports = { handleUpload, MAX_FILE_BYTES };
