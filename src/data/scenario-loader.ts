import scenariosData from './scenarios.json';

export interface ScenarioOption {
  text: string;
  feedback: string;
}

export interface ScenarioStepItem {
  stepIndex: number;
  date: string;
  title: string;
  narrative: string;
  prompt: string;
  options: ScenarioOption[];
}

export interface EducationalScenario {
  id: string;
  title: string;
  description: string;
  category: 'Crash' | 'Bubble' | 'FedPolicy' | 'ShortSqueeze' | 'Earnings' | 'TechShift';
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
  ticker: string;
  startDate: string;
  endDate: string;
  initialCash: number;
  lessonsLearned: string[];
  steps: ScenarioStepItem[];
}

const allScenarios: EducationalScenario[] = scenariosData as EducationalScenario[];

export function getAllScenarios(): EducationalScenario[] {
  return [...allScenarios];
}

export function getScenarioById(id: string): EducationalScenario | undefined {
  if (!id || typeof id !== 'string') return undefined;
  const clean = id.trim();
  const found = allScenarios.find((s) => s.id === clean || s.id.toLowerCase() === clean.toLowerCase());
  return found ? { ...found, steps: found.steps.map(st => ({ ...st, options: st.options.map(o => ({ ...o })) })), lessonsLearned: [...found.lessonsLearned] } : undefined;
}

export function filterScenarios(
  category?: string,
  difficulty?: string
): EducationalScenario[] {
  const cat = category?.trim().toLowerCase();
  const diff = difficulty?.trim().toLowerCase();
  return allScenarios.filter((s) => {
    if (cat && cat !== 'all' && s.category.toLowerCase() !== cat) return false;
    if (diff && diff !== 'all' && s.difficulty.toLowerCase() !== diff) return false;
    return true;
  });
}
