/**
 * Traffic Light Monitoring Utilities & Hierarchical Educational Data
 * Traffic Light Scale (FRS / MoE Monitoring Standard):
 * - 100%: Green
 * - 90% - 99%: Light Green
 * - 80% - 89%: Yellow
 * - 70% - 79%: Amber
 * - 50% - 69%: Light Red
 * - < 50%: Red
 */

export interface TrafficLightColorInfo {
  bg: string;
  lightBg: string;
  border: string;
  textColor: string;
  badgeColor: string;
  label: string;
  band: '100%' | '90-99%' | '80-89%' | '70-79%' | '50-69%' | '<50%';
  icon: string;
}

export function getTrafficLight(progressPct: number): TrafficLightColorInfo {
  const pct = Math.round(progressPct);

  if (pct >= 100) {
    return {
      bg: '#16A34A', // Green
      lightBg: 'rgba(22, 163, 74, 0.12)',
      border: '#15803D',
      textColor: '#FFFFFF',
      badgeColor: '#166534',
      label: '100% Target Achieved',
      band: '100%',
      icon: '🟢',
    };
  }
  if (pct >= 90) {
    return {
      bg: '#22C55E', // Light Green
      lightBg: 'rgba(34, 197, 94, 0.14)',
      border: '#16A34A',
      textColor: '#FFFFFF',
      badgeColor: '#15803D',
      label: '90-99% High Progress',
      band: '90-99%',
      icon: '🟢',
    };
  }
  if (pct >= 80) {
    return {
      bg: '#EAB308', // Yellow (Gold)
      lightBg: 'rgba(234, 179, 8, 0.16)',
      border: '#CA8A04',
      textColor: '#FFFFFF',
      badgeColor: '#854D0E',
      label: '80-89% Satisfactory',
      band: '80-89%',
      icon: '🟡',
    };
  }
  if (pct >= 70) {
    return {
      bg: '#EA580C', // Orange
      lightBg: 'rgba(234, 88, 12, 0.16)',
      border: '#C2410C',
      textColor: '#FFFFFF',
      badgeColor: '#9A3412',
      label: '70-79% Attention Needed',
      band: '70-79%',
      icon: '🟠',
    };
  }
  if (pct >= 50) {
    return {
      bg: '#854D0E', // Brown
      lightBg: 'rgba(133, 77, 14, 0.16)',
      border: '#78350F',
      textColor: '#FFFFFF',
      badgeColor: '#78350F',
      label: '50-69% Underperforming',
      band: '50-69%',
      icon: '🟤',
    };
  }
  return {
    bg: '#80142B', // Maroon
    lightBg: 'rgba(128, 20, 43, 0.16)',
    border: '#5C0F20',
    textColor: '#FFFFFF',
    badgeColor: '#5C0F20',
    label: '< 50% Critical Deficit',
    band: '<50%',
    icon: '🔴',
  };
}

// ─────────────────────────────────────────────────────────────
// HIERARCHICAL PROVINCIAL MONITORING DATA
// ─────────────────────────────────────────────────────────────

export interface StalledIssue {
  id: string;
  title: string;
  type: 'Procurement' | 'Field Non-Compliance' | 'Curriculum Delay' | 'Infrastructure' | 'Staffing';
  severity: 'Critical' | 'High' | 'Medium';
  rootCause: string;
  correctiveAction: string;
  responsibleOfficer: string;
  daysDelayed: number;
  voteNumber?: string;
}

export interface DivisionMonitoringData {
  id: string;
  name: string;
  code: string;
  progressPct: number;
  budgetAllocatedMn: number;
  budgetSpentMn: number;
  activeSchoolsCount: number;
  issues: StalledIssue[];
}

export interface ZoneMonitoringData {
  id: string;
  name: string;
  code: string;
  progressPct: number;
  budgetAllocatedMn: number;
  budgetSpentMn: number;
  divisionsCount: number;
  divisions: DivisionMonitoringData[];
}

export interface ProvinceMonitoringData {
  id: string;
  name: string;
  code: string;
  capital: string;
  pin: [number, number]; // [x, y] in SVG coordinates (viewBox 0 0 240 360)
  progressPct: number;
  budgetAllocatedMn: number;
  budgetSpentMn: number;
  activitiesCount: number;
  workshopsCount: number;
  directorName: string;
  keyInitiative: string;
  zones: ZoneMonitoringData[];
}

