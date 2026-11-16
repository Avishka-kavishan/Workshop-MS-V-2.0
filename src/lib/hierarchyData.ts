// Official Sri Lanka Education Sector 6-Level Organizational Hierarchy Master Data
// Generated strictly according to MoE FRS & Official Administrative CSV Dataset

export interface OrganizationType {
  id: string;
  name: string;
  level: number;
  description: string;
  createdAt: string;
}

export interface Organization {
  id: string;
  name: string;
  code: string;
  typeId: string;
  parentId: string | null;
  unitType?: 'location' | 'branch';
  functionalCategory?: 'Normal' | 'Planning' | 'Monitoring';
  institutionId?: string;
  district?: string;
  address?: string;
  phone?: string;
  email?: string;
  isActive: boolean;
  createdAt: string;
}

export const OFFICIAL_ORGANIZATION_TYPES: OrganizationType[] = [
  {
    id: 'ot-moe',
    name: 'Ministry of Education',
    level: 1,
    description: 'National Ministry of Education (Apex Administrative Level 1)',
    createdAt: '2026-09-28T06:03:41.165Z',
  },
  {
    id: 'ot-national-apex',
    name: 'National Apex Institutions (NIE / EPD / DoE)',
    level: 2,
    description: 'Autonomous national statutory bodies (NIE, EPD, DoE) with independent mandate and no provincial/zonal hierarchy',
    createdAt: '2026-09-28T06:03:41.165Z',
  },
  {
    id: 'ot-nie',
    name: 'National Institute of Education',
    level: 2,
    description: 'National Institute of Education (Apex Curriculum & Teacher Training)',
    createdAt: '2026-09-28T06:03:41.165Z',
  },
  {
    id: 'ot-epd',
    name: 'Educational Publications Department',
    level: 2,
    description: 'Educational Publications Department (Apex School Textbooks & Publications)',
    createdAt: '2026-09-28T06:03:41.165Z',
  },
  {
    id: 'ot-doe',
    name: 'Department of Examinations',
    level: 2,
    description: 'Department of Examinations (National Assessment & Evaluation Authority)',
    createdAt: '2026-09-28T06:03:41.165Z',
  },
  {
    id: 'ot-province',
    name: 'Provincial Department of Education',
    level: 3,
    description: 'Provincial level education departments (9 Provinces)',
    createdAt: '2026-09-28T06:03:41.165Z',
  },
  {
    id: 'ot-zone',
    name: 'Zonal Education Office',
    level: 4,
    description: 'Zonal education offices (100 Zones across 25 Districts)',
    createdAt: '2026-09-28T06:03:41.165Z',
  },
  {
    id: 'ot-division',
    name: 'Divisional Education Office',
    level: 5,
    description: 'Divisional education offices (312 Divisions)',
    createdAt: '2026-09-28T06:03:41.165Z',
  },
  {
    id: 'ot-school',
    name: 'School / Implementing Institution',
    level: 6,
    description: 'Schools and educational activity implementation units',
    createdAt: '2026-09-28T06:03:41.165Z',
  },
  {
    id: 'ot-branch',
    name: 'Divisional / Institutional Branch',
    level: 5,
    description: 'Functional branch / division unit (Normal, Planning, Monitoring)',
    createdAt: '2026-09-28T06:03:41.165Z',
  },
];

export const OFFICIAL_APEX_ORGANIZATIONS: Organization[] = [
  {
    id: 'org-nie',
    name: 'National Institute of Education (NIE)',
    code: 'NIE-LK',
    typeId: 'ot-nie',
    parentId: 'org-moe',
    unitType: 'branch',
    functionalCategory: 'Normal',
    isActive: true,
    createdAt: '2026-09-28T06:03:41.165Z',
  },
  {
    id: 'org-epd',
    name: 'Educational Publications Department (EPD)',
    code: 'EPD-LK',
    typeId: 'ot-epd',
    parentId: 'org-moe',
    unitType: 'branch',
    functionalCategory: 'Normal',
    isActive: true,
    createdAt: '2026-09-28T06:03:41.165Z',
  },
  {
    id: 'org-doe',
    name: 'Department of Examinations (DoE)',
    code: 'DOE-LK',
    typeId: 'ot-doe',
    parentId: 'org-moe',
    unitType: 'branch',
    functionalCategory: 'Normal',
    isActive: true,
    createdAt: '2026-09-28T06:03:41.165Z',
  },
];

