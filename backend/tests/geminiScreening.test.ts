import { describe, it, expect } from 'vitest';
import { geminiScreeningService, ScreeningRequest } from '../src/services/geminiScreening.service';
import { DISEASE_CATALOG } from '../../shared/diseaseCatalog';

describe('Multilayer Gemini Screening Engine', { timeout: 15000 }, () => {
  it('performs authoritative scientific screening when symptoms indicate EUS ulcers', async () => {
    const req: ScreeningRequest = {
      speciesIds: ['rohu'],
      pondId: 'POND-01',
      reportedSymptoms: ['visible_lesions', 'reduced_appetite'],
      symptomHistory: 'Monsoon temperature drop 3 days ago',
      pondMetrics: {
        temp: 21.0, // Sub-optimal cold temperature
        ph: 6.6,    // Slightly acidic
        oxygen: 5.5,
        ammonia: 0.04
      }
    };

    const res = await geminiScreeningService.performScreening(req);
    expect(res.status).toBe('screening_only');
    expect(res.candidate_diseases.length).toBeGreaterThan(0);
    
    const candidate = res.candidate_diseases.find(c => c.disease_id === 'eus');
    expect(candidate).toBeDefined();
    expect(candidate?.is_uncalibrated_estimate).toBe(true);
    expect(candidate?.supporting_evidence.length).toBeGreaterThan(0);
    expect(candidate?.additional_checks.length).toBeGreaterThan(0);

    // Water findings should link temperature drop to fungal vulnerability
    const tempFinding = res.water_quality_findings.find(w => w.parameter.includes('Temperature'));
    expect(tempFinding).toBeDefined();
    expect(tempFinding?.status).toBe('WARNING');
  });

  it('correctly reports inconclusive assessment when observations are insufficient', async () => {
    const req: ScreeningRequest = {
      speciesIds: ['rohu'],
      pondId: 'POND-01',
      reportedSymptoms: [], // No symptoms provided
      pondMetrics: {
        temp: 28.0,
        ph: 7.5,
        oxygen: 6.5,
        ammonia: 0.02
      }
    };

    const res = await geminiScreeningService.performScreening(req);
    expect(res.status).toBe('inconclusive');
    expect(res.candidate_diseases).toHaveLength(0);
    expect(res.missing_information.length).toBeGreaterThan(0);
  });

  it('does NOT force candidate confidence values to sum to 100%', async () => {
    const req: ScreeningRequest = {
      speciesIds: ['catla'],
      pondId: 'POND-01',
      reportedSymptoms: ['visible_lesions', 'fin_damage'],
      pondMetrics: { temp: 27, ph: 7.6, oxygen: 6.0, ammonia: 0.03 }
    };

    const res = await geminiScreeningService.performScreening(req);
    expect(res.candidate_diseases.length).toBeGreaterThanOrEqual(1);
    
    const sum = res.candidate_diseases.reduce((acc, c) => acc + (c.reported_confidence || 0), 0);
    // In differential diagnostics, scores are independent qualitative likelihoods, not partitioned probabilities
    expect(sum).not.toBe(1.0);
  });

  it('updates verification stage when farmer records repeat observations or expert confirmation', async () => {
    const initialReq: ScreeningRequest = {
      speciesIds: ['rohu'],
      pondId: 'POND-01',
      reportedSymptoms: ['visible_lesions'],
      pondMetrics: { temp: 24, ph: 7.0, oxygen: 4.5, ammonia: 0.03 }
    };

    const initial = await geminiScreeningService.performScreening(initialReq);
    expect(initial.verified_status).toBe('PRELIMINARY');

    // Run verification with specialist
    const verified = geminiScreeningService.verifyScreening(initial, {
      screeningId: initial.id,
      repeatDO: 6.2,
      microscopyConducted: true,
      gillClipNotes: 'Aseptate fungal hyphae confirmed on margin biopsy',
      expertConsulted: true,
      expertNameOrTitle: 'Dr. S. Nair, Fisheries Veterinarian'
    });

    expect(verified.verified_status).toBe('EXTERNALLY_CONFIRMED');
    expect(verified.verification_notes).toContain('Dr. S. Nair');
    expect(verified.verification_history).toHaveLength(1);
  });
});