export const SRI_LANKA_MONITORING_PROVINCES: ProvinceMonitoringData[] = [
  {
    id: 'org-prov-western',
    name: 'Western Province',
    code: 'WP',
    capital: 'Colombo',
    pin: [68, 246],
    progressPct: 100, // 🟢 100% Green
    budgetAllocatedMn: 680.0,
    budgetSpentMn: 678.5,
    activitiesCount: 45,
    workshopsCount: 21,
    directorName: 'S.K. Wijesinghe',
    keyInitiative: 'Smart Interactive Board Deployment & High-Density School Congestion Reduction',
    zones: [
      {
        id: 'org-zone-colombo',
        name: 'Colombo Zone',
        code: 'COL',
        progressPct: 100,
        budgetAllocatedMn: 280.0,
        budgetSpentMn: 280.0,
        divisionsCount: 4,
        divisions: [
          {
            id: 'org-div-col-central',
            name: 'Colombo Central Division',
            code: 'DIV-COL-C',
            progressPct: 100,
            budgetAllocatedMn: 85.0,
            budgetSpentMn: 85.0,
            activeSchoolsCount: 28,
            issues: [],
          },
          {
            id: 'org-div-col-south',
            name: 'Colombo South Division',
            code: 'DIV-COL-S',
            progressPct: 100,
            budgetAllocatedMn: 95.0,
            budgetSpentMn: 95.0,
            activeSchoolsCount: 32,
            issues: [],
          },
        ],
      },
      {
        id: 'org-zone-gampaha',
        name: 'Gampaha Zone',
        code: 'GAM',
        progressPct: 100,
        budgetAllocatedMn: 220.0,
        budgetSpentMn: 219.0,
        divisionsCount: 4,
        divisions: [
          {
            id: 'org-div-gam-urban',
            name: 'Gampaha Urban Division',
            code: 'DIV-GAM-U',
            progressPct: 100,
            budgetAllocatedMn: 110.0,
            budgetSpentMn: 110.0,
            activeSchoolsCount: 26,
            issues: [],
          },
        ],
      },
      {
        id: 'org-zone-kalutara',
        name: 'Kalutara Zone',
        code: 'KAL',
        progressPct: 100,
        budgetAllocatedMn: 180.0,
        budgetSpentMn: 179.5,
        divisionsCount: 3,
        divisions: [
          {
            id: 'org-div-kal-coastal',
            name: 'Kalutara Coastal Division',
            code: 'DIV-KAL-C',
            progressPct: 100,
            budgetAllocatedMn: 90.0,
            budgetSpentMn: 89.5,
            activeSchoolsCount: 24,
            issues: [],
          },
        ],
      },
    ],
  },
  {
    id: 'org-prov-central',
    name: 'Central Province',
    code: 'CP',
    capital: 'Kandy',
    pin: [116, 196],
    progressPct: 92, // 🟢 90-99% Light Green
    budgetAllocatedMn: 420.8,
    budgetSpentMn: 388.5,
    activitiesCount: 31,
    workshopsCount: 14,
    directorName: 'M.B. Ekanayake',
    keyInitiative: 'Estate Primary School Reinforcement & Multilingual Learning Labs',
    zones: [
      {
        id: 'org-zone-kandy',
        name: 'Kandy Zone',
        code: 'KAN',
        progressPct: 96,
        budgetAllocatedMn: 190.0,
        budgetSpentMn: 184.0,
        divisionsCount: 4,
        divisions: [
          {
            id: 'org-div-kandy-gravets',
            name: 'Kandy Gravets Division',
            code: 'DIV-KAN-G',
            progressPct: 98,
            budgetAllocatedMn: 95.0,
            budgetSpentMn: 94.0,
            activeSchoolsCount: 30,
            issues: [],
          },
        ],
      },
      {
        id: 'org-zone-matale',
        name: 'Matale Zone',
        code: 'MAT',
        progressPct: 91,
        budgetAllocatedMn: 130.0,
        budgetSpentMn: 120.0,
        divisionsCount: 3,
        divisions: [
          {
            id: 'org-div-matale-north',
            name: 'Matale North Division',
            code: 'DIV-MAT-N',
            progressPct: 92,
            budgetAllocatedMn: 65.0,
            budgetSpentMn: 61.0,
            activeSchoolsCount: 22,
            issues: [],
          },
        ],
      },
      {
        id: 'org-zone-nuwara-eliya',
        name: 'Nuwara Eliya Zone',
        code: 'NE',
        progressPct: 88,
        budgetAllocatedMn: 100.8,
        budgetSpentMn: 84.5,
        divisionsCount: 3,
        divisions: [
          {
            id: 'org-div-ne-estate',
            name: 'Nuwara Eliya Plantation Division',
            code: 'DIV-NE-P',
            progressPct: 85,
            budgetAllocatedMn: 55.0,
            budgetSpentMn: 46.5,
            activeSchoolsCount: 27,
            issues: [
              {
                id: 'iss-ne-01',
                title: 'Highland Road Access Delay for STEM Mobile Kits',
                type: 'Field Non-Compliance',
                severity: 'Medium',
                rootCause: 'Heavy rainfall blocked transport route to 6 estate schools.',
                correctiveAction: 'Reschedule delivery via Zonal 4WD utility fleet by 18 Nov.',
                responsibleOfficer: 'Zonal Transport Coordinator',
                daysDelayed: 12,
              },
            ],
          },
        ],
      },
    ],
  },
  {
    id: 'org-prov-southern',
    name: 'Southern Province',
    code: 'SP',
    capital: 'Galle',
    pin: [98, 308],
    progressPct: 84, // 🟡 80-89% Yellow
    budgetAllocatedMn: 385.0,
    budgetSpentMn: 328.0,
    activitiesCount: 26,
    workshopsCount: 11,
    directorName: 'N.L. Fernando',
    keyInitiative: 'Coastal Marine Ecology Labs & In-Service Teacher ICT Pedagogy',
    zones: [
      {
        id: 'org-zone-matara',
        name: 'Matara Zone',
        code: 'MTR',
        progressPct: 94,
        budgetAllocatedMn: 135.0,
        budgetSpentMn: 128.0,
        divisionsCount: 3,
        divisions: [
          {
            id: 'org-div-matara-gravets',
            name: 'Matara Four Gravets Division',
            code: 'DIV-MTR-FG',
            progressPct: 96,
            budgetAllocatedMn: 75.0,
            budgetSpentMn: 72.0,
            activeSchoolsCount: 24,
            issues: [],
          },
        ],
      },
      {
        id: 'org-zone-galle',
        name: 'Galle Zone',
        code: 'GAL',
        progressPct: 82,
        budgetAllocatedMn: 150.0,
        budgetSpentMn: 124.0,
        divisionsCount: 4,
        divisions: [
          {
            id: 'org-div-galle-galle',
            name: 'Galle Four Gravets Division',
            code: 'DIV-GAL-G',
            progressPct: 80,
            budgetAllocatedMn: 60.0,
            budgetSpentMn: 48.0,
            activeSchoolsCount: 28,
            issues: [
              {
                id: 'iss-gal-01',
                title: 'Interactive Smart Board Firmware Compatibility Lag',
                type: 'Curriculum Delay',
                severity: 'Medium',
                rootCause: 'CRC technical team awaiting updated national OS image.',
                correctiveAction: 'Flash updated image via ICT Division repository this week.',
                responsibleOfficer: 'Galle Zonal ICT Director',
                daysDelayed: 9,
                voteNumber: '126-02-03-2502',
              },
            ],
          },
          {
            id: 'org-div-galle-habaraduwa',
            name: 'Habaraduwa Division',
            code: 'DIV-GAL-H',
            progressPct: 84,
            budgetAllocatedMn: 45.0,
            budgetSpentMn: 38.0,
            activeSchoolsCount: 19,
            issues: [],
          },
        ],
      },
      {
        id: 'org-zone-tangalle',
        name: 'Tangalle Zone',
        code: 'TAN',
        progressPct: 76,
        budgetAllocatedMn: 100.0,
        budgetSpentMn: 76.0,
        divisionsCount: 2,
        divisions: [
          {
            id: 'org-div-tangalle-coastal',
            name: 'Tangalle Coastal Division',
            code: 'DIV-TAN-C',
            progressPct: 74,
            budgetAllocatedMn: 55.0,
            budgetSpentMn: 40.5,
            activeSchoolsCount: 18,
            issues: [
              {
                id: 'iss-tan-01',
                title: 'Marine Science Lab Aquarium Civil Works Stalled',
                type: 'Infrastructure',
                severity: 'High',
                rootCause: 'Contractor delayed glass panel reinforcement procurement.',
                correctiveAction: 'Issue liquidated damages notice; expedited delivery by 25 Nov.',
                responsibleOfficer: 'Provincial Infrastructure Engineer',
                daysDelayed: 21,
                voteNumber: '126-03-03-2502',
              },
            ],
          },
        ],
      },
    ],
  },
  {
    id: 'org-prov-north-central',
    name: 'North Central Province',
    code: 'NC',
    capital: 'Anuradhapura',
    pin: [115, 122],
    progressPct: 78, // 🟠 70-79% Amber
    budgetAllocatedMn: 298.0,
    budgetSpentMn: 232.0,
    activitiesCount: 20,
    workshopsCount: 7,
    directorName: 'K.G. Jayasundara',
    keyInitiative: 'Rural Smart Classroom Activations & Solar-Powered Distance Learning',
    zones: [
      {
        id: 'org-zone-anuradhapura',
        name: 'Anuradhapura Zone',
        code: 'ANU',
        progressPct: 82,
        budgetAllocatedMn: 170.0,
        budgetSpentMn: 139.0,
        divisionsCount: 3,
        divisions: [
          {
            id: 'org-div-anu-central',
            name: 'Nuwaragam Palatha Division',
            code: 'DIV-ANU-NP',
            progressPct: 84,
            budgetAllocatedMn: 85.0,
            budgetSpentMn: 71.0,
            activeSchoolsCount: 25,
            issues: [],
          },
        ],
      },
      {
        id: 'org-zone-polonnaruwa',
        name: 'Polonnaruwa Zone',
        code: 'POL',
        progressPct: 72,
        budgetAllocatedMn: 128.0,
        budgetSpentMn: 93.0,
        divisionsCount: 3,
        divisions: [
          {
            id: 'org-div-pol-thamankaduwa',
            name: 'Thamankaduwa Division',
            code: 'DIV-POL-T',
            progressPct: 70,
            budgetAllocatedMn: 64.0,
            budgetSpentMn: 44.8,
            activeSchoolsCount: 22,
            issues: [
              {
                id: 'iss-pol-01',
                title: 'Solar Inverter Import Clearance Bottleneck',
                type: 'Procurement',
                severity: 'High',
                rootCause: 'Port customs clearance clearance documents required Ministry exemption letter.',
                correctiveAction: 'Ministry Secretary signed customs clearance exemption on 11 Nov.',
                responsibleOfficer: 'Provincial Planning Deputy Director',
                daysDelayed: 26,
                voteNumber: '126-03-07-2502',
              },
            ],
          },
        ],
      },
    ],
  },
  {
    id: 'org-prov-north-western',
    name: 'North Western Province',
    code: 'NW',
    capital: 'Kurunegala',
    pin: [72, 172],
    progressPct: 74, // 🟠 70-79% Amber
    budgetAllocatedMn: 310.2,
    budgetSpentMn: 229.5,
    activitiesCount: 22,
    workshopsCount: 9,
    directorName: 'P.D. Senaratne',
    keyInitiative: 'Vocational Skills Stream Alignment & Modern Agro-Science Units',
    zones: [
      {
        id: 'org-zone-kurunegala',
        name: 'Kurunegala Zone',
        code: 'KUR',
        progressPct: 78,
        budgetAllocatedMn: 180.0,
        budgetSpentMn: 140.0,
        divisionsCount: 4,
        divisions: [
          {
            id: 'org-div-kur-town',
            name: 'Kurunegala Town Division',
            code: 'DIV-KUR-T',
            progressPct: 80,
            budgetAllocatedMn: 90.0,
            budgetSpentMn: 72.0,
            activeSchoolsCount: 29,
            issues: [],
          },
        ],
      },
      {
        id: 'org-zone-kuliyapitiya',
        name: 'Kuliyapitiya Zone',
        code: 'KUL',
        progressPct: 69,
        budgetAllocatedMn: 130.2,
        budgetSpentMn: 89.5,
        divisionsCount: 3,
        divisions: [
          {
            id: 'org-div-kul-west',
            name: 'Kuliyapitiya West Division',
            code: 'DIV-KUL-W',
            progressPct: 66,
            budgetAllocatedMn: 68.0,
            budgetSpentMn: 44.8,
            activeSchoolsCount: 23,
            issues: [
              {
                id: 'iss-kul-01',
                title: 'Vocational Stream CNC Machinery Installation Delayed',
                type: 'Procurement',
                severity: 'High',
                rootCause: 'Supplier technician unavailable for 3-phase wiring certification.',
                correctiveAction: 'CEB certified electrical supply on 12 Nov; installation resumes.',
                responsibleOfficer: 'Zonal Technical Education Officer',
                daysDelayed: 18,
                voteNumber: '126-03-06-2502',
              },
            ],
          },
        ],
      },
    ],
  },
  {
    id: 'org-prov-northern',
    name: 'Northern Province',
    code: 'NP',
    capital: 'Jaffna',
    pin: [110, 52],
    progressPct: 62, // 🔴 50-69% Light Red
    budgetAllocatedMn: 245.5,
    budgetSpentMn: 152.0,
    activitiesCount: 18,
    workshopsCount: 7,
    directorName: 'T. Ravichandran',
    keyInitiative: 'Special Education Resource Center & A/L Science Laboratory Rehabilitation',
    zones: [
      {
        id: 'org-zone-jaffna',
        name: 'Jaffna Zone',
        code: 'JAF',
        progressPct: 70,
        budgetAllocatedMn: 135.0,
        budgetSpentMn: 94.5,
        divisionsCount: 3,
        divisions: [
          {
            id: 'org-div-jaffna-central',
            name: 'Jaffna Division',
            code: 'DIV-JAF-C',
            progressPct: 72,
            budgetAllocatedMn: 70.0,
            budgetSpentMn: 50.4,
            activeSchoolsCount: 24,
            issues: [],
          },
        ],
      },
      {
        id: 'org-zone-kilinochchi',
        name: 'Kilinochchi Zone',
        code: 'KIL',
        progressPct: 53,
        budgetAllocatedMn: 110.5,
        budgetSpentMn: 57.5,
        divisionsCount: 2,
        divisions: [
          {
            id: 'org-div-kil-karachchi',
            name: 'Karachchi Division',
            code: 'DIV-KIL-K',
            progressPct: 51,
            budgetAllocatedMn: 60.5,
            budgetSpentMn: 30.8,
            activeSchoolsCount: 19,
            issues: [
              {
                id: 'iss-kil-01',
                title: 'Treated Timber Scarcity for Science Bench Framing',
                type: 'Infrastructure',
                severity: 'Critical',
                rootCause: 'State Timber Corporation quota exhaustion in northern regional depot.',
                correctiveAction: 'Emergency re-allocation approved from Anuradhapura central depot.',
                responsibleOfficer: 'Provincial Building Engineer',
                daysDelayed: 34,
                voteNumber: '126-03-04-2502',
              },
            ],
          },
        ],
      },
    ],
  },
  {
    id: 'org-prov-eastern',
    name: 'Eastern Province',
    code: 'EP',
    capital: 'Trincomalee',
    pin: [158, 172],
    progressPct: 56, // 🔴 50-69% Light Red
    budgetAllocatedMn: 228.4,
    budgetSpentMn: 127.9,
    activitiesCount: 16,
    workshopsCount: 6,
    directorName: 'A.M. Mansoor',
    keyInitiative: 'Tri-Lingual Cohesion Modules & Vulnerable Student Retention Clinics',
    zones: [
      {
        id: 'org-zone-batticaloa',
        name: 'Batticaloa Zone',
        code: 'BAT',
        progressPct: 61,
        budgetAllocatedMn: 120.0,
        budgetSpentMn: 73.2,
        divisionsCount: 3,
        divisions: [
          {
            id: 'org-div-bat-manmunai',
            name: 'Manmunai North Division',
            code: 'DIV-BAT-MN',
            progressPct: 63,
            budgetAllocatedMn: 65.0,
            budgetSpentMn: 40.9,
            activeSchoolsCount: 22,
            issues: [],
          },
        ],
      },
      {
        id: 'org-zone-ampara',
        name: 'Ampara Zone',
        code: 'AMP',
        progressPct: 51,
        budgetAllocatedMn: 108.4,
        budgetSpentMn: 54.7,
        divisionsCount: 2,
        divisions: [
          {
            id: 'org-div-amp-urban',
            name: 'Ampara Urban Division',
            code: 'DIV-AMP-U',
            progressPct: 49,
            budgetAllocatedMn: 58.4,
            budgetSpentMn: 28.6,
            activeSchoolsCount: 20,
            issues: [
              {
                id: 'iss-amp-01',
                title: 'Bilingual Textbook Shipment Logistics Disruption',
                type: 'Curriculum Delay',
                severity: 'High',
                rootCause: 'Educational Publications Department delivery lorry breakdown.',
                correctiveAction: 'Contracted secondary courier; remaining 4,500 packs arriving Monday.',
                responsibleOfficer: 'Zonal Textbook Coordinator',
                daysDelayed: 23,
                voteNumber: '126-03-05-2104',
              },
            ],
          },
        ],
      },
    ],
  },
  {
    id: 'org-prov-sabaragamuwa',
    name: 'Sabaragamuwa Province',
    code: 'SAB',
    capital: 'Ratnapura',
    pin: [102, 256],
    progressPct: 48, // 🔴 < 50% Red
    budgetAllocatedMn: 185.0,
    budgetSpentMn: 88.8,
    activitiesCount: 14,
    workshopsCount: 5,
    directorName: 'P.A. Ratnayake',
    keyInitiative: 'Primary School Structural Slope Retrofitting & Creative Arts Education',
    zones: [
      {
        id: 'org-zone-ratnapura',
        name: 'Ratnapura Zone',
        code: 'RAT',
        progressPct: 54,
        budgetAllocatedMn: 105.0,
        budgetSpentMn: 56.7,
        divisionsCount: 3,
        divisions: [
          {
            id: 'org-div-rat-kuruwita',
            name: 'Kuruwita Division',
            code: 'DIV-RAT-K',
            progressPct: 56,
            budgetAllocatedMn: 55.0,
            budgetSpentMn: 30.8,
            activeSchoolsCount: 21,
            issues: [],
          },
        ],
      },
      {
        id: 'org-zone-kegalle',
        name: 'Kegalle Zone',
        code: 'KEG',
        progressPct: 42,
        budgetAllocatedMn: 80.0,
        budgetSpentMn: 32.1,
        divisionsCount: 2,
        divisions: [
          {
            id: 'org-div-keg-mawanella',
            name: 'Mawanella Division',
            code: 'DIV-KEG-M',
            progressPct: 39,
            budgetAllocatedMn: 45.0,
            budgetSpentMn: 17.5,
            activeSchoolsCount: 19,
            issues: [
              {
                id: 'iss-keg-01',
                title: 'Monsoon Landslide Risk Halts Classroom Foundation Excavation',
                type: 'Infrastructure',
                severity: 'Critical',
                rootCause: 'National Building Research Organisation (NBRO) safety exclusion zone enforced.',
                correctiveAction: 'Site relocated 200m uphill to certified geologically stable terrace.',
                responsibleOfficer: 'Provincial Structural Engineer',
                daysDelayed: 45,
                voteNumber: '126-03-09-2502',
              },
              {
                id: 'iss-keg-02',
                title: 'Auditor Discrepancy in Retaining Wall Cement Batch Test',
                type: 'Field Non-Compliance',
                severity: 'High',
                rootCause: 'Compressive strength report from university lab delayed.',
                correctiveAction: 'Expedited test certified 28MPa; NBRO clearance issued.',
                responsibleOfficer: 'Senior QA Inspector',
                daysDelayed: 19,
              },
            ],
          },
        ],
      },
    ],
  },
  {
    id: 'org-prov-uva',
    name: 'Uva Province',
    code: 'UVA',
    capital: 'Badulla',
    pin: [142, 242],
    progressPct: 44, // 🔴 < 50% Red
    budgetAllocatedMn: 162.5,
    budgetSpentMn: 71.5,
    activitiesCount: 11,
    workshopsCount: 4,
    directorName: 'W.M. Dharmadasa',
    keyInitiative: 'Plantation Teacher Retention Incentives & Remote Estate Mobile Packs',
    zones: [
      {
        id: 'org-zone-badulla',
        name: 'Badulla Zone',
        code: 'BAD',
        progressPct: 52,
        budgetAllocatedMn: 95.0,
        budgetSpentMn: 49.4,
        divisionsCount: 3,
        divisions: [
          {
            id: 'org-div-bad-hali-ela',
            name: 'Hali-Ela Division',
            code: 'DIV-BAD-HE',
            progressPct: 54,
            budgetAllocatedMn: 50.0,
            budgetSpentMn: 27.0,
            activeSchoolsCount: 22,
            issues: [],
          },
        ],
      },
      {
        id: 'org-zone-monaragala',
        name: 'Monaragala Zone',
        code: 'MON',
        progressPct: 36,
        budgetAllocatedMn: 67.5,
        budgetSpentMn: 22.1,
        divisionsCount: 2,
        divisions: [
          {
            id: 'org-div-mon-wellawaya',
            name: 'Wellawaya Division',
            code: 'DIV-MON-W',
            progressPct: 33,
            budgetAllocatedMn: 38.5,
            budgetSpentMn: 12.7,
            activeSchoolsCount: 18,
            issues: [
              {
                id: 'iss-mon-01',
                title: 'High Remote Teacher Vacancy & Late CPD Workshop Registration',
                type: 'Staffing',
                severity: 'Critical',
                rootCause: 'Transfers to urban centers left 32 rural school vacancies.',
                correctiveAction: 'Recruited 28 graduate trainee teachers on contract via Governor approval.',
                responsibleOfficer: 'Zonal HR Deputy Director',
                daysDelayed: 40,
                voteNumber: '126-03-08-2104',
              },
              {
                id: 'iss-mon-02',
                title: 'Treasury Disbursement Voucher Processing Delay',
                type: 'Procurement',
                severity: 'High',
                rootCause: 'Bank reconciliation error between provincial council & Treasury.',
                correctiveAction: 'Rectified with Ministry Finance Branch; Rs. 18M released.',
                responsibleOfficer: 'Provincial Chief Accountant',
                daysDelayed: 25,
              },
            ],
          },
        ],
      },
    ],
  },
];