export const PROVINCE_DEFINITIONS: Record<string, { id: string; name: string; code: string }> = {
  '1.Western': { id: 'org-prov-western', name: 'Western Province Education Department', code: 'PROV-WP' },
  '2.Central': { id: 'org-prov-central', name: 'Central Province Education Department', code: 'PROV-CP' },
  '3.Southern': { id: 'org-prov-southern', name: 'Southern Province Education Department', code: 'PROV-SP' },
  '4.Northern': { id: 'org-prov-northern', name: 'Northern Province Education Department', code: 'PROV-NP' },
  '5.Eastern': { id: 'org-prov-eastern', name: 'Eastern Province Education Department', code: 'PROV-EP' },
  '6.North Western': { id: 'org-prov-north-western', name: 'North Western Province Education Department', code: 'PROV-NW' },
  '7.North Central': { id: 'org-prov-north-central', name: 'North Central Province Education Department', code: 'PROV-NC' },
  '8.Uva': { id: 'org-prov-uva', name: 'Uva Province Education Department', code: 'PROV-UVA' },
  '9.Sabaragamuwa': { id: 'org-prov-sabaragamuwa', name: 'Sabaragamuwa Province Education Department', code: 'PROV-SAB' },
};

export const OFFICIAL_PROVINCES: Organization[] = Object.values(PROVINCE_DEFINITIONS).map((p) => ({
  id: p.id,
  name: p.name,
  code: p.code,
  typeId: 'ot-province',
  parentId: 'org-moe',
  unitType: 'location',
  isActive: true,
  createdAt: '2026-09-28T06:03:41.165Z',
}));

const KNOWN_EXISTING_ZONE_IDS: Record<string, string> = {
  'ampara': 'org-zone-ampara',
  'anuradhapura': 'org-zone-anuradhapura',
  'badulla': 'org-zone-badulla',
  'batticaloa': 'org-zone-batticaloa',
  'chilaw': 'org-zone-chilaw',
  'colombo': 'org-zone-colombo',
  'galle': 'org-zone-galle',
  'gampaha': 'org-zone-gampaha',
  'hambantota': 'org-zone-hambantota',
  'jaffna': 'org-zone-jaffna',
  'kalutara': 'org-zone-kalutara',
  'kandy': 'org-zone-kandy',
  'kegalle': 'org-zone-kegalle',
  'kurunegala': 'org-zone-kurunegala',
  'mannar': 'org-zone-mannar',
  'matale': 'org-zone-matale',
  'matara': 'org-zone-matara',
  'moneragala': 'org-zone-monaragala',
  'nuwara eliya': 'org-zone-nuwara eliya',
  'polonnaruwa': 'org-zone-polonnaruwa',
  'puttalam': 'org-zone-puttalam',
  'ratnapura': 'org-zone-ratnapura',
  'trincomalee': 'org-zone-trincomalee',
};

function slug(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-');
}

