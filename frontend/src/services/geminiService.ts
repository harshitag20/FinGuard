/**
 * FinGuard.io - AI Disease Screening Service Bridge
 * All Gemini inference is executed securely on the server via /api/disease/screen.
 */

import { api } from './apiService';
import { DiseaseScreeningResult, PondMetrics } from '../types';

/**
 * Executes multilayer disease screening via secure backend.
 */
export const detectFishDiseaseMultilayer = async (payload: {
  speciesIds: string[];
  pondId: string;
  pondMetrics?: PondMetrics;
  imageBase64?: string;
  reportedSymptoms: string[];
  symptomHistory?: string;
}): Promise<DiseaseScreeningResult> => {
  return await api.screenFishHealth(payload);
};
