const mongoose = require('mongoose');

const clusterSchema = new mongoose.Schema({
  label: { type: String, required: true },
  article_ids: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Article' }],
  article_count: { type: Number, required: true },
  earliest_at: { type: Date, default: null },
  latest_at: { type: Date, default: null },
  created_at: { type: Date, default: Date.now }
}, {
  versionKey: false
});

module.exports = mongoose.models.Cluster || mongoose.model('Cluster', clusterSchema);