const RAW_HIERARCHY_CSV = `
1.Western,11.Colombo,Colombo,Borella
,,,Colombo Central
,,,Colombo North
,,,Colombo South
,,Homagama,Hanwella
,,,Homagama
,,,Padukka
,,Piliyandala,Dehiwala
,,,Kesbewa
,,,Moratuwa
,,Sri Jayawardenapura,Kaduwela
,,,Kolonnawa
,,,Maharagama
,,,Nugegoda
,12.Gampaha,Gampaha,Attanagalla
,,,Dompe (Weke)
,,,Gampaha
,,Kelaniya,Biyagama
,,,Kelaniya
,,,Mahara
,,,Wattala
,,Minuwangoda,Divulapitiya
,,,Meerigama
,,,Minuwangoda
,,Negombo,Ja-Ela
,,,Katana
,,,Negombo
,13.Kalutara,Horana,Bandaragama
,,,Bulathsinhala
,,,Horana
,,Kalutara,Beruwala
,,,Dodangoda
,,,Kalutara
,,,Panadura
,,Matugama,Agalawatta
,,,Matugama
,,,Palindanuwara
,,,Walallawita
2.Central,21.Kandy,Denuwara,Udunuwara
,,,Yatinuwara
,,Gampola,Ganga Ihala Korale
,,,Pasbage Korale
,,,Udapalatha
,,Kandy,Gangawata Korale
,,,Pathahewaheta
,,Katugastota,Akurana
,,,Galagedara
,,,Harispattuwa
,,,Hatharaliyadda
,,,Poojapitiya
,,Teldeniya,Medadumbara
,,,Minipe
,,,Udadumbara
,,Waththegama,Kundasale
,,,Panvila
,,,Pathadumbara
,22.Matale,Galewela,Dambulla
,,,Galewela
,,,Pallepola
,,Matale,Matale
,,,Rattota
,,,Ukuwela
,,,Yatawatta
,,Naula,Ambanganga Korale
,,,Naula
,,Wilgamuwa,Laggala
,,,Wilgamuwa
,23.Nuwara Eliya,Hanguranketha,Udahewaheta
,,Hatton,Ambagamuwa
,,,Hatton Tamil - I
,,,Hatton Tamil - II
,,,Hatton Tamil - III
,,Kotmale,Kotmale
,,Nuwara Eliya,Nuwara Eliya
,,,Nuwara Eliya Tamil - I
,,,Nuwara Eliya Tamil - II
,,,Nuwara Eliya Tamil - III
,,Walapane,Walapane
3.Southern,31.Galle,Ambalangoda,Ambalangoda
,,,Balapitiya
,,,Hikkaduwa
,,Elpitiya,Bentota
,,,Elpitiya
,,,Karandeniya
,,,Niyagama
,,,Welivitiya-Divithura
,,Galle,Akmeemana
,,,Baddegama
,,,Galle
,,,Habaraduwa
,,Udugama,Mapalagama
,,,Thawalama
,,,Yakkalamulla
,32.Matara,Akuressa,Akuressa
,,,Malimboda
,,,Welipitiya
,,Deniyaya,Kotapola
,,,Morawaka
,,,Pasgoda
,,Matara,Devinuwara
,,,Dikwella
,,,Matara
,,,Weligama
,,Mulatiyana,Hakmana
,,,Kamburupitiya
,,,Mulatiyana
,,,Thihagoda
,33.Hambantota,Hambantota,Ambalantota
,,,Hambantota
,,,Lunugamvehera
,,,Sooriyawewa
,,,Thissamaharama
,,Tangalle,Angunakolapelessa
,,,Beliatta
,,,Tangalle
,,Walasmulla,Katuwana
,,,Walasmulla
4.Northern,41.Jaffna,Islands,Delft
,,,Karainagar
,,,Kayts
,,,Velanai
,,Jaffna,Jaffna
,,,Kopay
,,,Nallur
,,Thenmaradchi,Chavakachcheri
,,Vadamaradchi,Karaveddy
,,,Maruthankerney
,,,Point Pedru
,,Valikamam,Chankanai
,,,Sandilipay
,,,Tellippalai
,,,Uduvil
,42.Mannar,Madhu,Madhu
,,,Manthai West
,,Mannar,Mannar
,,,Musali
,,,Nanattan
,43.Vavuniya,Vavuniya North,Nedunkerny
,,,Omanthai
,,Vavuniya South,Vavuniya South (Sinhala)
,,,Vavuniya South (Tamil)
,,,Vengalacheddikulam
,44.Mullaitivu,Mullaitivu,Maritimepattu
,,,Puthukkudiyiruppu
,,,Welioya
,,Thunukkai,Manthai East
,,,Oddusuddan
,,,Thunukkai
,45.Kilinochchi,Kilinochchi North,Kandawalai
,,,Pallai
,,Kilinochchi South,Karachchi
,,,Poonakary
5.Eastern,51.Batticaloa,Batticaloa,Eravur Pattu - I (Chenkalady)
,,,Manmunai North (Batticaloa)
,,,Manmunai Pattu
,,Batticaloa Central,Eravur Town
,,,Kaththankudy
,,,Koralai Pattu West
,,Batticaloa West,Eravur Pattu - III
,,,Manmunai South West
,,,Manmunai West
,,Kalkudah,Eravur Pattu - II
,,,Koralai Pattu
,,,Koralai Pattu North
,,Paddrippu,Manmunai South & Eruvil Pattu
,,,Porativu Pattu
,52.Ampara,Akkaraipattu,Addalachchenai
,,,Akkaraipattu
,,,Pottuvil - I
,,Ampara,Ampara
,,,Damana
,,,Lahugala
,,,Uhana
,,Dehiattakandiya,Dehiattakandiya
,,Kalmunai,Kalmunai
,,,Kalmunai Tamil
,,,Karaithivu
,,,Ninthavur
,,,Sainthamaruthu
,,Mahaoya,Mahaoya
,,,Padiyatalawa
,,Sammanthurai,Irakkamam
,,,Navithanveli
,,,Sammanthurai
,,Thirukkovil,Alayadivembu
,,,Pottuvil - II (Tamil)
,,,Thirukkovil
,53.Trincomalee,Kantale,Kantale
,,,Seruvila
,,Kinniya,Kinniya
,,,Kurinchakerny
,,,Mullipothana
,,Muttur,Echchilampattu 
,,,Muttur
,,Trincomalee,Kuchchaveli
,,,Thampalakamam
,,,Trincomalee Town
,,Trincomalee North,Gomarankadawala
,,,Morawewa
,,,Padavi Sripura
6.North Western,61.Kurunegala,Giriulla,Alawwa
,,,Kuliyapitiya East
,,,Pannala
,,Ibbagamuwa,Ganewatta
,,,Ibbagamuwa
,,,Rideegama
,,Kuliyapitiya,Bingiriya
,,,Dahanekgedara
,,,Kuliyapitiya West
,,,Panduwasnuwara
,,,Udubaddawa
,,Kurunegala,Kurunegala
,,,Mawathagama
,,,Polgahawela
,,Maho,Galgamuwa
,,,Giribawa
,,,Maho
,,,Polpitigama
,,Nikaweratiya,Kobeigane
,,,Kotavehera
,,,Nikaweratiya
,,,Wariyapola
,62.Puttalam,Chilaw,Arachchikattuwa
,,,Chilaw
,,,Nattandiya
,,,Wennappuwa
,,Puttalam,Anamaduwa
,,,Kalpitiya
,,,Pallama
,,,Puttalam North
,,,Puttalam South
7.North Central,71.Anuradhapura,Anuradhapura,Mahawilachchiya
,,,Nachchaduwa
,,,Nochchiyagama
,,,Nuwaragam Palatha Central
,,,Nuwaragam Palatha East
,,,Rambewa
,,Galenbindunuwewa,Galenbindunuwewa
,,,Kahatagasdigiliya
,,,Mihintale
,,Kebithigollewa,Horowpothana
,,,Kebithigollewa
,,,Medawachchiya
,,,Padaviya
,,Kekirawa,Ipalogama
,,,Kekirawa
,,,Palagala
,,,Palugaswewa
,,,Thirappane
,,Thambuttegama,Galnewa
,,,Rajanganaya
,,,Thalawa
,,,Thambuttegama
,72.Polonnaruwa,Dimbulagala,Aralaganwila
,,,Dimbulagala
,,,Welikanda
,,Hingurakgoda,Elahera
,,,Hingurakgoda
,,,Medirigiriya
,,Polonnaruwa,Lankapura
,,,Thamankaduwa
8.Uva,81.Badulla,Badulla,Badulla
,,,Hali-Ela
,,Bandarawela,Bandarawela
,,,Ella
,,,Haldummulla
,,,Haputale
,,Mahiyanganaya,Mahiyanganaya
,,,Rideemaliyedda
,,Passara,Passara
,,Viyaluwa,Kandaketiya
,,,Meegahakivula
,,,Soranatota
,,Welimada,Uva Paranagama
,,,Welimada
,82.Moneragala,Bibile,Bibile
,,,Madulla
,,,Medagama
,,Moneragala,Badalkumbura
,,,Moneragala
,,,Siyambalanduwa
,,Thanamalwila,Thanamalwila
,,Wellawaya,Buttala
,,,Wellawaya
9.Sabaragamuwa,91.Ratnapura,Balangoda,Balangoda
,,,Imbulpe
,,,Weligepola
,,Embilipitiya,Embilipitiya
,,,Godakawela
,,,Kolonna
,,Nivitigala,Ayagama
,,,Elapatha
,,,Kahawatta
,,,Kalawana
,,,Nivitigala
,,Ratnapura,Eheliyagoda
,,,Kuruwita
,,,Pelmadulla
,,,Ratnapura
,,,Sri Pada
,92.Kegalle,Dehiowita,Dehiowita
,,,Deraniyagala
,,,Kitulgala
,,,Ruwanwella
,,,Yatiyantota
,,Kegalle,Dedigama
,,,Galigamuwa
,,,Kegalle
,,,Warakapola
,,Mawanella,Aranayaka
,,,Mawanella
,,,Rambukkana
`;

