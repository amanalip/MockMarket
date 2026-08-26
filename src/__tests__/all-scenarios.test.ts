import { describe, it, expect } from 'vitest';
import { getAllScenarios } from '../data/scenario-loader';

describe('Complete 20 Educational Scenarios Suite', () => {
  it('contains exactly 20 rich educational scenarios', () => {
    const scenarios = getAllScenarios();
    expect(scenarios.length).toBe(20);
  });

  it('validates every scenario has non-empty fields and unique IDs', () => {
    const scenarios = getAllScenarios();
    const idSet = new Set<string>();

    scenarios.forEach((sc) => {
      expect(sc.id).toBeDefined();
      expect(idSet.has(sc.id), `Duplicate scenario ID: ${sc.id}`).toBe(false);
      idSet.add(sc.id);

      expect(sc.title.length).toBeGreaterThan(5);
      expect(sc.description.length).toBeGreaterThan(10);
      expect(sc.ticker).toBeDefined();
      expect(sc.startDate).toBeDefined();
      expect(sc.endDate).toBeDefined();
      expect(sc.initialCash).toBeGreaterThan(0);
      expect(sc.lessonsLearned.length).toBeGreaterThan(0);

      // Validate steps
      expect(sc.steps.length).toBeGreaterThan(0);
      sc.steps.forEach((st) => {
        expect(st.stepIndex).toBeGreaterThan(0);
        expect(st.date).toBeDefined();
        expect(st.title).toBeDefined();
        expect(st.narrative.length).toBeGreaterThan(10);
        expect(st.prompt.length).toBeGreaterThan(5);
        expect(st.options.length).toBeGreaterThanOrEqual(2);
        st.options.forEach((opt) => {
          expect(opt.text.length).toBeGreaterThan(3);
          expect(opt.feedback.length).toBeGreaterThan(5);
        });
      });
    });
  });
});
