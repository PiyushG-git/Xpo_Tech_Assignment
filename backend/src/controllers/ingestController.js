const { spawn } = require('child_process');
const path = require('path');
const IngestionJob = require('../models/IngestionJob');

exports.triggerIngestion = async (req, res) => {
  try {
    const job = new IngestionJob({
      started_at: new Date(),
      status: 'running'
    });
    await job.save();

    const scriptPath = process.env.PYTHON_SCRIPT_PATH || path.resolve(__dirname, '../../../scraper/pipeline.py');
    
    // We do not await this spawn so the API returns immediately
    const pythonProcess = spawn('python', [scriptPath, job._id.toString()], {
      env: { ...process.env, PYTHONIOENCODING: 'utf-8' }
    });

    pythonProcess.stdout.on('data', (data) => {
      console.log(`[Python] ${data.toString().trim()}`);
    });

    pythonProcess.stderr.on('data', (data) => {
      console.error(`[Python Error] ${data.toString().trim()}`);
    });

    pythonProcess.on('close', (code) => {
      console.log(`Python process exited with code ${code}`);
    });

    res.status(201).json({ jobId: job._id });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};

exports.getJobStatus = async (req, res) => {
  try {
    const job = await IngestionJob.findById(req.params.jobId);
    if (!job) {
      return res.status(404).json({ message: 'Job not found' });
    }
    
    res.json({ status: job.status });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};