function buildZonesAndDivisions(): { zones: Organization[]; divisions: Organization[] } {
  const lines = RAW_HIERARCHY_CSV.trim().split('\n');
  let curProv = '', curDist = '', curZone = '';
  const seenZones = new Set<string>();
  const seenDivs = new Set<string>();
  const zones: Organization[] = [];
  const divisions: Organization[] = [];

  for (const line of lines) {
    if (!line.trim() || line.startsWith('Grand Total')) continue;
    const parts = line.split(',');
    const p = parts[0]?.trim();
    const d = parts[1]?.trim();
    const z = parts[2]?.trim();
    const v = parts[3]?.trim();

    if (p) curProv = p;
    if (d) curDist = d;
    if (z) curZone = z;

    const provInfo = PROVINCE_DEFINITIONS[curProv];
    if (!provInfo) continue;

    const zoneKey = `${provInfo.id}::${curZone}`;
    let zoneId = '';

    if (!seenZones.has(zoneKey)) {
      seenZones.add(zoneKey);
      const zoneNameClean = curZone.trim();
      const cleanLower = zoneNameClean.toLowerCase();
      const existingId = KNOWN_EXISTING_ZONE_IDS[cleanLower];
      zoneId = existingId || `org-zone-${slug(zoneNameClean)}`;

      if (zones.some((item) => item.id === zoneId)) {
        zoneId = `org-zone-${slug(provInfo.name.split(' ')[0])}-${slug(zoneNameClean)}`;
      }

      zones.push({
        id: zoneId,
        name: `${zoneNameClean} Zonal Education Office`,
        code: `ZONE-${slug(zoneNameClean).toUpperCase().slice(0, 8)}`,
        typeId: 'ot-zone',
        parentId: provInfo.id,
        unitType: 'location',
        district: curDist,
        isActive: true,
        createdAt: '2026-09-28T06:03:41.165Z',
      });
    } else {
      zoneId = zones.find((item) => item.parentId === provInfo.id && item.name.startsWith(curZone.trim()))?.id || '';
    }

    if (v && v.trim()) {
      const divNameClean = v.trim();
      let divId = `org-div-${slug(zoneId.replace('org-zone-', ''))}-${slug(divNameClean)}`;
      if (seenDivs.has(divId)) {
        divId = `${divId}-2`;
      }
      seenDivs.add(divId);

      divisions.push({
        id: divId,
        name: `${divNameClean} Divisional Education Office`,
        code: `DIV-${slug(divNameClean).toUpperCase().slice(0, 10)}`,
        typeId: 'ot-division',
        parentId: zoneId,
        unitType: 'location',
        isActive: true,
        createdAt: '2026-09-28T06:03:41.165Z',
      });
    }
  }

  return { zones, divisions };
}

