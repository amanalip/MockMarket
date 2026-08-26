import React, { useState } from 'react';
import { EducationalScenario } from '../../data/scenario-loader';
import { ArrowLeft, ArrowRight, CheckCircle2, Award, Calendar, Lightbulb } from 'lucide-react';
import styles from './ScenarioPlayer.module.css';

interface ScenarioPlayerProps {
  scenario: EducationalScenario;
  onExit: () => void;
}

export const ScenarioPlayer: React.FC<ScenarioPlayerProps> = ({ scenario, onExit }) => {
  const [currentStepIdx, setCurrentStepIdx] = useState(0);
  const [selectedOptionIdx, setSelectedOptionIdx] = useState<number | null>(null);
  const [isCompleted, setIsCompleted] = useState(false);

  const step = scenario.steps[currentStepIdx];
  const totalSteps = scenario.steps.length;

  const handleSelectOption = (idx: number) => {
    setSelectedOptionIdx(idx);
  };

  const handleNextStep = () => {
    if (currentStepIdx + 1 < totalSteps) {
      setCurrentStepIdx(currentStepIdx + 1);
      setSelectedOptionIdx(null);
    } else {
      setIsCompleted(true);
    }
  };

  if (isCompleted) {
    return (
      <div className={styles.container}>
        <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
          <Award size={48} color="var(--accent)" />
          <h2 style={{ fontSize: '1.4rem', fontWeight: 700 }}>Scenario Complete: {scenario.title}</h2>
          <p style={{ color: 'var(--text-secondary)', maxWidth: '600px', fontSize: '0.9rem' }}>
            You successfully completed this historical market case study. Here are the core financial takeaways to carry into your trading:
          </p>
        </div>

        <div className={styles.lessonsList}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700, fontSize: '0.95rem' }}>
            <Lightbulb size={18} color="var(--accent)" />
            <span>Key Financial Lessons</span>
          </div>
          {scenario.lessonsLearned.map((lesson, idx) => (
            <div key={idx} className={styles.lessonItem}>
              <strong>{idx + 1}.</strong> {lesson}
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', justifyContent: 'center', marginTop: '16px' }}>
          <button type="button" className={styles.nextBtn} onClick={onExit}>
            Return to Scenarios Catalog
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            type="button"
            style={{ background: 'transparent', color: 'var(--text-secondary)', padding: '4px', cursor: 'pointer' }}
            onClick={onExit}
            title="Back to Catalog"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <div className={styles.title}>{scenario.title}</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              {scenario.category} | Difficulty: {scenario.difficulty} | Asset: {scenario.ticker}
            </div>
          </div>
        </div>

        <span className={styles.stepProgress}>
          Step {currentStepIdx + 1} of {totalSteps}
        </span>
      </div>

      <div className={styles.narrativeBox}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--accent)' }}>
          <Calendar size={16} />
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem', fontWeight: 700 }}>
            {step.date}
          </span>
        </div>
        <div className={styles.narrativeTitle}>{step.title}</div>
        <div className={styles.narrativeText}>{step.narrative}</div>
      </div>

      <div className={styles.decisionSection}>
        <div className={styles.promptText}>{step.prompt}</div>

        <div className={styles.optionsGrid}>
          {step.options.map((opt, idx) => {
            const isSelected = selectedOptionIdx === idx;
            return (
              <button
                key={idx}
                type="button"
                className={`${styles.optionBtn} ${isSelected ? styles.optionBtnSelected : ''}`}
                onClick={() => handleSelectOption(idx)}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {isSelected && <CheckCircle2 size={16} />}
                  <span>{opt.text}</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {selectedOptionIdx !== null && (
        <div className={styles.feedbackBox}>
          <span className={styles.feedbackTitle}>Historical Reality & Analysis</span>
          <p className={styles.feedbackText}>{step.options[selectedOptionIdx].feedback}</p>
        </div>
      )}

      <div className={styles.actionsRow}>
        <button
          type="button"
          style={{ background: 'transparent', color: 'var(--text-muted)', fontSize: '0.85rem', cursor: 'pointer' }}
          onClick={onExit}
        >
          Exit Scenario
        </button>

        <button
          type="button"
          className={styles.nextBtn}
          onClick={handleNextStep}
          disabled={selectedOptionIdx === null}
          style={{ opacity: selectedOptionIdx === null ? 0.5 : 1, cursor: selectedOptionIdx === null ? 'not-allowed' : 'pointer' }}
        >
          <span>{currentStepIdx + 1 === totalSteps ? 'Complete Scenario' : 'Proceed to Next Date'}</span>
          <ArrowRight size={16} />
        </button>
      </div>
    </div>
  );
};
