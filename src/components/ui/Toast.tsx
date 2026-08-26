import React from 'react';
import { useUIStore } from '../../store';
import { CheckCircle2, AlertCircle, Info } from 'lucide-react';
import styles from './Toast.module.css';

export const ToastContainer: React.FC = () => {
  const { toasts, removeToast } = useUIStore();

  if (toasts.length === 0) return null;

  return (
    <div className={styles.toastContainer}>
      {toasts.map((t) => {
        let icon = <Info size={18} />;
        let toastClass = styles.info;
        if (t.type === 'success') {
          icon = <CheckCircle2 size={18} />;
          toastClass = styles.success;
        } else if (t.type === 'error') {
          icon = <AlertCircle size={18} />;
          toastClass = styles.error;
        }

        return (
          <div
            key={t.id}
            className={`${styles.toast} ${toastClass}`}
            onClick={() => removeToast(t.id)}
          >
            {icon}
            <span>{t.message}</span>
          </div>
        );
      })}
    </div>
  );
};