const built = buildZonesAndDivisions();

export const OFFICIAL_ZONES: Organization[] = built.zones;

export const OFFICIAL_DIVISIONS: Organization[] = built.divisions;

export interface MoeDivisionDefinition {
  sn: number;
  division: string;
  code: string;
  id: string;
  branches: Array<{
    id: string;
    name: string;
    code: string;
    category?: 'Normal' | 'Planning' | 'Monitoring';
  }>;
}

export const OFFICIAL_MOE_DIVISIONS_DATA: MoeDivisionDefinition[] = [
  {
    sn: 1,
    division: 'Information Technology & Digital Education Division',
    code: 'MOE-DIV-IT',
    id: 'org-moe-div-it',
    branches: [
      { id: 'org-moe-ict', name: 'Information & Communication Technology (DE ICT)', code: 'MOE-ICT', category: 'Normal' },
      { id: 'org-moe-data', name: 'Systems Development & Data Management', code: 'MOE-DATA', category: 'Normal' },
      { id: 'org-moe-it-dist-learn', name: 'Distance Learning Promotion', code: 'MOE-DIST-LEARN', category: 'Normal' },
      { id: 'org-moe-it-nanasala', name: 'Nanasala / Distance Education Unit', code: 'MOE-NANASALA', category: 'Normal' },
      { id: 'org-moe-digital-infra', name: 'Digital Education Infrastructure Development', code: 'MOE-DIGI-INFRA', category: 'Normal' },
    ],
  },
  {
    sn: 2,
    division: 'Education Reforms Division',
    code: 'MOE-DIV-REFORMS',
    id: 'org-moe-div-reforms',
    branches: [
      { id: 'org-moe-reforms', name: 'Educational Administration Reforms', code: 'MOE-REFORMS-ADMIN', category: 'Normal' },
      { id: 'org-moe-reforms-curriculum', name: 'Educational Curriculum Reforms', code: 'MOE-REFORMS-CURR', category: 'Normal' },
      { id: 'org-moe-reforms-planning', name: 'Planning & Capacity Development', code: 'MOE-REFORMS-PLAN', category: 'Planning' },
    ],
  },
  {
    sn: 3,
    division: 'Co-curricular & Primary Education Division',
    code: 'MOE-DIV-PRIMARY',
    id: 'org-moe-div-primary',
    branches: [
      { id: 'org-moe-primary', name: 'Primary Education', code: 'MOE-PRIMARY', category: 'Normal' },
      { id: 'org-moe-health', name: 'Health & Nutrition', code: 'MOE-HEALTH', category: 'Normal' },
      { id: 'org-moe-sports', name: 'Sports & Physical Education', code: 'MOE-SPORTS', category: 'Normal' },
      { id: 'org-moe-counseling', name: 'Co-curricular, Career Guidance & Counseling', code: 'MOE-COUNSEL', category: 'Normal' },
    ],
  },
  {
    sn: 4,
    division: 'Policy Planning & Performance Review Division',
    code: 'MOE-DIV-PLANNING',
    id: 'org-moe-div-planning',
    branches: [
      { id: 'org-moe-planning', name: 'Policy Planning', code: 'MOE-PLAN', category: 'Planning' },
      { id: 'org-moe-monitoring', name: 'Monitoring & Performance Review', code: 'MOE-MONITOR', category: 'Monitoring' },
      { id: 'org-moe-efa', name: 'Education for All (EFA)', code: 'MOE-EFA', category: 'Normal' },
      { id: 'org-moe-randd', name: 'Research & Development', code: 'MOE-RND', category: 'Planning' },
      { id: 'org-moe-hrd', name: 'Human Resources Development', code: 'MOE-HRD', category: 'Normal' },
      { id: 'org-moe-foreign-agencies', name: 'Foreign Agencies & External Affairs', code: 'MOE-EXT-AFF', category: 'Normal' },
      { id: 'org-moe-statistics', name: 'Senior Statistician - Statistics Unit', code: 'MOE-STAT', category: 'Planning' },
      { id: 'org-moe-sesip', name: 'Project Manager - Secondary Education Sector Improvement Program (SESIP)', code: 'MOE-SESIP', category: 'Normal' },
    ],
  },
  {
    sn: 5,
    division: 'Education Quality Development Division',
    code: 'MOE-DIV-EQD',
    id: 'org-moe-div-eqd',
    branches: [
      { id: 'org-moe-eqd', name: 'Education Quality Development Branch (EQD)', code: 'MOE-EQD', category: 'Normal' },
      { id: 'org-moe-eqd-dev', name: 'Education Development', code: 'MOE-EQD-DEV', category: 'Normal' },
      { id: 'org-moe-lang-humanities', name: 'National Languages & Humanities Education', code: 'MOE-LANG', category: 'Normal' },
      { id: 'org-moe-science', name: 'Science', code: 'MOE-SCIENCE', category: 'Normal' },
      { id: 'org-moe-maths', name: 'Mathematics', code: 'MOE-MATHS', category: 'Normal' },
      { id: 'org-moe-english', name: 'English & Foreign Languages', code: 'MOE-ENG', category: 'Normal' },
      { id: 'org-moe-commerce', name: 'Commerce & Business Studies', code: 'MOE-COMMERCE', category: 'Normal' },
      { id: 'org-moe-aesthetics', name: 'Aesthetics Education', code: 'MOE-AESTHETICS', category: 'Normal' },
      { id: 'org-moe-religion', name: 'Religious & Value Education', code: 'MOE-RELIGION', category: 'Normal' },
      { id: 'org-moe-bilingual', name: 'Bilingual Education', code: 'MOE-BILINGUAL', category: 'Normal' },
      { id: 'org-moe-qa', name: 'Management & Quality Assurance', code: 'MOE-QA', category: 'Monitoring' },
      { id: 'org-moe-agri', name: 'Agriculture & Environmental Studies', code: 'MOE-AGRI', category: 'Normal' },
      { id: 'org-moe-tech', name: 'Technology Education', code: 'MOE-TECH', category: 'Normal' },
    ],
  },
  {
    sn: 6,
    division: 'School Affairs Division',
    code: 'MOE-DIV-SCHOOLS',
    id: 'org-moe-div-schools',
    branches: [
      { id: 'org-moe-sch-activities', name: 'School Activities', code: 'MOE-SCH-ACT', category: 'Normal' },
      { id: 'org-moe-sch-national', name: 'National Schools', code: 'MOE-NAT-SCH', category: 'Normal' },
      { id: 'org-moe-sch-library', name: 'School Library Development', code: 'MOE-SCH-LIB', category: 'Normal' },
      { id: 'org-moe-sch-special', name: 'Non-Formal & Special Education', code: 'MOE-SPEC-ED', category: 'Normal' },
      { id: 'org-moe-sch-shishyoda', name: 'Shishyoda / National Institute of Special Education & Inclusive Education Unit', code: 'MOE-SHISHYODA', category: 'Normal' },
      { id: 'org-moe-sch-muslim', name: 'Muslim Schools Development', code: 'MOE-MUS-SCH', category: 'Normal' },
      { id: 'org-moe-sch-tamil', name: 'Tamil Schools Development', code: 'MOE-TAM-SCH', category: 'Normal' },
      { id: 'org-moe-sch-peace', name: 'Peace Education & Reconciliation Unit', code: 'MOE-PEACE-ED', category: 'Normal' },
      { id: 'org-moe-sch-plantation', name: 'Plantation Schools Development', code: 'MOE-PLANT-SCH', category: 'Normal' },
      { id: 'org-moe-sch-private', name: 'Private Schools', code: 'MOE-PRIV-SCH', category: 'Normal' },
      { id: 'org-moe-sch-pub-board', name: 'Secondary Education Publication Advisory Board', code: 'MOE-PUB-ADV', category: 'Normal' },
    ],
  },
  {
    sn: 7,
    division: 'Teacher Establishment Division',
    code: 'MOE-DIV-TEACH-EST',
    id: 'org-moe-div-teach-est',
    branches: [
      { id: 'org-moe-teach-est', name: 'Teacher Establishment', code: 'MOE-T-EST', category: 'Normal' },
      { id: 'org-moe-teach-est-branch', name: 'Teacher Establishment Branch', code: 'MOE-T-EST-BR', category: 'Normal' },
      { id: 'org-moe-teach-isa', name: 'In-Service Advisor (ISA) Unit', code: 'MOE-ISA-UNIT', category: 'Normal' },
      { id: 'org-moe-teach-transfer', name: 'Teacher Transfer', code: 'MOE-T-TRANS', category: 'Normal' },
    ],
  },
  {
    sn: 8,
    division: 'Education Service Establishment Division',
    code: 'MOE-DIV-ED-SERV',
    id: 'org-moe-div-ed-serv',
    branches: [
      { id: 'org-moe-ed-serv-est', name: 'Education Service Establishment', code: 'MOE-ED-SERV', category: 'Normal' },
      { id: 'org-moe-principals-est', name: 'Principals Establishment', code: 'MOE-PRIN-EST', category: 'Normal' },
      { id: 'org-moe-educator-serv', name: 'Teacher Educator Service', code: 'MOE-T-EDUC', category: 'Normal' },
    ],
  },
  {
    sn: 9,
    division: 'Administration Division',
    code: 'MOE-DIV-ADMIN',
    id: 'org-moe-div-admin',
    branches: [
      { id: 'org-moe-parliament-trans', name: 'Parliamentary Affairs & Transport', code: 'MOE-PARL-TRN', category: 'Normal' },
      { id: 'org-moe-parliament-unit', name: 'Parliamentary Affairs Unit', code: 'MOE-PARL-U', category: 'Normal' },
      { id: 'org-moe-transport-unit', name: 'Transport Unit', code: 'MOE-TRN-U', category: 'Normal' },
      { id: 'org-moe-admin-land', name: 'Administration & Land', code: 'MOE-ADM-LAND', category: 'Normal' },
      { id: 'org-moe-gen-admin', name: "General Administration (Minister's Office, Deputy Minister's Office, Secretariat, Central Archives, Building Management, Leave, Land, RTI, Translation, Post)", code: 'MOE-GEN-ADM', category: 'Normal' },
      { id: 'org-moe-operation-room', name: 'National Operation Room', code: 'MOE-OPS-RM', category: 'Normal' },
      { id: 'org-moe-legal', name: 'Legal Unit', code: 'MOE-LEGAL', category: 'Normal' },
      { id: 'org-moe-library', name: 'Library Unit', code: 'MOE-LIB', category: 'Normal' },
      { id: 'org-moe-media', name: 'Media Unit', code: 'MOE-MEDIA', category: 'Normal' },
      { id: 'org-moe-building-mgmt', name: 'Building Management Unit', code: 'MOE-BLDG-MGT', category: 'Normal' },
      { id: 'org-moe-risograph', name: 'Risograph / Duplicating Unit', code: 'MOE-RISO', category: 'Normal' },
      { id: 'org-moe-audiovisual', name: 'Audio Visual Unit', code: 'MOE-AV-UNIT', category: 'Normal' },
    ],
  },
  {
    sn: 10,
    division: 'Non-Academic & Combined Services Division',
    code: 'MOE-DIV-COMB-SERV',
    id: 'org-moe-div-comb-serv',
    branches: [
      { id: 'org-moe-combined-serv', name: 'Combined Services', code: 'MOE-COMB-SRV', category: 'Normal' },
      { id: 'org-moe-noncombined-serv', name: 'Non-Combined Services', code: 'MOE-NON-COMB', category: 'Normal' },
    ],
  },
  {
    sn: 11,
    division: 'Procurement Division',
    code: 'MOE-DIV-PROC',
    id: 'org-moe-div-proc',
    branches: [
      { id: 'org-moe-procurement', name: 'Procurement', code: 'MOE-PROC', category: 'Normal' },
      { id: 'org-moe-school-supplies', name: 'School Supplies', code: 'MOE-SCH-SUP', category: 'Normal' },
      { id: 'org-moe-ca-procurement', name: 'Chief Accountant - Procurement', code: 'MOE-CA-PROC', category: 'Normal' },
    ],
  },
  {
    sn: 12,
    division: 'Engineering Division',
    code: 'MOE-DIV-ENG',
    id: 'org-moe-div-eng',
    branches: [
      { id: 'org-moe-dir-engineering', name: 'Director of Engineering', code: 'MOE-DIR-ENG', category: 'Normal' },
      { id: 'org-moe-dir-construction', name: 'Director of Construction, Supply & Infrastructure Development', code: 'MOE-DIR-CONST', category: 'Normal' },
    ],
  },
  {
    sn: 13,
    division: 'Disciplinary & Investigation Division',
    code: 'MOE-DIV-DISC',
    id: 'org-moe-div-disc',
    branches: [
      { id: 'org-moe-discipline-investigation', name: 'Discipline & Investigation', code: 'MOE-DISC-INV', category: 'Normal' },
      { id: 'org-moe-disciplinary-unit', name: 'Disciplinary Unit', code: 'MOE-DISC-U', category: 'Normal' },
      { id: 'org-moe-investigation-unit', name: 'Investigation Unit', code: 'MOE-INV-U', category: 'Normal' },
    ],
  },
  {
    sn: 14,
    division: 'Piriven Administration Division',
    code: 'MOE-DIV-PIR-ADM',
    id: 'org-moe-div-pir-adm',
    branches: [
      { id: 'org-moe-piriven-admin', name: 'Piriven Administration', code: 'MOE-PIR-ADM', category: 'Normal' },
    ],
  },
  {
    sn: 15,
    division: 'Piriven Development Division',
    code: 'MOE-DIV-PIR-DEV',
    id: 'org-moe-div-pir-dev',
    branches: [
      { id: 'org-moe-piriven-dev', name: 'Piriven Development', code: 'MOE-PIR-DEV', category: 'Normal' },
      { id: 'org-moe-piriven', name: 'Piriven Education', code: 'MOE-PIR-ED', category: 'Normal' },
    ],
  },
  {
    sn: 16,
    division: 'General Planning Division',
    code: 'MOE-DIV-GEN-PLAN',
    id: 'org-moe-div-gen-plan',
    branches: [
      { id: 'org-moe-gen-planning', name: 'Planning', code: 'MOE-GEN-PLAN', category: 'Planning' },
    ],
  },
  {
    sn: 17,
    division: 'Finance Division 1 (Financial Management & Payments)',
    code: 'MOE-DIV-FIN-1',
    id: 'org-moe-div-fin-1',
    branches: [
      { id: 'org-moe-ca-finance', name: 'Chief Accountant - Finance', code: 'MOE-CA-FIN', category: 'Normal' },
      { id: 'org-moe-acc-misc', name: 'Accountant (Grade I) - Miscellaneous Accounts', code: 'MOE-ACC-MISC', category: 'Normal' },
      { id: 'org-moe-acc-finance', name: 'Accountant (Grade I) - Finance', code: 'MOE-ACC-FIN', category: 'Normal' },
      { id: 'org-moe-payments', name: 'Payments Branch', code: 'MOE-PAYMENTS', category: 'Normal' },
      { id: 'org-moe-ca-piriven-fin', name: 'Chief Accountant - Piriven Finance', code: 'MOE-CA-PIR-FIN', category: 'Normal' },
    ],
  },
  {
    sn: 18,
    division: 'Finance Division 2 (Assets Management & Supplies)',
    code: 'MOE-DIV-FIN-2',
    id: 'org-moe-div-fin-2',
    branches: [
      { id: 'org-moe-acc-assets-sch', name: 'Accountant (Grade I) - Assets Management & National School Finance Monitoring', code: 'MOE-ACC-ASSET1', category: 'Normal' },
      { id: 'org-moe-acc-assets-survey', name: 'Accountant (Grade I) - Assets Management & Board of Survey', code: 'MOE-ACC-ASSET2', category: 'Normal' },
      { id: 'org-moe-pensions', name: 'Pensions Branch', code: 'MOE-PENSIONS', category: 'Normal' },
      { id: 'org-moe-supplies', name: 'Supplies Branch', code: 'MOE-SUPPLIES', category: 'Normal' },
    ],
  },
  {
    sn: 19,
    division: 'Teacher Education Administration Division',
    code: 'MOE-DIV-TEA-ADM',
    id: 'org-moe-div-tea-adm',
    branches: [
      { id: 'org-moe-ncoe', name: 'National Colleges of Education (NCOE)', code: 'MOE-NCOE', category: 'Normal' },
      { id: 'org-moe-teacher-edu-admin', name: 'Teacher Education Administration', code: 'MOE-T-EDU-ADM', category: 'Normal' },
    ],
  },
  {
    sn: 20,
    division: 'Internal Audit Division',
    code: 'MOE-DIV-AUDIT',
    id: 'org-moe-div-audit',
    branches: [
      { id: 'org-moe-internal-audit', name: 'Internal Audit Directorate / Branch', code: 'MOE-INT-AUDIT', category: 'Monitoring' },
    ],
  },
];

