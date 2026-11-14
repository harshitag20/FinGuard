import { describe, it, expect } from 'vitest';
import { kaggleService } from '../src/services/kaggle.service';

describe('Kaggle Dataset Integration & Evaluation Pipeline', () => {
  it('discovers documented Kaggle datasets and exposes authentic licenses and URLs', () => {
    const datasets = kaggleService.discoverDatasets();
    expect(datasets.length).toBeGreaterThanOrEqual(2);

    const shahriar = datasets.find(d => d.id === 'kaggle-fish-disease-shahriar');
    expect(shahriar).toBeDefined();
    expect(shahriar?.license).toContain('CC BY 4.0');
    expect(shahriar?.sourceUrl).toContain('kaggle.com/datasets/masumshahriar/fish-disease-dataset');
    expect(shahriar?.knownLimitations.length).toBeGreaterThan(0);
  });

  it('accurately maps Kaggle raw disease labels to canonical catalogue IDs', () => {
    // Exact mapping for gill rot
    const map1 = kaggleService.mapDatasetLabelToCanonical('Bacterial_gill_rot');
    expect(map1.canonicalId).toBe('bacterial_gill_rot');
    expect(map1.certainty).toBe('EXACT_MATCH');

    // Exact mapping for White spot
    const map2 = kaggleService.mapDatasetLabelToCanonical('Parasitic_diseases_Ich');
    expect(map2.canonicalId).toBe('white_spot_ich');
    expect(map2.certainty).toBe('EXACT_MATCH');

    // Unmapped label handling
    const map3 = kaggleService.mapDatasetLabelToCanonical('unknown_unsupported_pathology');
    expect(map3.canonicalId).toBeNull();
    expect(map3.certainty).toBe('UNMAPPED');
  });

  it('honestly returns "Not evaluated" when local data files are not yet synchronized', () => {
    const res = kaggleService.runEvaluation('kaggle-fish-disease-shahriar', false);
    expect(res.evaluated).toBe(false);
    expect(res.reason).toContain('Not evaluated');
  });
});

