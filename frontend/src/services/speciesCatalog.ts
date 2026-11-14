/**
 * FinGuard.io - Species Reference Database
 * Scientifically sourced operating ranges for Indian freshwater aquaculture species.
 * Sources: FAO Cultured Aquatic Species Information Programme, ICAR-CIFA manuals, Boyd (2020).
 */

export interface ParameterRange {
  optimal: [number, number];       // Ideal growth & health range
  warningLow?: [number, number];   // Sub-optimal low, stress zone
  warningHigh?: [number, number];  // Sub-optimal high, stress zone
  criticalLow: number;             // Lethal / acute distress threshold
  criticalHigh: number;            // Lethal / acute distress threshold
  unit: string;
  parameterName: string;
  sourceTitle: string;
  sourceUrl: string;
  lifeStage: string;
  conditions: string;
  dateAccessed: string;
}

export interface SpeciesProfile {
  id: string;
  commonName: string;
  scientificName: string;
  family: string;
  habitat: string;
  feedingHabit: 'Column Feeder' | 'Surface Feeder' | 'Bottom Feeder' | 'Herbivore' | 'Omnivore' | 'Carnivore';
  isAirBreathing: boolean;
  provisionalCoverage?: boolean;
  coverageNotes?: string;
  parameters: {
    temp: ParameterRange;
    ph: ParameterRange;
    oxygen: ParameterRange;
    ammonia: ParameterRange; // TAN (Total Ammonia Nitrogen)
    nitrite?: ParameterRange;
    salinity?: ParameterRange;
  };
  commonDiseases: string[];
}

