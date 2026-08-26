import { describe, it, expect } from 'vitest';
import {
  getAllScenarios,
  getScenarioById,
  filterScenarios,
} from '../data/scenario-loader';

describe('Educational Scenarios Engine', () => {
  it('loads all curated educational scenarios', () => {
    const scenarios = getAllScenarios();
    expect(scenarios.length).toBeGreaterThan(0);
    expect(scenarios[0].id).toBeDefined();
    expect(scenarios[0].steps.length).toBeGreaterThan(0);
    expect(scenarios[0].lessonsLearned.length).toBeGreaterThan(0);
  });

  it('retrieves specific scenario by id', () => {
    const scenario = getScenarioById('scenario_covid_crash');
    expect(scenario).toBeDefined();
    expect(scenario?.title).toContain('COVID-19');
    expect(scenario?.ticker).toBe('SPY');
  });

  it('filters scenarios by category and difficulty', () => {
    const crashScenarios = filterScenarios('Crash');
    expect(crashScenarios.length).toBeGreaterThan(0);
    expect(crashScenarios.every((s) => s.category === 'Crash')).toBe(true);

    const beginnerScenarios = filterScenarios(undefined, 'Beginner');
    expect(beginnerScenarios.length).toBeGreaterThan(0);
    expect(beginnerScenarios.every((s) => s.difficulty === 'Beginner')).toBe(true);
  });
});