// ─────────────────────────────────────────────────────────────
// MOE HEADQUARTERS DIVISIONS & BRANCHES MONITORING DATA
// (For the Parallel MoE Division/Branch Progress Tile)
// ─────────────────────────────────────────────────────────────

export interface MoEBranchProgress {
  id: string;
  name: string;
  abbreviation: string; // e.g. TEB, ICT, PPB
  progressPct: number;
  voteNumber: string;
  plannedMilestones: number;
  completedMilestones: number;
  budgetAllocatedMn: number;
  budgetSpentMn: number;
  highlightedIssue?: string;
  issueSeverity?: 'Critical' | 'High' | 'Medium';
}

export interface MoEDivisionProgress {
  id: string;
  name: string;
  shortName: string;
  headOfficer: string;
  progressPct: number;
  budgetAllocatedMn: number;
  budgetSpentMn: number;
  branches: MoEBranchProgress[];
}

export const MOE_HEADQUARTERS_DIVISIONS_DATA: MoEDivisionProgress[] = [
  {
    id: 'div-curriculum',
    name: 'Curriculum Development & Textbooks Division',
    shortName: 'Curriculum & Pedagogy',
    headOfficer: 'Dr. K. Jayawardena (Addl. Secretary)',
    progressPct: 100, // 🟢 100% Green
    budgetAllocatedMn: 480.0,
    budgetSpentMn: 480.0,
    branches: [
      {
        id: 'br-cdb',
        name: 'Curriculum Development Branch',
        abbreviation: 'CDB',
        progressPct: 100,
        voteNumber: '126-02-02-1402',
        plannedMilestones: 18,
        completedMilestones: 18,
        budgetAllocatedMn: 280.0,
        budgetSpentMn: 280.0,
      },
      {
        id: 'br-epd',
        name: 'Educational Publications Department',
        abbreviation: 'EPD',
        progressPct: 100,
        voteNumber: '126-02-02-2104',
        plannedMilestones: 14,
        completedMilestones: 14,
        budgetAllocatedMn: 200.0,
        budgetSpentMn: 200.0,
      },
    ],
  },
  {
    id: 'div-health',
    name: 'School Health, Nutrition & Student Welfare Division',
    shortName: 'Health & Welfare',
    headOfficer: 'Mrs. R.M. Damayanthi',
    progressPct: 94, // 🟢 90-99% Light Green
    budgetAllocatedMn: 850.0,
    budgetSpentMn: 802.0,
    branches: [
      {
        id: 'br-shn',
        name: 'Health, Nutrition & Student Welfare Branch',
        abbreviation: 'SHN',
        progressPct: 94,
        voteNumber: '126-02-05-2502',
        plannedMilestones: 16,
        completedMilestones: 15,
        budgetAllocatedMn: 850.0,
        budgetSpentMn: 802.0,
      },
    ],
  },
  {
    id: 'div-planning',
    name: 'Policy, Planning & Performance Review Division',
    shortName: 'Policy & Planning',
    headOfficer: 'Mr. H.M. Premaratne (Director Planning)',
    progressPct: 91, // 🟢 90-99% Light Green
    budgetAllocatedMn: 310.0,
    budgetSpentMn: 282.1,
    branches: [
      {
        id: 'br-ppb',
        name: 'Policy & Planning Branch',
        abbreviation: 'PPB',
        progressPct: 92,
        voteNumber: '126-01-01-2104',
        plannedMilestones: 24,
        completedMilestones: 22,
        budgetAllocatedMn: 190.0,
        budgetSpentMn: 175.0,
      },
      {
        id: 'br-rdb',
        name: 'Research & Policy Development Branch',
        abbreviation: 'RDB',
        progressPct: 90,
        voteNumber: '126-01-01-1402',
        plannedMilestones: 12,
        completedMilestones: 11,
        budgetAllocatedMn: 120.0,
        budgetSpentMn: 107.1,
      },
    ],
  },
  {
    id: 'div-qa',
    name: 'Quality Assurance & School Review Division',
    shortName: 'Quality Assurance',
    headOfficer: 'Mrs. K.A. Samaranayake',
    progressPct: 86, // 🟡 80-89% Yellow
    budgetAllocatedMn: 240.0,
    budgetSpentMn: 206.4,
    branches: [
      {
        id: 'br-qab',
        name: 'Quality Assurance Branch',
        abbreviation: 'QAB',
        progressPct: 86,
        voteNumber: '126-02-04-2104',
        plannedMilestones: 20,
        completedMilestones: 17,
        budgetAllocatedMn: 240.0,
        budgetSpentMn: 206.4,
        highlightedIssue: 'Verification audits pending in 1,300 remote schools due to fuel allowance ceiling.',
        issueSeverity: 'Medium',
      },
    ],
  },
  {
    id: 'div-nie',
    name: 'National Institute of Education (NIE)',
    shortName: 'National Apex NIE',
    headOfficer: 'Prof. L. Wijeratne (Director General)',
    progressPct: 82, // 🟡 80-89% Yellow
    budgetAllocatedMn: 520.0,
    budgetSpentMn: 426.4,
    branches: [
      {
        id: 'br-nie',
        name: 'National Institute of Education',
        abbreviation: 'NIE',
        progressPct: 82,
        voteNumber: '126-02-01-2502',
        plannedMilestones: 30,
        completedMilestones: 25,
        budgetAllocatedMn: 520.0,
        budgetSpentMn: 426.4,
        highlightedIssue: 'Special education teacher trainer module translation into Tamil medium 85% complete.',
        issueSeverity: 'Medium',
      },
    ],
  },
  {
    id: 'div-ict',
    name: 'Information & Communication Technology Division',
    shortName: 'ICT & Digital Ed',
    headOfficer: 'Mr. C.S. Jayasuriya (Director ICT)',
    progressPct: 78, // 🟠 70-79% Amber
    budgetAllocatedMn: 640.0,
    budgetSpentMn: 499.2,
    branches: [
      {
        id: 'br-ict',
        name: 'Information & Communication Technology Branch',
        abbreviation: 'ICT',
        progressPct: 78,
        voteNumber: '126-02-03-2502',
        plannedMilestones: 28,
        completedMilestones: 22,
        budgetAllocatedMn: 640.0,
        budgetSpentMn: 499.2,
        highlightedIssue: '320 interactive smart boards awaiting optical fiber connectivity from SLT.',
        issueSeverity: 'High',
      },
    ],
  },
  {
    id: 'div-teacher-est',
    name: 'Teacher Establishment & Administration Division',
    shortName: 'Teacher Establishment',
    headOfficer: 'Mr. A.B. Senanayake',
    progressPct: 72, // 🟠 70-79% Amber
    budgetAllocatedMn: 260.0,
    budgetSpentMn: 187.2,
    branches: [
      {
        id: 'br-teb',
        name: 'Teacher Establishment Branch',
        abbreviation: 'TEB',
        progressPct: 72,
        voteNumber: '126-01-03-1101',
        plannedMilestones: 22,
        completedMilestones: 16,
        budgetAllocatedMn: 260.0,
        budgetSpentMn: 187.2,
        highlightedIssue: 'National teacher transfers 2,400 medical appeal submissions pending medical board vetting.',
        issueSeverity: 'High',
      },
    ],
  },
  {
    id: 'div-emis',
    name: 'Data Management & Education Management Information System (EMIS)',
    shortName: 'Data & EMIS',
    headOfficer: 'Eng. T.K. Gunawardana',
    progressPct: 62, // 🔴 50-69% Light Red
    budgetAllocatedMn: 195.0,
    budgetSpentMn: 120.9,
    branches: [
      {
        id: 'br-dmb',
        name: 'Data Management Branch',
        abbreviation: 'DMB',
        progressPct: 62,
        voteNumber: '126-01-02-2104',
        plannedMilestones: 18,
        completedMilestones: 11,
        budgetAllocatedMn: 195.0,
        budgetSpentMn: 120.9,
        highlightedIssue: 'Central Cloud EMIS census data reconciliation pending from 4 Northern & Eastern zones.',
        issueSeverity: 'High',
      },
    ],
  },
  {
    id: 'div-finance',
    name: 'Finance & Accounts Division',
    shortName: 'Finance & Accounts',
    headOfficer: 'Mr. K.B. Alwis (Chief Accountant)',
    progressPct: 54, // 🔴 50-69% Light Red
    budgetAllocatedMn: 380.0,
    budgetSpentMn: 205.2,
    branches: [
      {
        id: 'br-fpb',
        name: 'Finance & Procurement Branch',
        abbreviation: 'FPB',
        progressPct: 54,
        voteNumber: '126-01-04-2104',
        plannedMilestones: 20,
        completedMilestones: 11,
        budgetAllocatedMn: 380.0,
        budgetSpentMn: 205.2,
        highlightedIssue: 'Electronic Government Procurement (e-GP) migration audit reconciliations behind schedule.',
        issueSeverity: 'High',
      },
    ],
  },
  {
    id: 'div-infra',
    name: 'School Infrastructure & Physical Planning Division',
    shortName: 'Infrastructure',
    headOfficer: 'Eng. M.P. Perera (Chief Engineer)',
    progressPct: 45, // 🔴 < 50% Red
    budgetAllocatedMn: 980.0,
    budgetSpentMn: 441.0,
    branches: [
      {
        id: 'br-sib',
        name: 'School Infrastructure Branch',
        abbreviation: 'SIB',
        progressPct: 45,
        voteNumber: '126-03-01-2502',
        plannedMilestones: 32,
        completedMilestones: 14,
        budgetAllocatedMn: 980.0,
        budgetSpentMn: 441.0,
        highlightedIssue: 'Steel & raw material price variance requires Ministry Tender Board approval for 45 STEM labs.',
        issueSeverity: 'Critical',
      },
    ],
  },
];
