import { Request, Response } from 'express';
import { farmAgentService } from '../services/farmAgent.service';
import { storage } from '../services/storage.service';

export const farmAgentController = {
  /**
   * Relay message to farm-specific agent
   */
  sendMessage: async (req: Request, res: Response) => {
    try {
      const farmId = (Array.isArray(req.params.farmId) ? req.params.farmId[0] : req.params.farmId);
      const { message, conversation_id } = req.body;

      if (!message || typeof message !== 'string') {
        return res.status(400).json({ success: false, error: "Field 'message' is required." });
      }

      const result = await farmAgentService.sendMessage(farmId, message, conversation_id);
      res.json({ success: true, ...result });
    } catch (err: any) {
      const status = err.status || 500;
      res.status(status).json({ success: false, error: err.message || 'Agent relay failed' });
    }
  },

  /**
   * Retrieve conversation history
   */
  getHistory: async (req: Request, res: Response) => {
    try {
      const farmId = (Array.isArray(req.params.farmId) ? req.params.farmId[0] : req.params.farmId);
      const conversationId = req.query.conversation_id as string | undefined;
      const history = await farmAgentService.getConversationHistory(farmId, conversationId);
      res.json({ success: true, ...history });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message || 'Failed to retrieve conversation history' });
    }
  },

  /**
   * Create an asynchronous scientific research task
   */
  createResearch: async (req: Request, res: Response) => {
    try {
      const farmId = (Array.isArray(req.params.farmId) ? req.params.farmId[0] : req.params.farmId);
      const { question, related_diagnosis_id } = req.body;

      if (!question || typeof question !== 'string') {
        return res.status(400).json({ success: false, error: "Field 'question' is required." });
      }

      const task = await farmAgentService.createResearchTask(farmId, question, related_diagnosis_id);
      res.status(202).json({ success: true, ...task });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message || 'Failed to create research inquiry' });
    }
  },

  /**
   * Poll research task by task ID
   */
  getResearchTask: async (req: Request, res: Response) => {
    try {
      const farmId = (Array.isArray(req.params.farmId) ? req.params.farmId[0] : req.params.farmId);
      const taskId = (Array.isArray(req.params.taskId) ? req.params.taskId[0] : req.params.taskId);
      const task = await farmAgentService.getResearchTask(farmId, taskId);
      res.json({ success: true, ...task });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message || 'Failed to poll research task' });
    }
  },

  /**
   * Agent micro-VM status & health
   */
  getStatus: async (req: Request, res: Response) => {
    try {
      const farmId = (Array.isArray(req.params.farmId) ? req.params.farmId[0] : req.params.farmId);
      const status = await farmAgentService.getAgentStatus(farmId);
      res.json({ success: true, ...status });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  },

  /**
   * Authoritative Central Farm Profile (Data-provider endpoint for FarmAgent)
   */
  getCentralProfile: (req: Request, res: Response) => {
    const farmId = (Array.isArray(req.params.farmId) ? req.params.farmId[0] : req.params.farmId);
    const profile = storage.getFarmProfile(farmId);
    res.json({ success: true, profile });
  },

  /**
   * Authoritative Central Diagnostic History (Data-provider endpoint for FarmAgent)
   */
  getCentralDiagnostics: (req: Request, res: Response) => {
    const farmId = (Array.isArray(req.params.farmId) ? req.params.farmId[0] : req.params.farmId);
    const diagnostics = storage.getDiagnosticsForFarm(farmId);
    res.json({ success: true, farm_id: farmId, count: diagnostics.length, diagnostics });
  },

  /**
   * Authoritative Central Telemetry History (Data-provider endpoint for FarmAgent)
   */
  getCentralTelemetry: (req: Request, res: Response) => {
    const farmId = (Array.isArray(req.params.farmId) ? req.params.farmId[0] : req.params.farmId);
    const telemetry = storage.getTelemetry(farmId, 50);
    res.json({ success: true, farm_id: farmId, count: telemetry.length, telemetry });
  }
};
