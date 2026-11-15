import { Request, Response } from 'express';
import { modelRoutingService } from '../services/pruneRouting.service';
import { RequestCategory } from '../../../FinGuard-PruneIntegration/typescript/dist/src/index.js';

export const aiChatController = {
  chat: async (req: Request, res: Response) => {
    try {
      const {
        prompt,
        category,
        farmId,
        containsFarmTelemetry,
        hasImages,
        hasToolCalls,
        isVoiceSession
      } = req.body;

      if (!prompt || typeof prompt !== 'string') {
        return res.status(400).json({ success: false, error: "Field 'prompt' is required." });
      }

      // Map string category to enum, default to GENERAL_TEXT
      let reqCategory = RequestCategory.GENERAL_TEXT;
      if (category === 'static_educational') {
        reqCategory = RequestCategory.STATIC_EDUCATIONAL;
      } else if (category === 'disease_diagnosis') {
        reqCategory = RequestCategory.DISEASE_DIAGNOSIS;
      } else if (category === 'farm_conversation') {
        reqCategory = RequestCategory.FARM_CONVERSATION;
      }

      const result = await modelRoutingService.executeCompletion({
        category: reqCategory,
        prompt,
        farmId,
        containsFarmTelemetry: Boolean(containsFarmTelemetry),
        hasImages: Boolean(hasImages),
        hasToolCalls: Boolean(hasToolCalls),
        isVoiceSession: Boolean(isVoiceSession)
      });

      res.json({
        success: true,
        ...result
      });
    } catch (err: any) {
      console.error('[AIChatController] Error:', err);
      res.status(500).json({ success: false, error: err.message || 'AI chat execution failed' });
    }
  }
};
