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
    return null;
  }

  const activeEnv = environments.find((env) => env.id === activeEnvironmentId);

  return (
    <div className="environment-picker">
      <label htmlFor="environment-select" className="environment-label">
        <span className="codicon codicon-globe"></span>
        Environment:
      </label>
      <select
        id="environment-select"
        className="environment-select"
        value={activeEnvironmentId || ''}
        onChange={handleChange}
      >
        <option value="">No Environment</option>
        {environments.map((env) => (
          <option key={env.id} value={env.id}>
            {env.name} ({env.variables.length} vars)
          </option>
        ))}
      </select>
      {activeEnv && activeEnv.variables.length > 0 && (
        <div className="environment-info">
          <span className="variable-count">
            {activeEnv.variables.filter((v) => v.enabled).length} active variables
          </span>
        </div>
      )}
    </div>
  );
}
