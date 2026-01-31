/**
 * Loading spinner component
 */


interface LoadingSpinnerProps {
  onCancel?: () => void;
}

export function LoadingSpinner({ onCancel }: LoadingSpinnerProps) {
  return (
    <div className="loading-container">
      <div className="loading-spinner" />
      <p>Sending request...</p>
      {onCancel && (
        <button
          type="button"
          className="cancel-button btn-secondary"
          onClick={onCancel}
        >
          Cancel
        </button>
      )}
    </div>
  );
}
