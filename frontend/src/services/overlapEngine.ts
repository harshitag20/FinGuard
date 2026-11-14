/**
 * FinGuard.io - Multi-Species Range Overlap Engine
 * Calculates mathematically rigorous parameter intersections [max(L_i), min(U_i)]
 * across selected fish species and evaluates pond compatibility.
 */

import { SpeciesProfile, SPECIES_CATALOG, ParameterRange } from './speciesCatalog';

export interface RangeOverlapResult {
  parameterKey: 'temp' | 'ph' | 'oxygen' | 'ammonia' | 'nitrite' | 'salinity';
  parameterName: string;
  unit: string;
  hasOverlap: boolean;
  commonOptimal: [number, number] | null; // [max(L_i), min(U_i)]
  narrowestSpecies: {
    lowerBoundSpecies: string;
    upperBoundSpecies: string;
  };
  individualRanges: {
    speciesId: string;
    speciesName: string;
    optimal: [number, number];
    warningLow?: [number, number];
    warningHigh?: [number, number];
    criticalLow: number;
    criticalHigh: number;
    sourceTitle: string;
    sourceUrl: string;
  }[];
  divergenceNotes?: string;
}

export interface MultiSpeciesCompatibilityReport {
  selectedSpecies: SpeciesProfile[];
  parameters: Record<string, RangeOverlapResult>;
  overallCompatibility: 'COMPATIBLE' | 'PARTIAL_CAUTION' | 'INCOMPATIBLE';
  conflictReasons: string[];
  screeningDisclaimer: string;
  coCultureRecommendations: string[];
}

export function computeRangeOverlap(
  speciesList: SpeciesProfile[],
  parameterKey: 'temp' | 'ph' | 'oxygen' | 'ammonia' | 'nitrite' | 'salinity'
): RangeOverlapResult | null {
  if (speciesList.length === 0) return null;

  // Filter species that have this parameter defined
  const validSpecies = speciesList.filter(s => s.parameters[parameterKey] !== undefined);
  if (validSpecies.length === 0) return null;

  const firstParam = validSpecies[0].parameters[parameterKey]!;
  const parameterName = firstParam.parameterName;
  const unit = firstParam.unit;

  let maxLower = -Infinity;
  let minUpper = Infinity;
  let lowerSpecies = '';
  let upperSpecies = '';

  const individualRanges = validSpecies.map(sp => {
    const p = sp.parameters[parameterKey]!;
    const [low, high] = p.optimal;

    if (low > maxLower) {
      maxLower = low;
      lowerSpecies = sp.commonName;
    }
    if (high < minUpper) {
      minUpper = high;
      upperSpecies = sp.commonName;
    }

    return {
      speciesId: sp.id,
      speciesName: sp.commonName,
      optimal: p.optimal,
      warningLow: p.warningLow,
      warningHigh: p.warningHigh,
      criticalLow: p.criticalLow,
      criticalHigh: p.criticalHigh,
      sourceTitle: p.sourceTitle,
      sourceUrl: p.sourceUrl
    };
  });

  const hasOverlap = maxLower <= minUpper;
  let divergenceNotes: string | undefined = undefined;

  if (!hasOverlap) {
    divergenceNotes = `Conflict detected: ${lowerSpecies} requires at least ${maxLower} ${unit}, which exceeds ${upperSpecies}'s maximum optimal threshold of ${minUpper} ${unit}. No viable common operating zone exists.`;
  }

  return {
    parameterKey,
    parameterName,
    unit,
    hasOverlap,
    commonOptimal: hasOverlap ? [Number(maxLower.toFixed(2)), Number(minUpper.toFixed(2))] : null,
    narrowestSpecies: {
      lowerBoundSpecies: lowerSpecies,
      upperBoundSpecies: upperSpecies
    },
    individualRanges,
    divergenceNotes
  };
}