export const OFFICIAL_MOE_ORGANIZATIONS: Organization[] = [
  {
    id: 'org-moe',
    name: 'Ministry of Education',
    code: 'MOE-HQ',
    typeId: 'ot-moe',
    parentId: null,
    unitType: 'location',
    functionalCategory: 'Normal',
    isActive: true,
    createdAt: '2026-09-28T06:03:41.165Z',
  },
  ...OFFICIAL_MOE_DIVISIONS_DATA.flatMap((d) => [
    {
      id: d.id,
      name: d.division,
      code: d.code,
      typeId: 'ot-moe',
      parentId: 'org-moe',
      unitType: 'branch' as const,
      functionalCategory: (d.branches.some((b) => b.category === 'Planning') ? 'Planning' : 'Normal') as 'Normal' | 'Planning' | 'Monitoring',
      isActive: true,
      createdAt: '2026-09-28T06:03:41.165Z',
    },
    ...d.branches.map((b) => ({
      id: b.id,
      name: b.name,
      code: b.code,
      typeId: 'ot-moe',
      parentId: d.id,
      unitType: 'branch' as const,
      functionalCategory: (b.category || 'Normal') as 'Normal' | 'Planning' | 'Monitoring',
      isActive: true,
      createdAt: '2026-09-28T06:03:41.165Z',
    })),
  ]),
];

export const ALL_OFFICIAL_ORGANIZATIONS: Organization[] = [
  ...OFFICIAL_MOE_ORGANIZATIONS,
  ...OFFICIAL_APEX_ORGANIZATIONS,
  ...OFFICIAL_PROVINCES,
  ...OFFICIAL_ZONES,
  ...OFFICIAL_DIVISIONS,
];
