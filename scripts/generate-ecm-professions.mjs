import { writeFileSync } from "node:fs";
import { join } from "node:path";

const raw = `
Medico chirurgo - Allergologia ed immunologia clinica|
Medico chirurgo - Angiologia|
Medico chirurgo - Cardiologia|
Medico chirurgo - Dermatologia e venereologia|
Medico chirurgo - Ematologia|
Medico chirurgo - Endocrinologia|
Medico chirurgo - Gastroenterologia|
Medico chirurgo - Genetica medica|
Medico chirurgo - Geriatria|
Medico chirurgo - Malattie metaboliche e diabetologia|
Medico chirurgo - Malattie dell'apparato respiratorio|
Medico chirurgo - Malattie infettive|
Medico chirurgo - Medicina e chirurgia di accettazione e di urgenza|
Medico chirurgo - Medicina fisica e riabilitazione|
Medico chirurgo - Medicina interna|
Medico chirurgo - Medicina termale|
Medico chirurgo - Medicina aeronautica e spaziale|
Medico chirurgo - Medicina dello sport|
Medico chirurgo - Nefrologia|
Medico chirurgo - Neonatologia|
Medico chirurgo - Neurologia|
Medico chirurgo - Neuropsichiatria infantile|
Medico chirurgo - Oncologia|
Medico chirurgo - Pediatria|
Medico chirurgo - Psichiatria|
Medico chirurgo - Radioterapia|
Medico chirurgo - Reumatologia|
Medico chirurgo - Cardiochirurgia|
Medico chirurgo - Chirurgia generale|
Medico chirurgo - Chirurgia maxillo-facciale|
Medico chirurgo - Chirurgia pediatrica|
Medico chirurgo - Chirurgia plastica e ricostruttiva|
Medico chirurgo - Chirurgia toracica|
Medico chirurgo - Chirurgia vascolare|
Medico chirurgo - Ginecologia e ostetricia|
Medico chirurgo - Neurochirurgia|
Medico chirurgo - Oftalmologia|
Medico chirurgo - Ortopedia e traumatologia|
Medico chirurgo - Otorinolaringoiatria|
Medico chirurgo - Urologia|
Medico chirurgo - Anatomia patologica|
Medico chirurgo - Anestesia e rianimazione|
Medico chirurgo - Biochimica clinica|
Medico chirurgo - Farmacologia e tossicologia clinica|
Medico chirurgo - Laboratorio di genetica medica|
Medico chirurgo - Medicina trasfusionale|
Medico chirurgo - Medicina legale|
Medico chirurgo - Medicina nucleare|
Medico chirurgo - Microbiologia e virologia|
Medico chirurgo - Neurofisiopatologia|
Medico chirurgo - Neuroradiologia|
Medico chirurgo - Patologia clinica (laboratorio di analisi chimico-cliniche e microbiologia)|
Medico chirurgo - Radiodiagnostica|
Medico chirurgo - Igiene, epidemiologia e sanità pubblica|
Medico chirurgo - Igiene degli alimenti e della nutrizione|
Medico chirurgo - Medicina del lavoro e sicurezza degli ambienti di lavoro|
Medico chirurgo - Medicina generale (medici di famiglia)|
Medico chirurgo - Continuità assistenziale|
Medico chirurgo - Pediatria (pediatri di libera scelta)|
Medico chirurgo - Scienza dell'alimentazione e dietetica|
Medico chirurgo - Direzione medica di presidio ospedaliero|
Medico chirurgo - Organizzazione dei servizi sanitari di base|
Medico chirurgo - Audiologia e foniatria|
Medico chirurgo - Psicoterapia|
Medico chirurgo - Privo di specializzazione|
Medico chirurgo - Cure palliative|
Medico chirurgo - Epidemiologia|
Medico chirurgo - Medicina di comunità|
Medico chirurgo - Medicina subacquea e iperbarica|
Odontoiatra - Odontoiatria|
Farmacista - Farmacista pubblico del SSN|
Farmacista - Farmacia territoriale|
Veterinario - Igiene degli allevamenti e delle produzioni zootecniche|
Veterinario - Igiene prod., trasf., commercial., conserv. E tras. Alimenti di origine animale e derivati|
Veterinario - Sanità animale|
Psicologo - Psicoterapia|
Psicologo - Psicologia|
Biologo - Biologo|
Chimico - Chimica analitica|
Fisico - Fisica sanitaria|
Assistente sanitario - Assistente sanitario|
Dietista - Dietista|
Educatore professionale - Educatore professionale|
Fisioterapista - Fisioterapista|
Igienista dentale - Igienista dentale|
Infermiere - Infermiere|
Infermiere pediatrico - Infermiere pediatrico|
Logopedista - Logopedista|
Ortottista/assistente di oftalmologia - Ortottista/assistente di oftalmologia|
Ostetrica/o - Ostetrica/o|
Podologo - Podologo|
Tecnico audiometrista - Tecnico audiometrista|
Tecnico audioprotesista - Tecnico audioprotesista|
Tecnico della fisiopatologia cardiocircolatoria e perfusione cardiovascolare - Tecnico della fisiopatologia cardiocircolatoria e perfusione cardiovascolare|
Tecnico della prevenzione nell'ambiente e nei luoghi di lavoro - Tecnico della prevenzione nell'ambiente e nei luoghi di lavoro|
Tecnico della riabilitazione psichiatrica - Tecnico della riabilitazione psichiatrica|
Tecnico di neurofisiopatologia - Tecnico di neurofisiopatologia|
Tecnico ortopedico - Tecnico ortopedico|
Tecnico sanitario di radiologia medica - Tecnico sanitario di radiologia medica|
Tecnico sanitario laboratorio biomedico - Tecnico sanitario laboratorio biomedico|
Terapista della neuro e psicomotricità dell'età evolutiva - Terapista della neuro e psicomotricità dell'età evolutiva|
Terapista occupazionale - Terapista occupazionale|
`;

function slug(value) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "");
}

const byProf = new Map();
for (const line of raw
  .split("|")
  .map((part) => part.trim())
  .filter(Boolean)) {
  const idx = line.indexOf(" - ");
  const profession = idx >= 0 ? line.slice(0, idx).trim() : line;
  const discipline = idx >= 0 ? line.slice(idx + 3).trim() : line;
  if (!byProf.has(profession)) {
    byProf.set(profession, []);
  }
  byProf.get(profession).push({
    id: slug(`${profession}__${discipline}`),
    label: discipline,
  });
}

const professions = [...byProf.entries()].map(([label, disciplines]) => ({
  id: slug(label),
  label,
  disciplines,
}));

const out = join(process.cwd(), "data", "lean-event", "ecm-professions.json");
writeFileSync(out, `${JSON.stringify({ professions }, null, 2)}\n`);
console.log(
  "ok",
  professions.length,
  professions.reduce((n, p) => n + p.disciplines.length, 0)
);
