const Cluster = require('../models/Cluster');
require('../models/Article');

exports.getClusters = async (req, res) => {
  try {
    const clusters = await Cluster.find()
      .sort({ earliest_at: -1 })
      .select('_id label article_count earliest_at latest_at');
    
    const formatted = clusters.map(c => ({
      id: c._id,
      label: c.label,
      articleCount: c.article_count,
      startTime: c.earliest_at,
      endTime: c.latest_at
    }));
    
    res.json(formatted);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};

exports.getClusterById = async (req, res) => {
  try {
    const cluster = await Cluster.findById(req.params.id)
      .populate({
        path: 'article_ids',
        options: { sort: { published_at: 1 } }
      });
      
    if (!cluster) {
      return res.status(404).json({ message: 'Cluster not found' });
    }
    
    res.json({
      id: cluster._id,
      label: cluster.label,
      articles: cluster.article_ids
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};

exports.getTimeline = async (req, res) => {
  try {
    const clusters = await Cluster.find({ earliest_at: { $ne: null } })
      .select('_id label earliest_at latest_at article_count');
      
    const formatted = clusters.map(c => ({
      id: c._id,
      label: c.label,
      start: c.earliest_at,
      end: c.latest_at,
      articleCount: c.article_count,
      intensity: c.article_count
    }));
    
    res.json(formatted);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};
