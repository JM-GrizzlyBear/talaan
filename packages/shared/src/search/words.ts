// Words people search with, in Filipino and English. A Filipino word finds the
// English ones (and the other Filipino ones); an English word finds the
// Filipino ones too, so records written either way are found.
const GROUPS: { tl: string[]; en: string[] }[] = [
  // Body and tests
  { tl: ["dugo"], en: ["blood", "cbc", "hemoglobin", "hematology"] },
  { tl: ["ihi"], en: ["urine", "urinalysis"] },
  { tl: ["dumi", "tae"], en: ["stool", "fecalysis"] },
  { tl: ["asukal"], en: ["sugar", "glucose", "fbs", "hba1c"] },
  { tl: ["presyon", "alta presyon"], en: ["blood pressure", "hypertension"] },
  {
    tl: ["kolesterol", "taba"],
    en: ["cholesterol", "lipid", "ldl", "hdl", "triglycerides"],
  },
  { tl: ["baga"], en: ["lung", "lungs", "chest", "pulmonary"] },
  { tl: ["puso"], en: ["heart", "cardiac", "ecg", "2d echo", "cardiology"] },
  { tl: ["bato"], en: ["kidney", "creatinine", "renal"] },
  { tl: ["atay"], en: ["liver", "sgpt", "sgot"] },
  { tl: ["ngipin"], en: ["dental", "tooth", "teeth", "dentist"] },
  { tl: ["mata"], en: ["eye", "eyes", "ophthalmology", "vision"] },
  { tl: ["buto"], en: ["bone", "fracture", "orthopedic"] },
  { tl: ["tiyan", "sikmura"], en: ["stomach", "abdomen", "abdominal"] },
  { tl: ["ulo"], en: ["head", "brain"] },
  { tl: ["teroydeo"], en: ["thyroid", "tsh"] },
  { tl: ["buntis", "pagbubuntis"], en: ["pregnancy", "pregnant", "prenatal"] },
  { tl: ["lagnat"], en: ["fever"] },
  { tl: ["ubo"], en: ["cough"] },
  { tl: ["sipon"], en: ["colds", "rhinitis"] },
  { tl: ["alerhiya", "allergy"], en: ["allergy", "allergies", "allergic"] },
  // Papers and visits
  {
    tl: ["gamot", "reseta"],
    en: ["medicine", "medicines", "medication", "prescription", "rx"],
  },
  {
    tl: ["resibo", "bayad", "singil"],
    en: ["receipt", "bill", "billing", "payment", "soa", "hmo"],
  },
  { tl: ["bakuna"], en: ["vaccine", "vaccination", "immunization"] },
  { tl: ["doktor", "manggagamot"], en: ["doctor", "dr"] },
  { tl: ["ospital", "klinika"], en: ["hospital", "clinic"] },
  { tl: ["sertipiko"], en: ["certificate"] },
  { tl: ["konsulta", "checkup", "check up"], en: ["consultation", "check up"] },
  { tl: ["paalala"], en: ["reminder", "reminders"] },
  // Where papers are kept
  { tl: ["kahon"], en: ["box"] },
  { tl: ["sobre"], en: ["envelope"] },
  { tl: ["drower", "kabinet", "aparador"], en: ["drawer", "cabinet", "shelf"] },
  { tl: ["supot"], en: ["bag"] },
  // Family
  { tl: ["anak"], en: ["child", "son", "daughter"] },
  { tl: ["asawa"], en: ["spouse", "husband", "wife"] },
  { tl: ["nanay", "ina", "inay", "mama"], en: ["mother", "mom"] },
  { tl: ["tatay", "ama", "itay", "papa"], en: ["father", "dad"] },
  { tl: ["lola"], en: ["grandmother"] },
  { tl: ["lolo"], en: ["grandfather"] },
  { tl: ["apo"], en: ["grandchild"] },
  { tl: ["kapatid", "ate", "kuya"], en: ["sibling", "sister", "brother"] },
  { tl: ["tito"], en: ["uncle"] },
  { tl: ["tita"], en: ["aunt"] },
  { tl: ["pamangkin"], en: ["nephew", "niece"] },
  { tl: ["pinsan"], en: ["cousin"] },
];

// Written different ways, the same thing
const SAME = [
  ["xray", "x ray"],
  ["ultrasound", "utz"],
  ["ecg", "ekg"],
  ["hba1c", "a1c"],
  ["checkup", "check up"],
  ["cbc", "complete blood count"],
];

const add = (map: Map<string, Set<string>>, key: string, words: string[]) => {
  const set = map.get(key) ?? new Set([key]);
  for (const w of words) set.add(w);
  map.set(key, set);
};

const EXPAND = (() => {
  const map = new Map<string, Set<string>>();
  for (const { tl, en } of GROUPS) {
    for (const word of tl) add(map, word, [...tl, ...en]);
    for (const word of en) add(map, word, tl);
  }
  for (const words of SAME) for (const word of words) add(map, word, words);
  return map;
})();

// One searched word → every word it may match ("dugo" → blood, cbc, …)
export function alternativesOf(word: string): string[] {
  return [...(EXPAND.get(word) ?? new Set([word]))];
}
