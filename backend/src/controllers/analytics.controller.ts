import { Request, Response } from 'express';
import { kaggleService } from '../services/kaggle.service';

export const analyticsController = {
  getDatasets: (req: Request, res: Response) => {
    try {
      const datasets = kaggleService.discoverDatasets();
      res.json({
        success: true,
        datasets
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message || 'Failed to scan dataset manifests' });
    }
  },

  evaluateDataset: (req: Request, res: Response) => {
    try {
      const { datasetId, runBenchmark } = req.body;
      const result = kaggleService.runEvaluation(datasetId, Boolean(runBenchmark));
      res.json({
        success: true,
        result
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message || 'Failed to run Kaggle benchmark evaluation' });
    }
  }
};