export const SPECIES_CATALOG: Record<string, SpeciesProfile> = {
  rohu: {
    id: 'rohu',
    commonName: 'Rohu',
    scientificName: 'Labeo rohita',
    family: 'Cyprinidae',
    habitat: 'Freshwater column waters (IMC polyculture)',
    feedingHabit: 'Column Feeder',
    isAirBreathing: false,
    parameters: {
      temp: {
        optimal: [26, 32],
        warningLow: [20, 25.9],
        warningHigh: [32.1, 35],
        criticalLow: 14,
        criticalHigh: 38,
        unit: '°C',
        parameterName: 'Water Temperature',
        sourceTitle: 'FAO Fisheries Aquaculture Species: Labeo rohita (Hamilton, 1822)',
        sourceUrl: 'https://www.fao.org/fishery/en/culturedspecies/labeo_rohita/en',
        lifeStage: 'Fingerling to Grow-out',
        conditions: 'Sub-tropical / tropical freshwater earthen ponds',
        dateAccessed: '2026-03-01'
      },
      ph: {
        optimal: [7.2, 8.5],
        warningLow: [6.5, 7.1],
        warningHigh: [8.6, 9.2],
        criticalLow: 5.5,
        criticalHigh: 10.0,
        unit: 'pH',
        parameterName: 'pH Level',
        sourceTitle: 'ICAR-CIFA Training Manual on Carp Seed Production and Culture',
        sourceUrl: 'http://cifa.nic.in/publications',
        lifeStage: 'Grow-out',
        conditions: 'Well-buffered alkaline freshwater',
        dateAccessed: '2026-03-01'
      },
      oxygen: {
        optimal: [5.0, 9.0],
        warningLow: [3.0, 4.9],
        criticalLow: 1.5,
        criticalHigh: 15.0,
        unit: 'mg/L',
        parameterName: 'Dissolved Oxygen',
        sourceTitle: 'ICAR-CIFA Carp Polyculture Standard Operating Procedures',
        sourceUrl: 'http://cifa.nic.in/carp-culture',
        lifeStage: 'All stages',
        conditions: 'Morning minimum dissolved oxygen requirements',
        dateAccessed: '2026-03-01'
      },
      ammonia: {
        optimal: [0.0, 0.05],
        warningHigh: [0.06, 0.20],
        criticalLow: 0.0,
        criticalHigh: 0.50,
        unit: 'mg/L TAN',
        parameterName: 'Total Ammonia Nitrogen (TAN)',
        sourceTitle: 'Boyd, C. E. (2020) Water Quality in Aquaculture Ponds',
        sourceUrl: 'https://www.sciencedirect.com/book/9780128169308/water-quality',
        lifeStage: 'Grow-out',
        conditions: 'Un-ionized fraction toxicity increases above pH 8.2 and 30°C',
        dateAccessed: '2026-03-01'
      },
      nitrite: {
        optimal: [0.0, 0.1],
        warningHigh: [0.11, 0.30],
        criticalLow: 0.0,
        criticalHigh: 0.50,
        unit: 'mg/L NO2-N',
        parameterName: 'Nitrite-Nitrogen',
        sourceTitle: 'ICAR-CIFA Fish Health Management Bulletin',
        sourceUrl: 'http://cifa.nic.in/health',
        lifeStage: 'Grow-out',
        conditions: 'Freshwater conditions without chloride supplementation',
        dateAccessed: '2026-03-01'
      },
      salinity: {
        optimal: [0.0, 2.0],
        warningHigh: [2.1, 5.0],
        criticalLow: 0.0,
        criticalHigh: 8.0,
        unit: 'ppt',
        parameterName: 'Salinity',
        sourceTitle: 'FAO Species Fact Sheet - Labeo rohita',
        sourceUrl: 'https://www.fao.org/fishery/en/culturedspecies/labeo_rohita/en',
        lifeStage: 'Grow-out',
        conditions: 'Strictly stenohaline freshwater',
        dateAccessed: '2026-03-01'
      }
    },
    commonDiseases: ['EUS (Epizootic Ulcerative Syndrome)', 'Dactylogyrosis (Gill Fluke)', 'Bacterial Gill Rot', 'Argulosis (Fish Lice)', 'Columnaris Disease']
  },
  catla: {
    id: 'catla',
    commonName: 'Catla',
    scientificName: 'Gibelion catla',
    family: 'Cyprinidae',
    habitat: 'Surface feeder in pond water column',
    feedingHabit: 'Surface Feeder',
    isAirBreathing: false,
    parameters: {
      temp: {
        optimal: [25, 32],
        warningLow: [20, 24.9],
        warningHigh: [32.1, 36],
        criticalLow: 14,
        criticalHigh: 38,
        unit: '°C',
        parameterName: 'Water Temperature',
        sourceTitle: 'FAO Fisheries Cultured Species: Gibelion catla',
        sourceUrl: 'https://www.fao.org/fishery/en/culturedspecies/gibelion_catla/en',
        lifeStage: 'Fingerling to Adult',
        conditions: 'Fast-growing major carp, highly sensitive to cold spells',
        dateAccessed: '2026-03-01'
      },
      ph: {
        optimal: [7.2, 8.5],
        warningLow: [6.5, 7.1],
        warningHigh: [8.6, 9.0],
        criticalLow: 5.5,
        criticalHigh: 10.0,
        unit: 'pH',
        parameterName: 'pH Level',
        sourceTitle: 'ICAR-CIFA Polyculture Guidelines',
        sourceUrl: 'http://cifa.nic.in/publications',
        lifeStage: 'Grow-out',
        conditions: 'Plankton-rich earthen ponds',
        dateAccessed: '2026-03-01'
      },
      oxygen: {
        optimal: [5.0, 9.0],
        warningLow: [3.5, 4.9],
        criticalLow: 2.0,
        criticalHigh: 15.0,
        unit: 'mg/L',
        parameterName: 'Dissolved Oxygen',
        sourceTitle: 'ICAR-CIFA Aquatic Health Protocols',
        sourceUrl: 'http://cifa.nic.in/aquatic-health',
        lifeStage: 'All stages',
        conditions: 'Requires higher DO due to active surface swimming metabolism',
        dateAccessed: '2026-03-01'
      },
      ammonia: {
        optimal: [0.0, 0.04],
        warningHigh: [0.05, 0.15],
        criticalLow: 0.0,
        criticalHigh: 0.40,
        unit: 'mg/L TAN',
        parameterName: 'Total Ammonia Nitrogen (TAN)',
        sourceTitle: 'Boyd, C. E. (2020) Water Quality in Aquaculture Ponds',
        sourceUrl: 'https://www.sciencedirect.com/book/9780128169308/water-quality',
        lifeStage: 'Grow-out',
        conditions: 'Pond surface layers where sunlight and pH elevate free NH3',
        dateAccessed: '2026-03-01'
      },
      nitrite: {
        optimal: [0.0, 0.08],
        warningHigh: [0.09, 0.25],
        criticalLow: 0.0,
        criticalHigh: 0.45,
        unit: 'mg/L NO2-N',
        parameterName: 'Nitrite-Nitrogen',
        sourceTitle: 'ICAR-CIFA Fish Disease Manual',
        sourceUrl: 'http://cifa.nic.in',
        lifeStage: 'Grow-out',
        conditions: 'Freshwater grow-out ponds',
        dateAccessed: '2026-03-01'
      },
      salinity: {
        optimal: [0.0, 2.0],
        warningHigh: [2.1, 4.5],
        criticalLow: 0.0,
        criticalHigh: 6.0,
        unit: 'ppt',
        parameterName: 'Salinity',
        sourceTitle: 'FAO Fisheries Synopsis: Catla catla',
        sourceUrl: 'https://www.fao.org/fishery/en/culturedspecies/gibelion_catla/en',
        lifeStage: 'Grow-out',
        conditions: 'Freshwater only',
        dateAccessed: '2026-03-01'
      }
    },
    commonDiseases: ['EUS (Epizootic Ulcerative Syndrome)', 'Gill Rot (Branchiomyces)', 'Costiasis (Ichthyobodo)', 'Dropsy', 'Argulosis']
  },
  mrigal: {
    id: 'mrigal',
    commonName: 'Mrigal',
    scientificName: 'Cirrhinus mrigala',
    family: 'Cyprinidae',
    habitat: 'Benthic / pond bottom feeder',
    feedingHabit: 'Bottom Feeder',
    isAirBreathing: false,
    parameters: {
      temp: {
        optimal: [26, 32],
        warningLow: [20, 25.9],
        warningHigh: [32.1, 35],
        criticalLow: 14,
        criticalHigh: 38,
        unit: '°C',
        parameterName: 'Water Temperature',
        sourceTitle: 'FAO Cultured Aquatic Species: Cirrhinus mrigala',
        sourceUrl: 'https://www.fao.org/fishery/en/culturedspecies/cirrhinus_mrigala/en',
        lifeStage: 'Grow-out',
        conditions: 'Freshwater earthen ponds',
        dateAccessed: '2026-03-01'
      },
      ph: {
        optimal: [7.0, 8.5],
        warningLow: [6.4, 6.9],
        warningHigh: [8.6, 9.0],
        criticalLow: 5.5,
        criticalHigh: 10.0,
        unit: 'pH',
        parameterName: 'pH Level',
        sourceTitle: 'ICAR-CIFA Guidelines on Benthic Carp Ecology',
        sourceUrl: 'http://cifa.nic.in',
        lifeStage: 'Grow-out',
        conditions: 'Sediment-water interface',
        dateAccessed: '2026-03-01'
      },
      oxygen: {
        optimal: [5.0, 8.5],
        warningLow: [3.0, 4.9],
        criticalLow: 1.5,
        criticalHigh: 15.0,
        unit: 'mg/L',
        parameterName: 'Dissolved Oxygen',
        sourceTitle: 'ICAR-CIFA Standard Carp Polyculture Management',
        sourceUrl: 'http://cifa.nic.in',
        lifeStage: 'All stages',
        conditions: 'Pond bottom requires monitoring as DO drops fastest in sediment boundary',
        dateAccessed: '2026-03-01'
      },
      ammonia: {
        optimal: [0.0, 0.05],
        warningHigh: [0.06, 0.20],
        criticalLow: 0.0,
        criticalHigh: 0.50,
        unit: 'mg/L TAN',
        parameterName: 'Total Ammonia Nitrogen (TAN)',
        sourceTitle: 'Boyd, C. E. (2020) Water Quality in Aquaculture Ponds',
        sourceUrl: 'https://www.sciencedirect.com/book/9780128169308/water-quality',
        lifeStage: 'Grow-out',
        conditions: 'Pond bottom detritus decomposition zone',
        dateAccessed: '2026-03-01'
      },
      nitrite: {
        optimal: [0.0, 0.1],
        warningHigh: [0.11, 0.30],
        criticalLow: 0.0,
        criticalHigh: 0.50,
        unit: 'mg/L NO2-N',
        parameterName: 'Nitrite-Nitrogen',
        sourceTitle: 'ICAR-CIFA Fish Health Protocols',
        sourceUrl: 'http://cifa.nic.in',
        lifeStage: 'Grow-out',
        conditions: 'Freshwater bottom strata',
        dateAccessed: '2026-03-01'
      },
      salinity: {
        optimal: [0.0, 2.0],
        warningHigh: [2.1, 4.5],
        criticalLow: 0.0,
        criticalHigh: 7.0,
        unit: 'ppt',
        parameterName: 'Salinity',
        sourceTitle: 'FAO Cirrhinus mrigala Profile',
        sourceUrl: 'https://www.fao.org/fishery/en/culturedspecies/cirrhinus_mrigala/en',
        lifeStage: 'Grow-out',
        conditions: 'Freshwater ponds',
        dateAccessed: '2026-03-01'
      }
    },
    commonDiseases: ['EUS (Epizootic Ulcerative Syndrome)', 'Myxoboliasis', 'Fin and Tail Rot', 'Trichodiniasis', 'Bacterial Septicemia']
  },
  common_carp: {
    id: 'common_carp',
    commonName: 'Common Carp',
    scientificName: 'Cyprinus carpio',
    family: 'Cyprinidae',
    habitat: 'Bottom detritivore, highly adaptable',
    feedingHabit: 'Bottom Feeder',
    isAirBreathing: false,
    parameters: {
      temp: {
        optimal: [20, 28],
        warningLow: [15, 19.9],
        warningHigh: [28.1, 33],
        criticalLow: 4,
        criticalHigh: 36,
        unit: '°C',
        parameterName: 'Water Temperature',
        sourceTitle: 'FAO Cultured Species: Cyprinus carpio',
        sourceUrl: 'https://www.fao.org/fishery/en/culturedspecies/cyprinus_carpio/en',
        lifeStage: 'Grow-out',
        conditions: 'Wide eurythermal adaptability, tolerates cold upland ponds',
        dateAccessed: '2026-03-01'
      },
      ph: {
        optimal: [7.0, 8.5],
        warningLow: [6.5, 6.9],
        warningHigh: [8.6, 9.0],
        criticalLow: 5.5,
        criticalHigh: 9.8,
        unit: 'pH',
        parameterName: 'pH Level',
        sourceTitle: 'Boyd, C. E. (2020) Water Quality in Aquaculture Ponds',
        sourceUrl: 'https://www.sciencedirect.com/book/9780128169308/water-quality',
        lifeStage: 'Grow-out',
        conditions: 'Standard pond systems',
        dateAccessed: '2026-03-01'
      },
      oxygen: {
        optimal: [5.0, 9.0],
        warningLow: [3.0, 4.9],
        criticalLow: 1.0,
        criticalHigh: 16.0,
        unit: 'mg/L',
        parameterName: 'Dissolved Oxygen',
        sourceTitle: 'FAO Cyprinus carpio Culture Fact Sheet',
        sourceUrl: 'https://www.fao.org/fishery/en/culturedspecies/cyprinus_carpio/en',
        lifeStage: 'All stages',
        conditions: 'Tolerates short-term hypoxia better than Indian major carps',
        dateAccessed: '2026-03-01'
      },
      ammonia: {
        optimal: [0.0, 0.05],
        warningHigh: [0.06, 0.25],
        criticalLow: 0.0,
        criticalHigh: 0.60,
        unit: 'mg/L TAN',
        parameterName: 'Total Ammonia Nitrogen (TAN)',
        sourceTitle: 'Boyd, C. E. (2020) Water Quality in Aquaculture Ponds',
        sourceUrl: 'https://www.sciencedirect.com/book/9780128169308/water-quality',
        lifeStage: 'Grow-out',
        conditions: 'Intensive to semi-intensive ponds',
        dateAccessed: '2026-03-01'
      },
      nitrite: {
        optimal: [0.0, 0.12],
        warningHigh: [0.13, 0.35],
        criticalLow: 0.0,
        criticalHigh: 0.65,
        unit: 'mg/L NO2-N',
        parameterName: 'Nitrite-Nitrogen',
        sourceTitle: 'ICAR-CIFA Fish Disease Advisory',
        sourceUrl: 'http://cifa.nic.in',
        lifeStage: 'Grow-out',
        conditions: 'High tolerance to nitrite in presence of chlorides',
        dateAccessed: '2026-03-01'
      },
      salinity: {
        optimal: [0.0, 3.0],
        warningHigh: [3.1, 6.0],
        criticalLow: 0.0,
        criticalHigh: 10.0,
        unit: 'ppt',
        parameterName: 'Salinity',
        sourceTitle: 'FAO Cyprinus carpio Technical Paper',
        sourceUrl: 'https://www.fao.org/fishery/en/culturedspecies/cyprinus_carpio/en',
        lifeStage: 'Grow-out',
        conditions: 'Can tolerate slightly brackish waters up to 6 ppt',
        dateAccessed: '2026-03-01'
      }
    },
    commonDiseases: ['Koi Herpesvirus (KHV)', 'Spring Viremia of Carp (SVC)', 'Ichthyophthiriasis (White Spot)', 'Bacterial Gill Rot', 'Costiasis']
  },
  grass_carp: {
    id: 'grass_carp',
    commonName: 'Grass Carp',
    scientificName: 'Ctenopharyngodon idella',
    family: 'Cyprinidae',
    habitat: 'Macro-vegetation feeder in pond surface/mid-water',
    feedingHabit: 'Herbivore',
    isAirBreathing: false,
    parameters: {
      temp: {
        optimal: [22, 28],
        warningLow: [16, 21.9],
        warningHigh: [28.1, 33],
        criticalLow: 6,
        criticalHigh: 36,
        unit: '°C',
        parameterName: 'Water Temperature',
        sourceTitle: 'FAO Cultured Species: Ctenopharyngodon idella',
        sourceUrl: 'https://www.fao.org/fishery/en/culturedspecies/ctenopharyngodon_idella/en',
        lifeStage: 'Grow-out',
        conditions: 'Optimal feeding on aquatic weeds occurs between 22-28°C',
        dateAccessed: '2026-03-01'
      },
      ph: {
        optimal: [7.2, 8.5],
        warningLow: [6.5, 7.1],
        warningHigh: [8.6, 9.0],
        criticalLow: 5.5,
        criticalHigh: 9.8,
        unit: 'pH',
        parameterName: 'pH Level',
        sourceTitle: 'ICAR-CIFA Carp Polyculture Manual',
        sourceUrl: 'http://cifa.nic.in',
        lifeStage: 'Grow-out',
        conditions: 'Earthen aquaculture ponds',
        dateAccessed: '2026-03-01'
      },
      oxygen: {
        optimal: [5.0, 9.0],
        warningLow: [3.5, 4.9],
        criticalLow: 1.8,
        criticalHigh: 15.0,
        unit: 'mg/L',
        parameterName: 'Dissolved Oxygen',
        sourceTitle: 'ICAR-CIFA Water Quality Standards',
        sourceUrl: 'http://cifa.nic.in',
        lifeStage: 'All stages',
        conditions: 'Herbivorous diet results in high metabolic oxygen demand',
        dateAccessed: '2026-03-01'
      },
      ammonia: {
        optimal: [0.0, 0.05],
        warningHigh: [0.06, 0.20],
        criticalLow: 0.0,
        criticalHigh: 0.50,
        unit: 'mg/L TAN',
        parameterName: 'Total Ammonia Nitrogen (TAN)',
        sourceTitle: 'Boyd, C. E. (2020)',
        sourceUrl: 'https://www.sciencedirect.com/book/9780128169308/water-quality',
        lifeStage: 'Grow-out',
        conditions: 'Semi-intensive culture',
        dateAccessed: '2026-03-01'
      },
      nitrite: {
        optimal: [0.0, 0.1],
        warningHigh: [0.11, 0.30],
        criticalLow: 0.0,
        criticalHigh: 0.50,
        unit: 'mg/L NO2-N',
        parameterName: 'Nitrite-Nitrogen',
        sourceTitle: 'ICAR-CIFA Fish Health Protocols',
        sourceUrl: 'http://cifa.nic.in',
        lifeStage: 'Grow-out',
        conditions: 'Freshwater ponds',
        dateAccessed: '2026-03-01'
      },
      salinity: {
        optimal: [0.0, 2.0],
        warningHigh: [2.1, 5.0],
        criticalLow: 0.0,
        criticalHigh: 8.0,
        unit: 'ppt',
        parameterName: 'Salinity',
        sourceTitle: 'FAO Ctenopharyngodon idella Profile',
        sourceUrl: 'https://www.fao.org/fishery/en/culturedspecies/ctenopharyngodon_idella/en',
        lifeStage: 'Grow-out',
        conditions: 'Strictly freshwater species',
        dateAccessed: '2026-03-01'
      }
    },
    commonDiseases: ['Grass Carp Hemorrhagic Disease (GCHD)', 'Bacterial Enteritis', 'Gill Rot Disease', 'Trichodiniasis', 'Anchor Worm (Lernaea)']
  },
  silver_carp: {
    id: 'silver_carp',
    commonName: 'Silver Carp',
    scientificName: 'Hypophthalmichthys molitrix',
    family: 'Cyprinidae',
    habitat: 'Microscopic phytoplankton filter feeder in surface waters',
    feedingHabit: 'Surface Feeder',
    isAirBreathing: false,
    parameters: {
      temp: {
        optimal: [24, 30],
        warningLow: [18, 23.9],
        warningHigh: [30.1, 34],
        criticalLow: 10,
        criticalHigh: 37,
        unit: '°C',
        parameterName: 'Water Temperature',
        sourceTitle: 'FAO Cultured Species: Hypophthalmichthys molitrix',
        sourceUrl: 'https://www.fao.org/fishery/en/culturedspecies/hypophthalmichthys_molitrix/en',
        lifeStage: 'Grow-out',
        conditions: 'Filter-feeding intensity drops sharply below 20°C',
        dateAccessed: '2026-03-01'
      },
      ph: {
        optimal: [7.2, 8.5],
        warningLow: [6.5, 7.1],
        warningHigh: [8.6, 9.0],
        criticalLow: 5.5,
        criticalHigh: 9.8,
        unit: 'pH',
        parameterName: 'pH Level',
        sourceTitle: 'ICAR-CIFA Carp Polyculture Manual',
        sourceUrl: 'http://cifa.nic.in',
        lifeStage: 'Grow-out',
        conditions: 'Plankton-rich earthen ponds',
        dateAccessed: '2026-03-01'
      },
      oxygen: {
        optimal: [5.0, 9.0],
        warningLow: [3.5, 4.9],
        criticalLow: 2.0,
        criticalHigh: 15.0,
        unit: 'mg/L',
        parameterName: 'Dissolved Oxygen',
        sourceTitle: 'FAO Hypophthalmichthys molitrix Fact Sheet',
        sourceUrl: 'https://www.fao.org/fishery/en/culturedspecies/hypophthalmichthys_molitrix/en',
        lifeStage: 'All stages',
        conditions: 'Highly sensitive to morning DO dips; first to gasp at pond surface',
        dateAccessed: '2026-03-01'
      },
      ammonia: {
        optimal: [0.0, 0.05],
        warningHigh: [0.06, 0.18],
        criticalLow: 0.0,
        criticalHigh: 0.45,
        unit: 'mg/L TAN',
        parameterName: 'Total Ammonia Nitrogen (TAN)',
        sourceTitle: 'Boyd, C. E. (2020)',
        sourceUrl: 'https://www.sciencedirect.com/book/9780128169308/water-quality',
        lifeStage: 'Grow-out',
        conditions: 'Surface layer phytoplankton bloom conditions',
        dateAccessed: '2026-03-01'
      },
      nitrite: {
        optimal: [0.0, 0.1],
        warningHigh: [0.11, 0.28],
        criticalLow: 0.0,
        criticalHigh: 0.50,
        unit: 'mg/L NO2-N',
        parameterName: 'Nitrite-Nitrogen',
        sourceTitle: 'ICAR-CIFA Guidelines',
        sourceUrl: 'http://cifa.nic.in',
        lifeStage: 'Grow-out',
        conditions: 'Freshwater ponds',
        dateAccessed: '2026-03-01'
      },
      salinity: {
        optimal: [0.0, 2.0],
        warningHigh: [2.1, 4.0],
        criticalLow: 0.0,
        criticalHigh: 6.0,
        unit: 'ppt',
        parameterName: 'Salinity',
        sourceTitle: 'FAO Synopsis on Silver Carp',
        sourceUrl: 'https://www.fao.org/fishery/en/culturedspecies/hypophthalmichthys_molitrix/en',
        lifeStage: 'Grow-out',
        conditions: 'Freshwater only',
        dateAccessed: '2026-03-01'
      }
    },
    commonDiseases: ['Bacterial Gill Rot', 'EUS (Epizootic Ulcerative Syndrome)', 'Dactylogyrosis', 'White Spot (Ich)', 'Trichodiniasis']
  },
  nile_tilapia: {
    id: 'nile_tilapia',
    commonName: 'Nile Tilapia',
    scientificName: 'Oreochromis niloticus',
    family: 'Cichlidae',
    habitat: 'Tropical warm water, highly robust and adaptable',
    feedingHabit: 'Omnivore',
    isAirBreathing: false,
    parameters: {
      temp: {
        optimal: [27, 32],
        warningLow: [22, 26.9],
        warningHigh: [32.1, 35],
        criticalLow: 13,
        criticalHigh: 39,
        unit: '°C',
        parameterName: 'Water Temperature',
        sourceTitle: 'FAO Cultured Species: Oreochromis niloticus',
        sourceUrl: 'https://www.fao.org/fishery/en/culturedspecies/oreochromis_niloticus/en',
        lifeStage: 'Grow-out',
        conditions: 'Feeding ceases below 20°C; severe mortality below 12°C',
        dateAccessed: '2026-03-01'
      },
      ph: {
        optimal: [6.5, 8.5],
        warningLow: [5.5, 6.4],
        warningHigh: [8.6, 9.5],
        criticalLow: 4.5,
        criticalHigh: 11.0,
        unit: 'pH',
        parameterName: 'pH Level',
        sourceTitle: 'Popma, T. & Masser, M. (1999) Tilapia: Life History and Biology, SRAC Publication No. 283',
        sourceUrl: 'https://srac.tamu.edu/fact-sheets',
        lifeStage: 'Grow-out',
        conditions: 'Earthen ponds, biofloc, and raceways',
        dateAccessed: '2026-03-01'
      },
      oxygen: {
        optimal: [4.0, 8.5],
        warningLow: [2.0, 3.9],
        criticalLow: 0.8,
        criticalHigh: 16.0,
        unit: 'mg/L',
        parameterName: 'Dissolved Oxygen',
        sourceTitle: 'SRAC Publication No. 283 - Tilapia Pond Culture',
        sourceUrl: 'https://srac.tamu.edu/fact-sheets',
        lifeStage: 'All stages',
        conditions: 'Exceptional hypoxia tolerance; can utilize atmospheric air at surface during emergency',
        dateAccessed: '2026-03-01'
      },
      ammonia: {
        optimal: [0.0, 0.08],
        warningHigh: [0.09, 0.30],
        criticalLow: 0.0,
        criticalHigh: 0.80,
        unit: 'mg/L TAN',
        parameterName: 'Total Ammonia Nitrogen (TAN)',
        sourceTitle: 'Boyd, C. E. (2020)',
        sourceUrl: 'https://www.sciencedirect.com/book/9780128169308/water-quality',
        lifeStage: 'Grow-out',
        conditions: 'Higher resistance to unionized ammonia than carps',
        dateAccessed: '2026-03-01'
      },
      nitrite: {
        optimal: [0.0, 0.2],
        warningHigh: [0.21, 0.50],
        criticalLow: 0.0,
        criticalHigh: 1.0,
        unit: 'mg/L NO2-N',
        parameterName: 'Nitrite-Nitrogen',
        sourceTitle: 'SRAC Fact Sheet 283',
        sourceUrl: 'https://srac.tamu.edu',
        lifeStage: 'Grow-out',
        conditions: 'Freshwater or brackish biofloc',
        dateAccessed: '2026-03-01'
      },
      salinity: {
        optimal: [0.0, 10.0],
        warningHigh: [10.1, 18.0],
        criticalLow: 0.0,
        criticalHigh: 25.0,
        unit: 'ppt',
        parameterName: 'Salinity',
        sourceTitle: 'FAO Fisheries - Oreochromis niloticus Profile',
        sourceUrl: 'https://www.fao.org/fishery/en/culturedspecies/oreochromis_niloticus/en',
        lifeStage: 'Grow-out',
        conditions: 'Euryhaline; reproduces up to 15 ppt, tolerates acclimation up to 20 ppt',
        dateAccessed: '2026-03-01'
      }
    },
    commonDiseases: ['Streptococcosis (Streptococcus iniae/agalactiae)', 'Tilapia Lake Virus (TiLV)', 'Columnaris Disease', 'Trichodiniasis', 'Bacterial Septicemia (Aeromonas)']
  },
  pangasius: {
    id: 'pangasius',
    commonName: 'Pangasius / Striped Catfish',
    scientificName: 'Pangasianodon hypophthalmus',
    family: 'Pangasiidae',
    habitat: 'Tropical river basins and intensive freshwater ponds',
    feedingHabit: 'Omnivore',
    isAirBreathing: true, // Facultative air-breather using modified swim bladder
    parameters: {
      temp: {
        optimal: [28, 32],
        warningLow: [23, 27.9],
        warningHigh: [32.1, 35],
        criticalLow: 16,
        criticalHigh: 38,
        unit: '°C',
        parameterName: 'Water Temperature',
        sourceTitle: 'FAO Cultured Aquatic Species: Pangasianodon hypophthalmus',
        sourceUrl: 'https://www.fao.org/fishery/en/culturedspecies/pangasianodon_hypophthalmus/en',
        lifeStage: 'Grow-out',
        conditions: 'Strictly tropical; severe physiological stress and fungal vulnerability below 22°C',
        dateAccessed: '2026-03-01'
      },
      ph: {
        optimal: [6.8, 8.0],
        warningLow: [6.0, 6.7],
        warningHigh: [8.1, 8.8],
        criticalLow: 5.0,
        criticalHigh: 9.5,
        unit: 'pH',
        parameterName: 'pH Level',
        sourceTitle: 'Phuong, N. T. & Oanh, D. T. H. (2010) Striped Catfish Aquaculture in Vietnam',
        sourceUrl: 'https://www.fao.org/fishery/docs/CDrom/aquaculture/a1078e/docs/Phuong.pdf',
        lifeStage: 'Grow-out',
        conditions: 'High-density earthen ponds',
        dateAccessed: '2026-03-01'
      },
      oxygen: {
        optimal: [3.5, 7.5],
        warningLow: [1.5, 3.4],
        criticalLow: 0.5,
        criticalHigh: 15.0,
        unit: 'mg/L',
        parameterName: 'Dissolved Oxygen',
        sourceTitle: 'FAO Pangasianodon hypophthalmus Overview',
        sourceUrl: 'https://www.fao.org/fishery/en/culturedspecies/pangasianodon_hypophthalmus/en',
        lifeStage: 'All stages',
        conditions: 'Possesses secondary air-breathing capability via modified swim bladder; tolerates hypoxic waters',
        dateAccessed: '2026-03-01'
      },
      ammonia: {
        optimal: [0.0, 0.08],
        warningHigh: [0.09, 0.35],
        criticalLow: 0.0,
        criticalHigh: 0.70,
        unit: 'mg/L TAN',
        parameterName: 'Total Ammonia Nitrogen (TAN)',
        sourceTitle: 'Boyd, C. E. (2020)',
        sourceUrl: 'https://www.sciencedirect.com/book/9780128169308/water-quality',
        lifeStage: 'Grow-out',
        conditions: 'High stocking densities generate high organic waste loads',
        dateAccessed: '2026-03-01'
      },
      nitrite: {
        optimal: [0.0, 0.25],
        warningHigh: [0.26, 0.60],
        criticalLow: 0.0,
        criticalHigh: 1.20,
        unit: 'mg/L NO2-N',
        parameterName: 'Nitrite-Nitrogen',
        sourceTitle: 'ICAR-CIFA Striped Catfish Culture Bulletin',
        sourceUrl: 'http://cifa.nic.in',
        lifeStage: 'Grow-out',
        conditions: 'High feeding rate ponds',
        dateAccessed: '2026-03-01'
      },
      salinity: {
        optimal: [0.0, 2.0],
        warningHigh: [2.1, 5.0],
        criticalLow: 0.0,
        criticalHigh: 8.0,
        unit: 'ppt',
        parameterName: 'Salinity',
        sourceTitle: 'FAO Fisheries Synopsis - Pangasius',
        sourceUrl: 'https://www.fao.org/fishery/en/culturedspecies/pangasianodon_hypophthalmus/en',
        lifeStage: 'Grow-out',
        conditions: 'Freshwater river basin culture',
        dateAccessed: '2026-03-01'
      }
    },
    commonDiseases: ['Bacillary Necrosis of Pangasius (BNP / Edwardsiella ictaluri)', 'Aeromonas Hydrophila Septicemia (Red Spot)', 'Columnaris Disease', 'Trichodiniasis', 'Ichthyophthiriasis']
  },
  magur: {
    id: 'magur',
    commonName: 'Magur / Walking Catfish',
    scientificName: 'Clarias magur',
    family: 'Clariidae',
    habitat: 'Swampy, shallow water bodies and derelict wetlands',
    feedingHabit: 'Carnivore',
    isAirBreathing: true, // Obligate/facultative air breather with suprabranchial organ
    parameters: {
      temp: {
        optimal: [26, 32],
        warningLow: [20, 25.9],
        warningHigh: [32.1, 35],
        criticalLow: 12,
        criticalHigh: 38,
        unit: '°C',
        parameterName: 'Water Temperature',
        sourceTitle: 'ICAR-CIFA Package of Practices: Breeding and Culture of Asian Magur (Clarias magur)',
        sourceUrl: 'http://cifa.nic.in/magur-manual',
        lifeStage: 'Grow-out',
        conditions: 'Shallow ponds and bio-floc tanks',
        dateAccessed: '2026-03-01'
      },
      ph: {
        optimal: [6.8, 8.2],
        warningLow: [6.0, 6.7],
        warningHigh: [8.3, 8.8],
        criticalLow: 5.0,
        criticalHigh: 9.5,
        unit: 'pH',
        parameterName: 'pH Level',
        sourceTitle: 'ICAR-CIFA Air-Breathing Fish Culture Bulletin',
        sourceUrl: 'http://cifa.nic.in',
        lifeStage: 'Grow-out',
        conditions: 'Muddy bottoms with decomposing leaf litter',
        dateAccessed: '2026-03-01'
      },
      oxygen: {
        optimal: [2.5, 7.0],
        warningLow: [1.0, 2.4],
        criticalLow: 0.2, // Exceptional survival due to suprabranchial accessory organ
        criticalHigh: 15.0,
        unit: 'mg/L',
        parameterName: 'Dissolved Oxygen',
        sourceTitle: 'ICAR-CIFA Clarias magur Manual',
        sourceUrl: 'http://cifa.nic.in/magur-manual',
        lifeStage: 'All stages',
        conditions: 'Equipped with accessory respiratory organ (arborescent organ); surfaces regularly for air',
        dateAccessed: '2026-03-01'
      },
      ammonia: {
        optimal: [0.0, 0.08],
        warningHigh: [0.09, 0.35],
        criticalLow: 0.0,
        criticalHigh: 0.70,
        unit: 'mg/L TAN',
        parameterName: 'Total Ammonia Nitrogen (TAN)',
        sourceTitle: 'Boyd, C. E. (2020)',
        sourceUrl: 'https://www.sciencedirect.com/book/9780128169308/water-quality',
        lifeStage: 'Grow-out',
        conditions: 'High protein carnivorous feed produces elevated TAN',
        dateAccessed: '2026-03-01'
      },
      nitrite: {
        optimal: [0.0, 0.2],
        warningHigh: [0.21, 0.50],
        criticalLow: 0.0,
        criticalHigh: 1.0,
        unit: 'mg/L NO2-N',
        parameterName: 'Nitrite-Nitrogen',
        sourceTitle: 'ICAR-CIFA Air-breathing Fish Health Guidelines',
        sourceUrl: 'http://cifa.nic.in',
        lifeStage: 'Grow-out',
        conditions: 'High stocking densities',
        dateAccessed: '2026-03-01'
      },
      salinity: {
        optimal: [0.0, 2.0],
        warningHigh: [2.1, 4.0],
        criticalLow: 0.0,
        criticalHigh: 6.0,
        unit: 'ppt',
        parameterName: 'Salinity',
        sourceTitle: 'ICAR-CIFA Species Bulletin',
        sourceUrl: 'http://cifa.nic.in',
        lifeStage: 'Grow-out',
        conditions: 'Freshwater only',
        dateAccessed: '2026-03-01'
      }
    },
    commonDiseases: ['Epizootic Ulcerative Syndrome (EUS)', 'Bacterial Hemorrhagic Septicemia', 'Tail Rot / Fin Rot', 'White Spot Disease', 'Myxosporidiosis']
  },
  singhi: {
    id: 'singhi',
    commonName: 'Singhi / Asian Stinging Catfish',
    scientificName: 'Heteropneustes fossilis',
    family: 'Heteropneustidae',
    habitat: 'Swamps, ditches, derelict water bodies and intensive tanks',
    feedingHabit: 'Carnivore',
    isAirBreathing: true, // Tubular air-sacs extending to caudal region
    parameters: {
      temp: {
        optimal: [25, 32],
        warningLow: [20, 24.9],
        warningHigh: [32.1, 35],
        criticalLow: 12,
        criticalHigh: 38,
        unit: '°C',
        parameterName: 'Water Temperature',
        sourceTitle: 'ICAR-CIFA Manual on Culture of Stinging Catfish (Singhi)',
        sourceUrl: 'http://cifa.nic.in/singhi-culture',
        lifeStage: 'Grow-out',
        conditions: 'Tropical freshwater ponds and cement cisterns',
        dateAccessed: '2026-03-01'
      },
      ph: {
        optimal: [6.8, 8.2],
        warningLow: [6.0, 6.7],
        warningHigh: [8.3, 8.8],
        criticalLow: 5.0,
        criticalHigh: 9.5,
        unit: 'pH',
        parameterName: 'pH Level',
        sourceTitle: 'ICAR-CIFA Publications',
        sourceUrl: 'http://cifa.nic.in',
        lifeStage: 'Grow-out',
        conditions: 'Freshwater swampy environments',
        dateAccessed: '2026-03-01'
      },
      oxygen: {
        optimal: [2.5, 7.0],
        warningLow: [1.0, 2.4],
        criticalLow: 0.2,
        criticalHigh: 15.0,
        unit: 'mg/L',
        parameterName: 'Dissolved Oxygen',
        sourceTitle: 'ICAR-CIFA Singhi Technical Protocol',
        sourceUrl: 'http://cifa.nic.in/singhi-culture',
        lifeStage: 'All stages',
        conditions: 'Tubular accessory respiratory lungs enable atmospheric breathing',
        dateAccessed: '2026-03-01'
      },
      ammonia: {
        optimal: [0.0, 0.08],
        warningHigh: [0.09, 0.35],
        criticalLow: 0.0,
        criticalHigh: 0.70,
        unit: 'mg/L TAN',
        parameterName: 'Total Ammonia Nitrogen (TAN)',
        sourceTitle: 'Boyd, C. E. (2020)',
        sourceUrl: 'https://www.sciencedirect.com/book/9780128169308/water-quality',
        lifeStage: 'Grow-out',
        conditions: 'Meat and trash fish supplementary feed management',
        dateAccessed: '2026-03-01'
      },
      nitrite: {
        optimal: [0.0, 0.2],
        warningHigh: [0.21, 0.50],
        criticalLow: 0.0,
        criticalHigh: 1.0,
        unit: 'mg/L NO2-N',
        parameterName: 'Nitrite-Nitrogen',
        sourceTitle: 'ICAR-CIFA Guidelines',
        sourceUrl: 'http://cifa.nic.in',
        lifeStage: 'Grow-out',
        conditions: 'High stocking densities',
        dateAccessed: '2026-03-01'
      },
      salinity: {
        optimal: [0.0, 2.0],
        warningHigh: [2.1, 4.0],
        criticalLow: 0.0,
        criticalHigh: 6.0,
        unit: 'ppt',
        parameterName: 'Salinity',
        sourceTitle: 'ICAR-CIFA Singhi Protocol',
        sourceUrl: 'http://cifa.nic.in',
        lifeStage: 'Grow-out',
        conditions: 'Freshwater only',
        dateAccessed: '2026-03-01'
      }
    },
    commonDiseases: ['EUS (Epizootic Ulcerative Syndrome)', 'Ulcerative Septicemia', 'Edwardsiellosis', 'Fin Rot', 'Ichthyophthiriasis']
  },
  scampi: {
    id: 'scampi',
    commonName: 'Giant Freshwater Prawn / Scampi',
    scientificName: 'Macrobrachium rosenbergii',
    family: 'Palaemonidae',
    habitat: 'Tropical benthic crustacean in polyculture or monoculture',
    feedingHabit: 'Bottom Feeder',
    isAirBreathing: false,
    provisionalCoverage: true,
    coverageNotes: 'Provisional reference coverage: freshwater grow-out phase only (larval phase requires 10-14 ppt brackish water for metamorphosis). Strictly monitored for molting hypoxia sensitivity.',
    parameters: {
      temp: {
        optimal: [28, 31],
        warningLow: [24, 27.9],
        warningHigh: [31.1, 33],
        criticalLow: 18,
        criticalHigh: 35,
        unit: '°C',
        parameterName: 'Water Temperature',
        sourceTitle: 'FAO Fisheries Technical Paper 428: Farming Freshwater Prawns (New & Valenti, 2000)',
        sourceUrl: 'https://www.fao.org/3/y4100e/y4100e00.htm',
        lifeStage: 'Juvenile to Grow-out',
        conditions: 'Tropical freshwater grow-out ponds; feeding drops under 24°C',
        dateAccessed: '2026-03-01'
      },
      ph: {
        optimal: [7.5, 8.5],
        warningLow: [7.0, 7.4],
        warningHigh: [8.6, 9.0],
        criticalLow: 6.5, // Low pH causes soft shell and exoskeleton dissolution
        criticalHigh: 9.5,
        unit: 'pH',
        parameterName: 'pH Level',
        sourceTitle: 'MPEDA Handbook on Scampi Farming in India',
        sourceUrl: 'https://mpeda.gov.in',
        lifeStage: 'Grow-out',
        conditions: 'Requires alkalinity > 80 mg/L CaCO3 for exoskeleton hardening',
        dateAccessed: '2026-03-01'
      },
      oxygen: {
        optimal: [5.0, 8.0],
        warningLow: [3.5, 4.9],
        criticalLow: 2.0, // High mortality during post-molt ecdysis
        criticalHigh: 14.0,
        unit: 'mg/L',
        parameterName: 'Dissolved Oxygen',
        sourceTitle: 'FAO Fisheries Technical Paper 428',
        sourceUrl: 'https://www.fao.org/3/y4100e/y4100e00.htm',
        lifeStage: 'All benthic stages',
        conditions: 'Benthic requirement: Prawns cannot swim to oxygen-rich surface layers easily',
        dateAccessed: '2026-03-01'
      },
      ammonia: {
        optimal: [0.0, 0.03],
        warningHigh: [0.04, 0.10],
        criticalLow: 0.0,
        criticalHigh: 0.30,
        unit: 'mg/L TAN',
        parameterName: 'Total Ammonia Nitrogen (TAN)',
        sourceTitle: 'Boyd, C. E. (2020)',
        sourceUrl: 'https://www.sciencedirect.com/book/9780128169308/water-quality',
        lifeStage: 'Grow-out',
        conditions: 'Decapods are extremely susceptible to free ammonia toxicity at high pH',
        dateAccessed: '2026-03-01'
      },
      nitrite: {
        optimal: [0.0, 0.05],
        warningHigh: [0.06, 0.15],
        criticalLow: 0.0,
        criticalHigh: 0.35,
        unit: 'mg/L NO2-N',
        parameterName: 'Nitrite-Nitrogen',
        sourceTitle: 'FAO Technical Paper 428',
        sourceUrl: 'https://www.fao.org/3/y4100e/y4100e00.htm',
        lifeStage: 'Grow-out',
        conditions: 'Disrupts hemolymph copper protein binding',
        dateAccessed: '2026-03-01'
      },
      salinity: {
        optimal: [0.0, 5.0],
        warningHigh: [5.1, 10.0],
        criticalLow: 0.0,
        criticalHigh: 15.0,
        unit: 'ppt',
        parameterName: 'Salinity',
        sourceTitle: 'MPEDA Scampi Guidelines',
        sourceUrl: 'https://mpeda.gov.in',
        lifeStage: 'Grow-out (strictly post-larval)',
        conditions: 'Adult grow-out tolerates 0-10 ppt oligohaline water',
        dateAccessed: '2026-03-01'
      }
    },
    commonDiseases: ['White Spot Syndrome Virus (WSSV - carrier)', 'White Muscle Disease (Macrobrachium nodavirus)', 'Black Spot / Shell Disease (Vibrio)', 'Branchiomyces', 'Idiophatic Muscle Necrosis']
  }
};

export const ALL_SPECIES_LIST = Object.values(SPECIES_CATALOG);

