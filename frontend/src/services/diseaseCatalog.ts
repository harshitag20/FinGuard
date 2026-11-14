/**
 * FinGuard.io - Canonical Fish Disease Reference Catalogue
 * Documented clinical symptoms, environmental co-factors, Kaggle dataset mappings,
 * and evidence-based preliminary mitigations.
 *
 * NOTE: FinGuard provides preliminary screening only. Definitive diagnosis requires
 * histopathology, wet-mount microscopy, or microbiological culture by a qualified veterinarian.
 */

export interface TreatmentReference {
  reviewedBy: string;
  sourceTitle: string;
  sourceUrl: string;
  legalStatusNotice: string;
  withdrawalPeriodNotes: string;
  contraindications: string[];
  immediateNonChemicalMitigation: string[];
  veterinaryAdvisory: string;
}

export interface DiseaseReference {
  diseaseId: string;
  canonicalName: string;
  pathogenType: 'Bacterial' | 'Fungal' | 'Parasitic' | 'Viral' | 'Environmental / Non-infectious';
  causativeAgent: string;
  susceptibleSpecies: string[]; // species IDs from speciesCatalog
  kaggleDatasetLabels: string[]; // labels as they appear in Kaggle datasets
  primaryVisibleSymptoms: string[];
  behavioralSymptoms: string[];
  waterQualityRiskFactors: {
    parameter: 'temp' | 'ph' | 'oxygen' | 'ammonia' | 'nitrite';
    condition: string;
    description: string;
  }[];
  differentialDiagnoses: string[];
  confirmatoryChecks: string[];
  referenceLiterature: {
    title: string;
    publisher: string;
    year: number;
    url: string;
  }[];
  treatmentReference: TreatmentReference;
}

