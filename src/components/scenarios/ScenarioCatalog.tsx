import React, { useState, useMemo } from 'react';
import { filterScenarios, EducationalScenario } from '../../data/scenario-loader';
import { ScenarioPlayer } from './ScenarioPlayer';
import { Play } from 'lucide-react';
import styles from './ScenarioCatalog.module.css';

export const ScenarioCatalog: React.FC = () => {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('all');
  const [activeScenario, setActiveScenario] = useState<EducationalScenario | null>(null);

  const filteredScenarios = useMemo(() => {
    return filterScenarios(selectedCategory, selectedDifficulty);
  }, [selectedCategory, selectedDifficulty]);

  if (activeScenario) {
    return (
      <ScenarioPlayer
        scenario={activeScenario}
        onExit={() => setActiveScenario(null)}
      />
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.filtersRow}>
        <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>Category:</span>
        {['all', 'Crash', 'Earnings', 'ShortSqueeze', 'FedPolicy'].map((cat) => (
          <button
            key={cat}
            type="button"
            className={`${styles.filterBtn} ${selectedCategory === cat ? styles.filterBtnActive : ''}`}
            onClick={() => setSelectedCategory(cat)}
          >
            {cat}
          </button>
        ))}

        <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginLeft: '12px' }}>
          Difficulty:
        </span>
        {['all', 'Beginner', 'Intermediate', 'Advanced'].map((diff) => (
          <button
            key={diff}
            type="button"
            className={`${styles.filterBtn} ${selectedDifficulty === diff ? styles.filterBtnActive : ''}`}
            onClick={() => setSelectedDifficulty(diff)}
          >
            {diff}
          </button>
        ))}
      </div>

      <div className={styles.grid}>
        {filteredScenarios.map((sc) => (
          <div key={sc.id} className={styles.card}>
            <div className={styles.cardTop}>
              <div className={styles.badgeRow}>
                <span className={styles.catBadge}>{sc.category}</span>
                <span className={styles.diffBadge}>{sc.difficulty}</span>
              </div>
              <div className={styles.cardTitle}>{sc.title}</div>
              <div className={styles.cardDesc}>{sc.description}</div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div className={styles.metaRow}>
                <span>Asset: <strong>{sc.ticker}</strong></span>
                <span>{sc.steps.length} Decisions</span>
                <span>${sc.initialCash.toLocaleString()} Capital</span>
              </div>

              <button
                type="button"
                className={styles.launchBtn}
                onClick={() => setActiveScenario(sc)}
              >
                <Play size={14} />
                <span>Launch Interactive Scenario</span>
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