export function evaluateMultiSpeciesCompatibility(speciesIds: string[]): MultiSpeciesCompatibilityReport {
  const selectedSpecies: SpeciesProfile[] = speciesIds
    .map(id => SPECIES_CATALOG[id])
    .filter((s): s is SpeciesProfile => Boolean(s));

  if (selectedSpecies.length === 0) {
    return {
      selectedSpecies: [],
      parameters: {},
      overallCompatibility: 'COMPATIBLE',
      conflictReasons: ['No species selected. Species-specific recommendations require selecting cultivated fish.'],
      screeningDisclaimer: 'No species chosen.',
      coCultureRecommendations: []
    };
  }

  const parameterKeys: ('temp' | 'ph' | 'oxygen' | 'ammonia' | 'nitrite' | 'salinity')[] = [
    'temp', 'ph', 'oxygen', 'ammonia', 'nitrite', 'salinity'
  ];

  const parameters: Record<string, RangeOverlapResult> = {};
  const conflictReasons: string[] = [];
  let incompatibleCount = 0;

  for (const key of parameterKeys) {
    const overlap = computeRangeOverlap(selectedSpecies, key);
    if (overlap) {
      parameters[key] = overlap;
      if (!overlap.hasOverlap) {
        incompatibleCount++;
        conflictReasons.push(`${overlap.parameterName}: ${overlap.divergenceNotes}`);
      }
    }
  }

  // Ecological niche check
  const feedingHabits = selectedSpecies.map(s => s.feedingHabit);
  const airBreathers = selectedSpecies.filter(s => s.isAirBreathing);
  const carnivores = selectedSpecies.filter(s => s.feedingHabit === 'Carnivore');
  const herbivores = selectedSpecies.filter(s => s.feedingHabit === 'Herbivore');
  const coCultureRecommendations: string[] = [];

  // Polyculture synergy rules (Indian Major Carps classic polyculture)
  const isIMC = selectedSpecies.some(s => s.id === 'rohu') &&
                selectedSpecies.some(s => s.id === 'catla') &&
                selectedSpecies.some(s => s.id === 'mrigal');
  if (isIMC) {
    coCultureRecommendations.push(
      "Classic Indian Major Carp (IMC) Composite Polyculture: Catla (surface), Rohu (column), and Mrigal (bottom) utilize distinct ecological pond strata with high ecological synergy."
    );
  }

  // Carnivore warning
  if (carnivores.length > 0 && selectedSpecies.length > 1) {
    const nonCarnivores = selectedSpecies.filter(s => s.feedingHabit !== 'Carnivore');
    if (nonCarnivores.length > 0) {
      conflictReasons.push(
        `Behavioral Risk: ${carnivores.map(c => c.commonName).join(', ')} is predatory/carnivorous. Co-stocking with fingerlings of ${nonCarnivores.map(c => c.commonName).join(', ')} may cause high predation mortality unless size-graded.`
      );
    }
  }

  // Air breathing disparity
  if (airBreathers.length > 0 && airBreathers.length < selectedSpecies.length) {
    coCultureRecommendations.push(
      `Oxygen Disparity: Ponds containing both non-air breathers (e.g. Rohu/Catla) and air breathers (${airBreathers.map(a => a.commonName).join(', ')}) require aeration managed for the most sensitive non-air-breathing carps (minimum 5.0 mg/L DO).`
    );
  }

  let overallCompatibility: 'COMPATIBLE' | 'PARTIAL_CAUTION' | 'INCOMPATIBLE' = 'COMPATIBLE';
  if (incompatibleCount > 0 || carnivores.length > 0 && selectedSpecies.length > 1) {
    overallCompatibility = incompatibleCount > 0 ? 'INCOMPATIBLE' : 'PARTIAL_CAUTION';
  } else if (conflictReasons.length > 0) {
    overallCompatibility = 'PARTIAL_CAUTION';
  }

  const screeningDisclaimer =
    "Important Scientific Note: The calculated intersection [max(L), min(U)] represents a physiological screening guide based on authoritative reference literature. It does not replace on-farm ecological testing, stocking density ratios, life-stage acclimation, or local water source characteristics.";

  return {
    selectedSpecies,
    parameters,
    overallCompatibility,
    conflictReasons,
    screeningDisclaimer,
    coCultureRecommendations
  };
}

