import { describe, it, expect } from 'vitest';
import { computeRangeOverlap, evaluateMultiSpeciesCompatibility } from '../../shared/overlapEngine';
import { SPECIES_CATALOG, SpeciesProfile } from '../../shared/speciesCatalog';

describe('Multi-Species Range Overlap Engine', () => {
  it('correctly calculates intersection [max(L), min(U)] for Indian Major Carps (Rohu, Catla, Mrigal)', () => {
    const imc = [SPECIES_CATALOG.rohu, SPECIES_CATALOG.catla, SPECIES_CATALOG.mrigal];
    
    // Oxygen: Rohu [5, 9], Catla [5, 9], Mrigal [5, 8.5] -> Common Lower = 5, Common Upper = 8.5
    const oxygenOverlap = computeRangeOverlap(imc, 'oxygen');
    expect(oxygenOverlap).not.toBeNull();
    expect(oxygenOverlap?.hasOverlap).toBe(true);
    expect(oxygenOverlap?.commonOptimal).toEqual([5, 8.5]);

    // Temp: Rohu [26, 32], Catla [25, 32], Mrigal [26, 32] -> max(26, 25, 26)=26, min(32, 32, 32)=32
    const tempOverlap = computeRangeOverlap(imc, 'temp');
    expect(tempOverlap?.hasOverlap).toBe(true);
    expect(tempOverlap?.commonOptimal).toEqual([26, 32]);
  });

  it('detects incompatible intervals when common lower bound > common upper bound', () => {
    // Create synthetic conflicting species
    const coldSpecies: SpeciesProfile = {
      ...SPECIES_CATALOG.rohu,
      id: 'cold_fish',
      commonName: 'Cold Fish',
      parameters: {
        ...SPECIES_CATALOG.rohu.parameters,
        temp: {
          ...SPECIES_CATALOG.rohu.parameters.temp,
          optimal: [10, 16] // Max 16°C
        }
      }
    };

    const warmSpecies: SpeciesProfile = {
      ...SPECIES_CATALOG.rohu,
      id: 'warm_fish',
      commonName: 'Warm Fish',
      parameters: {
        ...SPECIES_CATALOG.rohu.parameters,
        temp: {
          ...SPECIES_CATALOG.rohu.parameters.temp,
          optimal: [28, 34] // Min 28°C
        }
      }
    };

    const overlap = computeRangeOverlap([coldSpecies, warmSpecies], 'temp');
    expect(overlap?.hasOverlap).toBe(false);
    expect(overlap?.commonOptimal).toBeNull();
    expect(overlap?.divergenceNotes).toContain('Conflict detected');
  });

  it('evaluates overall polyculture compatibility and raises carnivore warnings', () => {
    // Rohu (peaceful column carp) + Magur (carnivorous walking catfish)
    const report = evaluateMultiSpeciesCompatibility(['rohu', 'magur']);
    expect(report.overallCompatibility).toBe('PARTIAL_CAUTION');
    expect(report.conflictReasons.some(r => r.includes('predatory/carnivorous'))).toBe(true);
  });

  it('handles empty species selections gracefully', () => {
    const report = evaluateMultiSpeciesCompatibility([]);
    expect(report.selectedSpecies).toHaveLength(0);
    expect(report.conflictReasons[0]).toContain('No species selected');
  });
});

