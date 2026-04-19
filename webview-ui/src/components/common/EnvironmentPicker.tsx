/**
 * Environment picker component
 */

import { useEnvironmentStore } from '../../state/environmentStore';
import { vscode } from '../../vscode';
import '../../styles/EnvironmentPicker.css';

export function EnvironmentPicker() {
  const { environments, activeEnvironmentId } = useEnvironmentStore();

  const handleChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const environmentId = event.target.value || null;

    // Send message for both selecting an environment and deactivating (null)
    vscode.postMessage({ type: 'selectEnvironment', environmentId });
  };

  if (environments.length === 0) {
    return (
      <div className="environment-picker">
        <span className="environment-label">No Environments</span>
      </div>
    );
  }

  return (
    <div className="environment-picker">
      <label htmlFor="environment-select" className="environment-label">
        Env
      </label>
      <select
        id="environment-select"
        className="environment-select"
        value={activeEnvironmentId || ''}
        onChange={handleChange}
      >
        <option value="">— none —</option>
        {environments.map((env) => (
          <option key={env.id} value={env.id}>
            {env.name}{env.variables.length > 0 ? ` (${env.variables.length})` : ''}
          </option>
        ))}
      </select>
    </div>
  );
}
