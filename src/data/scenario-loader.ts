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
  return allScenarios;
}

export function getScenarioById(id: string): EducationalScenario | undefined {
  return allScenarios.find((s) => s.id === id);
}

export function filterScenarios(
  category?: string,
  difficulty?: string
): EducationalScenario[] {
  return allScenarios.filter((s) => {
    if (category && category !== 'all' && s.category !== category) return false;
    if (difficulty && difficulty !== 'all' && s.difficulty !== difficulty) return false;
    return true;
  });
}
