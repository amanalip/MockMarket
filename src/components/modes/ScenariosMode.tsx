import { ScenarioCatalog } from '../scenarios/ScenarioCatalog';
import styles from '../../App.module.css';

export default function ScenariosMode() {
  return (
    <div className={styles.modeStack}>
      <ScenarioCatalog />
    </div>
  );
}