export const DISEASE_CATALOG: Record<string, DiseaseReference> = {
  eus: {
    diseaseId: 'eus',
    canonicalName: 'Epizootic Ulcerative Syndrome (EUS)',
    pathogenType: 'Fungal',
    causativeAgent: 'Aphanomyces invadans (Oomycete fungus) accompanied by secondary opportunistic bacteria (Aeromonas spp.)',
    susceptibleSpecies: ['rohu', 'catla', 'mrigal', 'magur', 'singhi', 'grass_carp', 'silver_carp'],
    kaggleDatasetLabels: ['Epizootic_Ulcerative_Syndrome', 'EUS', 'ulcerative_disease', 'red_spots'],
    primaryVisibleSymptoms: [
      'Early stage: small pinpoint red spots (petechiae) on body',
      'Advanced stage: deep necrotizing ulcers exposing underlying muscle tissue',
      'Erosion of scales and dark reddish necrotic crater-like lesions'
    ],
    behavioralSymptoms: [
      'Lethargy and erratic swimming near pond margins',
      'Anorexia (abrupt drop in feed consumption)',
      'Surfacing and floating listlessly near the dyke'
    ],
    waterQualityRiskFactors: [
      {
        parameter: 'temp',
        condition: 'Sudden drop to 18-24°C',
        description: 'Outbreaks correlate strongly with low winter temperatures following monsoon rainfall.'
      },
      {
        parameter: 'ph',
        condition: 'Low pH (< 6.8)',
        description: 'Acidic waters compromise fish epidermal mucus barrier, enabling fungal zoospore encystment.'
      },
      {
        parameter: 'ammonia',
        condition: 'Elevated TAN (> 0.05 mg/L)',
        description: 'Sublethal ammonia stress suppresses non-specific immune responses.'
      }
    ],
    differentialDiagnoses: ['Aeromonas Septicemia', 'Columnaris Disease', 'Severe Parasitic Ulcers'],
    confirmatoryChecks: [
      'Muscle histopathology for invasive aseptate fungal hyphae with mycotic granulomas (OIE / WOAH standard)',
      'Wet-mount microscopy of squashed ulcer margin tissue'
    ],
    referenceLiterature: [
      {
        title: 'Manual on Epizootic Ulcerative Syndrome - World Organisation for Animal Health (WOAH)',
        publisher: 'WOAH (formerly OIE)',
        year: 2021,
        url: 'https://www.woah.org'
      },
      {
        title: 'EUS Diagnostic Field Guide for Asian Freshwater Fisheries',
        publisher: 'FAO Fisheries Technical Paper',
        year: 2017,
        url: 'https://www.fao.org/fishery/en'
      }
    ],
    treatmentReference: {
      reviewedBy: 'FinGuard Aquatic Health Reference Panel (ICAR-CIFA Guidelines)',
      sourceTitle: 'ICAR-CIFA Advisory on EUS Management in Carp Aquaculture',
      sourceUrl: 'http://cifa.nic.in/publications',
      legalStatusNotice: 'No OTC antibiotic is curative for Aphanomyces hyphal infection. Antimicrobial use must be guided strictly by Registered Aquatic Veterinarian under Schedule H / State Fisheries regulations.',
      withdrawalPeriodNotes: 'Withdrawal period of 30 days mandatory before harvest for human consumption if any veterinary medication is administered.',
      contraindications: [
        'Do not apply copper sulfate in low-alkalinity ponds (toxic risk to fingerlings)',
        'Do not dump untreated dead fish into drainage canals or other ponds'
      ],
      immediateNonChemicalMitigation: [
        'Apply agricultural limestone (CaCO3) at 200-400 kg/ha to buffer acidic pond water to pH > 7.5',
        'Immediately cease fertilization and reduce daily feeding by 50% to maintain water clarity',
        'Net out and deeply bury moribund or dead fish with quicklime away from water sources',
        'Isolate the affected pond; do not share nets or exchange water with adjacent ponds'
      ],
      veterinaryAdvisory: 'Contact local Krishi Vigyan Kendra (KVK) or State Department of Fisheries for regional diagnostic confirmation.'
    }
  },

  bacterial_gill_rot: {
    diseaseId: 'bacterial_gill_rot',
    canonicalName: 'Bacterial Gill Rot / Gill Disease (BGD)',
    pathogenType: 'Bacterial',
    causativeAgent: 'Flavobacterium branchiophilum / Flavobacterium columnare',
    susceptibleSpecies: ['rohu', 'catla', 'mrigal', 'common_carp', 'silver_carp', 'grass_carp', 'nile_tilapia'],
    kaggleDatasetLabels: ['Bacterial_gill_rot', 'gill_rot', 'Gill_Disease'],
    primaryVisibleSymptoms: [
      'Pale, mottled, or grayish swollen gill filaments with heavy mucus accumulation',
      'Clubbing and fusion of secondary gill lamellae',
      'Necrosis and erosion of gill tips'
    ],
    behavioralSymptoms: [
      'Surface piping / gasping for air despite normal surface dissolved oxygen',
      'Rapid opercular (gill cover) movements and flared gills',
      'Fish congregating near pond inlets or aerator sprays'
    ],
    waterQualityRiskFactors: [
      {
        parameter: 'oxygen',
        condition: 'Depressed DO (< 3.5 mg/L)',
        description: 'Low oxygen forces excessive gill ventilation, increasing bacterial contact and irritation.'
      },
      {
        parameter: 'ammonia',
        condition: 'Elevated TAN (> 0.04 mg/L)',
        description: 'Free ammonia irritates gill epithelium, causing hyperplasia and loss of osmoregulatory capacity.'
      }
    ],
    differentialDiagnoses: ['Branchiomycosis (Fungal Gill Rot)', 'Dactylogyrus (Gill Fluke) Infestation', 'Acute Ammonia Burn'],
    confirmatoryChecks: [
      'Microscopic gill clip smear (demonstrating long, slender Gram-negative filamentous gliding bacteria)',
      'Screening for monogenean trematodes to rule out fluke co-infection'
    ],
    referenceLiterature: [
      {
        title: 'Bacterial Gill Disease in Cultured Fishes',
        publisher: 'Journal of Aquatic Animal Health',
        year: 2018,
        url: 'https://afspubs.onlinelibrary.wiley.com'
      }
    ],
    treatmentReference: {
      reviewedBy: 'FinGuard Aquatic Health Reference Panel',
      sourceTitle: 'ICAR-CIFA Standard Veterinary Practice for Bacterial Fish Diseases',
      sourceUrl: 'http://cifa.nic.in',
      legalStatusNotice: 'Chloramine-T or potassium permanganate therapeutic baths require calibrated water titration. Overdose kills fish rapidly in soft water.',
      withdrawalPeriodNotes: 'Minimum 21-day withdrawal period for food-fish ponds.',
      contraindications: [
        'Never use potassium permanganate if pond organic silt load is excessively high without prior test titration',
        'Do not treat during hot midday sun'
      ],
      immediateNonChemicalMitigation: [
        'Turn on all paddlewheel aerators or pump fresh oxygenated water immediately',
        'Perform a 20-25% water exchange with clean, well-aerated groundwater if available',
        'Stop supplemental feeding for 24-48 hours to minimize metabolic gill oxygen demand',
        'Check TAN and nitrite levels immediately using a calibrated reagent test kit'
      ],
      veterinaryAdvisory: 'If mortality exceeds 1% per day, seek immediate prescription support from a certified fisheries officer.'
    }
  },

  fin_and_tail_rot: {
    diseaseId: 'fin_and_tail_rot',
    canonicalName: 'Fin and Tail Rot',
    pathogenType: 'Bacterial',
    causativeAgent: 'Aeromonas hydrophila, Pseudomonas fluorescens, and Flavobacterium spp.',
    susceptibleSpecies: ['rohu', 'catla', 'mrigal', 'common_carp', 'nile_tilapia', 'pangasius', 'magur', 'singhi'],
    kaggleDatasetLabels: ['Tail_and_fin_rot', 'Fin_rot', 'Tail_rot', 'fin_rot'],
    primaryVisibleSymptoms: [
      'Opaque, whitish fringing along edges of caudal, dorsal, or pectoral fins',
      'Progressive fraying, splitting, and sloughing of fin rays',
      'Red inflamed fin bases with secondary bacterial hemorrhagic spots'
    ],
    behavioralSymptoms: [
      'Sluggish swimming and loss of balance',
      'Resting on pond bottom or drifting near banks',
      'Subdued response during feeding'
    ],
    waterQualityRiskFactors: [
      {
        parameter: 'ammonia',
        condition: 'Elevated TAN (> 0.06 mg/L)',
        description: 'High ammonia stresses epidermal layers and promotes bacterial proliferation.'
      },
      {
        parameter: 'ph',
        condition: 'Extreme pH (< 6.5 or > 9.0)',
        description: 'Corrosive chemical stress damages delicate fin membranes.'
      }
    ],
    differentialDiagnoses: ['Mechanical netting trauma', 'Fin nipping by aggressive fish', 'Saprolegniasis secondary to trauma'],
    confirmatoryChecks: [
      'Bacterial culture and antimicrobial sensitivity testing from fin margins',
      'Wet-mount microscopy of fin scrapes for ciliate parasites'
    ],
    referenceLiterature: [
      {
        title: 'Fish Disease: Diagnosis and Treatment (Noga, E. J.)',
        publisher: 'Wiley-Blackwell',
        year: 2010,
        url: 'https://www.wiley.com'
      }
    ],
    treatmentReference: {
      reviewedBy: 'FinGuard Aquatic Health Panel',
      sourceTitle: 'ICAR-CIFA Freshwater Aquaculture Health SOP',
      sourceUrl: 'http://cifa.nic.in',
      legalStatusNotice: 'Therapeutic interventions must comply with the Indian National Fisheries Development Board (NFDB) aquaculture pharmacopeia.',
      withdrawalPeriodNotes: 'Standard 28-day withdrawal period applies to food-fish.',
      contraindications: ['Do not use harsh chemical dips on severely stressed fingerlings'],
      immediateNonChemicalMitigation: [
        'Improve pond water exchange to reduce bacterial bio-burden',
        'Add common salt (NaCl) at 2-3 kg per 1000 liters for mild nursery tanks or 200 kg/ha in ponds to restore osmotic balance',
        'Reduce stocking density and eliminate sharp physical pond obstructions',
        'Supplement feed with Vitamin C (500 mg/kg feed) to stimulate epidermal regeneration'
      ],
      veterinaryAdvisory: 'If lesions spread into the peduncle or body muscle, systemic antibacterial feed medication may be required under veterinary direction.'
    }
  },

  white_spot_ich: {
    diseaseId: 'white_spot_ich',
    canonicalName: 'Ichthyophthiriasis (Ich / White Spot Disease)',
    pathogenType: 'Parasitic',
    causativeAgent: 'Ichthyophthirius multifiliis (Ciliate protozoan)',
    susceptibleSpecies: ['rohu', 'catla', 'mrigal', 'common_carp', 'grass_carp', 'silver_carp', 'nile_tilapia', 'pangasius'],
    kaggleDatasetLabels: ['Parasitic_diseases_Ich', 'White_spot', 'Ichthyophthirius', 'White_Spot_Disease'],
    primaryVisibleSymptoms: [
      'Distinct tiny white cysts (0.5 - 1.0 mm, like grains of salt) scattered over skin, fins, and gills',
      'Excessive mucus coating giving the fish a dull, cloudy appearance',
      'Skin sloughing in severe untreated infestations'
    ],
    behavioralSymptoms: [
      'Flashing (scratching against pond bottom, pipes, or stones to dislodge parasites)',
      'Severe agitation followed by lethargy and clumping near water surface',
      'Rapid respiratory movement due to trophonts embedded in gill lamellae'
    ],
    waterQualityRiskFactors: [
      {
        parameter: 'temp',
        condition: 'Fluctuating temperatures (18-24°C)',
        description: 'Trophont life cycle accelerates in cool-to-mild waters; immune response drops during rapid temperature swings.'
      }
    ],
    differentialDiagnoses: ['Myxobolus cyst infection', 'Epistylis infestation', 'Lymphocystis (viral cysts)'],
    confirmatoryChecks: [
      'Direct wet-mount microscopy of skin/mucus scrape showing large round ciliated trophont with characteristic horseshoe-shaped macronucleus'
    ],
    referenceLiterature: [
      {
        title: 'Ichthyophthirius multifiliis: A review of infection dynamics and control',
        publisher: 'Aquaculture Journal',
        year: 2020,
        url: 'https://sciencedirect.com'
      }
    ],
    treatmentReference: {
      reviewedBy: 'FinGuard Aquatic Health Panel',
      sourceTitle: 'ICAR-CIFA Parasitic Diseases Management',
      sourceUrl: 'http://cifa.nic.in',
      legalStatusNotice: 'Malachite green is strictly banned worldwide in food fish aquaculture due to carcinogenic properties. Never use banned substances.',
      withdrawalPeriodNotes: 'Approved salt and formalin applications have zero residual withdrawal restrictions.',
      contraindications: [
        'Banned substances: Malachite Green, nitrofurans (strictly prohibited for food fish)',
        'Formalin should never be applied when DO is below 5.0 mg/L (formalin binds free oxygen)'
      ],
      immediateNonChemicalMitigation: [
        'Maintain water temperature if in controlled tanks (> 30°C disrupts Ich life-cycle stage)',
        'Apply coarse agricultural salt bath (0.2-0.5% salinity) to dehydrate free-swimming tomites',
        'Vigorous aeration to counteract parasite-induced gill asphyxiation',
        'Drain or siphon pond bottom sediment where parasite encystment occurs'
      ],
      veterinaryAdvisory: 'Parasite trophonts embedded deep under epidermis cannot be killed by topical baths until they exit into free-swimming tomite stage. Follow veterinary multi-day treatment schedule.'
    }
  },

  saprolegniasis: {
    diseaseId: 'saprolegniasis',
    canonicalName: 'Saprolegniasis (Cotton Wool Disease)',
    pathogenType: 'Fungal',
    causativeAgent: 'Saprolegnia parasitica and related Saprolegniales (water molds)',
    susceptibleSpecies: ['rohu', 'catla', 'mrigal', 'common_carp', 'grass_carp', 'nile_tilapia', 'pangasius'],
    kaggleDatasetLabels: ['Fungal_infections_Saprolegniasis', 'Saprolegnia', 'cotton_wool_disease'],
    primaryVisibleSymptoms: [
      'Cotton-like white, grayish, or brownish tufts of fungal hyphae growing on skin, fins, eyes, or gills',
      'Lesions usually start at site of physical injury, scale loss, or unhealed ulcers'
    ],
    behavioralSymptoms: [
      'Sluggish swimming, isolation in quiet pond shallows',
      'Blindness if hyphae cover corneal eye surfaces'
    ],
    waterQualityRiskFactors: [
      {
        parameter: 'temp',
        condition: 'Cold water (< 20°C)',
        description: 'Saprolegnia thrives in cold temperatures when fish antibody production slows.'
      }
    ],
    differentialDiagnoses: ['Columnaris (False Fungus / Cotton Mouth)', 'Epistylis (Ciliate Protozoan)'],
    confirmatoryChecks: ['Microscopic examination of hyphal tufts showing branched aseptate hyphae with terminal zoosporangia'],
    referenceLiterature: [
      {
        title: 'Fungal Diseases of Fish - Saprolegnia Infections',
        publisher: 'Aquaculture Health Review',
        year: 2019,
        url: 'https://sciencedirect.com'
      }
    ],
    treatmentReference: {
      reviewedBy: 'FinGuard Health Panel',
      sourceTitle: 'ICAR-CIFA Advisory',
      sourceUrl: 'http://cifa.nic.in',
      legalStatusNotice: 'Hydrogen peroxide and sodium chloride are preferred environmentally safe remedies.',
      withdrawalPeriodNotes: 'No food withdrawal period required for salt treatments.',
      contraindications: ['Avoid harsh chemicals on broodstock without veterinary oversight'],
      immediateNonChemicalMitigation: [
        'Avoid handling and netting during cold winter mornings to prevent scale damage',
        'Salt bath at 1-3% for 5-10 minutes under supervision in dip tanks',
        'Improve pond sanitation and remove decayed organic material where saprophytes multiply'
      ],
      veterinaryAdvisory: 'Address underlying primary cause (handling injury, cold shock, or parasitic scratches) that enabled fungal colonization.'
    }
  },

  healthy_fish: {
    diseaseId: 'healthy_fish',
    canonicalName: 'Healthy Baseline / No Pathological Lesions Detected',
    pathogenType: 'Environmental / Non-infectious',
    causativeAgent: 'None (Normal Physiology)',
    susceptibleSpecies: ['rohu', 'catla', 'mrigal', 'common_carp', 'grass_carp', 'silver_carp', 'nile_tilapia', 'pangasius', 'magur', 'singhi', 'scampi'],
    kaggleDatasetLabels: ['Healthy_Fish', 'healthy', 'Normal'],
    primaryVisibleSymptoms: [
      'Clean, intact epidermis with regular glistening scale coverage',
      'Clear bright eyes without cloudiness or protrusion',
      'Intact, transparent fins without fraying or hemorrhages',
      'Bright red, clean gill lamellae free of excess mucus'
    ],
    behavioralSymptoms: [
      'Active schooling and schooling response to feeding',
      'Normal swimming posture with quick startle reflexes'
    ],
    waterQualityRiskFactors: [],
    differentialDiagnoses: ['Subclinical or early incubation phase of infection'],
    confirmatoryChecks: ['Routine water quality testing and prophylactic health checks'],
    referenceLiterature: [
      {
        title: 'Standard Guidelines for Health Monitoring in Aquaculture',
        publisher: 'ICAR-CIFA',
        year: 2022,
        url: 'http://cifa.nic.in'
      }
    ],
    treatmentReference: {
      reviewedBy: 'FinGuard Preventive Health Panel',
      sourceTitle: 'Best Management Practices (BMP) for Carp Aquaculture',
      sourceUrl: 'http://cifa.nic.in',
      legalStatusNotice: 'No medications required or recommended. Prophylactic antibiotic use is contraindicated.',
      withdrawalPeriodNotes: 'Not applicable.',
      contraindications: ['Do not administer prophylactic antibiotics to healthy fish stocks'],
      immediateNonChemicalMitigation: [
        'Maintain regular feeding schedules with nutritionally balanced feed',
        'Continue monitoring dissolved oxygen morning and evening',
        'Inspect pond dykes and water inlet screens for pest entry'
      ],
      veterinaryAdvisory: 'Maintain biosecurity protocols and test water quality periodically.'
    }
  }
};

export const ALL_DISEASES_LIST = Object.values(DISEASE_CATALOG);

