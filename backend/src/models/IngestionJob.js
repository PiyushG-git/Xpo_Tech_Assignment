const mongoose = require('mongoose');

const ingestionJobSchema = new mongoose.Schema({
  started_at: { type: Date, required: true },
  ended_at: { type: Date },
  articles_inserted: { type: Number, default: 0 },
  duplicates: { type: Number, default: 0 },
  failed: { type: Number, default: 0 },
  status: { type: String, enum: ['running', 'completed', 'failed'], default: 'running' }
}, {
  versionKey: false
});

module.exports = mongoose.models.IngestionJob || mongoose.model('IngestionJob', ingestionJobSchema, 'ingestion_jobs');
