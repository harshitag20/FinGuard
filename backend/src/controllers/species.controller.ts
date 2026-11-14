import { Request, Response } from 'express';
import { ALL_SPECIES_LIST, SPECIES_CATALOG } from '../../../shared/speciesCatalog';
import { evaluateMultiSpeciesCompatibility } from '../../../shared/overlapEngine';

export const speciesController = {
  getSpecies: (req: Request, res: Response) => {
    res.json({
      success: true,
      count: ALL_SPECIES_LIST.length,
      species: ALL_SPECIES_LIST
    });
  },

  getSpeciesById: (req: Request, res: Response) => {
    const id = (Array.isArray(req.params.id) ? req.params.id[0] : req.params.id) as string;
    const species = SPECIES_CATALOG[id];
    if (!species) {
      return res.status(404).json({ success: false, error: `Species '${id}' not found in registry.` });
    }
    res.json({ success: true, species });
  },

  evaluateOverlap: (req: Request, res: Response) => {
    const { speciesIds } = req.body;
    if (!Array.isArray(speciesIds) || speciesIds.length === 0) {
      return res.status(400).json({ success: false, error: 'Valid speciesIds array required.' });
    }
    const report = evaluateMultiSpeciesCompatibility(speciesIds);
    res.json({ success: true, report });
  }
};
