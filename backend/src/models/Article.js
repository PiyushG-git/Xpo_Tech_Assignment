const mongoose = require('mongoose');

const articleSchema = new mongoose.Schema({
  url_hash: { type: String, required: true, unique: true },
  url: { type: String, required: true },
  title: { type: String, required: true },
  summary: { type: String, default: "" },
  body: { type: String, default: null },
  body_status: { type: String, default: "SUCCESS" },
  extractor: { type: String, default: null },
  source: { type: String, required: true },
  published_at: { type: Date, default: null },
  ingested_at: { type: Date, default: Date.now },
  cluster_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Cluster', default: null }
}, {
  versionKey: false
});

module.exports = mongoose.models.Article || mongoose.model('Article', articleSchema);
