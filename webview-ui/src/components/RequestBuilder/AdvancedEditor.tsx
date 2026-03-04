/**
 * Advanced cURL flags editor component — chip grid layout
 */

import { useState } from 'react';
import type { AdvancedOptions, HttpVersion, TlsVersion } from '../../vscode';

interface AdvancedEditorProps {
  advanced: AdvancedOptions;
  onChange: (advanced: AdvancedOptions) => void;
}

const HTTP_VERSIONS: { value: HttpVersion; label: string }[] = [
  { value: 'default', label: 'Default' },
  { value: 'http1.0', label: 'HTTP/1.0' },
  { value: 'http1.1', label: 'HTTP/1.1' },
  { value: 'http2', label: 'HTTP/2' },
  { value: 'http2-prior-knowledge', label: 'HTTP/2 (Prior Knowledge)' },
  { value: 'http3', label: 'HTTP/3' },
  { value: 'http3-only', label: 'HTTP/3 Only' },
];

const TLS_VERSIONS: { value: TlsVersion; label: string }[] = [
  { value: 'default', label: 'Default' },
  { value: 'tlsv1.0', label: 'TLS 1.0' },
  { value: 'tlsv1.1', label: 'TLS 1.1' },
  { value: 'tlsv1.2', label: 'TLS 1.2' },
  { value: 'tlsv1.3', label: 'TLS 1.3' },
];

type SectionId =
  | 'httpVersion'
  | 'connection'
  | 'cookies'
  | 'proxy'
  | 'ssl'
  | 'redirects'
  | 'retry'
  | 'debug'
  | 'authExt'
  | 'dns'
  | 'rate'
  | 'other';

export function AdvancedEditor({ advanced, onChange }: AdvancedEditorProps) {
  const [selectedSection, setSelectedSection] = useState<SectionId | null>(null);

  const handleChange = (field: keyof AdvancedOptions, value: string | boolean) => {
    onChange({ ...advanced, [field]: value });
  };

  const renderTextInput = (
    field: keyof AdvancedOptions,
    label: string,
    placeholder?: string,
  ) => (
    <div className="advanced-field">
      <label htmlFor={`adv-${field}`}>{label}</label>
      <input
        id={`adv-${field}`}
        type="text"
        value={String(advanced[field] || '')}
        onChange={(e) => handleChange(field, e.target.value)}
        placeholder={placeholder}
        style={{ fontFamily: 'var(--font-mono)' }}
      />
    </div>
  );

  const renderToggle = (field: keyof AdvancedOptions, label: string) => (
    <div className="advanced-toggle">
      <input
        id={`adv-${field}`}
        type="checkbox"
        checked={Boolean(advanced[field])}
        onChange={(e) => handleChange(field, e.target.checked)}
      />
      <label htmlFor={`adv-${field}`}>{label}</label>
    </div>
  );

  const sections: { id: SectionId; label: string; badge: number; render: () => React.ReactNode }[] = [
    {
      id: 'httpVersion',
      label: 'HTTP Version',
      badge: advanced.httpVersion !== 'default' ? 1 : 0,
      render: () => (
        <div className="advanced-field">
          <label htmlFor="adv-httpVersion">Protocol Version</label>
          <select
            id="adv-httpVersion"
            value={advanced.httpVersion}
            onChange={(e) => handleChange('httpVersion', e.target.value)}
          >
            {HTTP_VERSIONS.map((v) => (
              <option key={v.value} value={v.value}>{v.label}</option>
            ))}
          </select>
        </div>
      ),
    },
    {
      id: 'connection',
      label: 'Connection',
      badge:
        (advanced.connectTimeout ? 1 : 0) +
        (advanced.keepaliveTime ? 1 : 0) +
        (advanced.noKeepalive ? 1 : 0) +
        (advanced.tcpNodelay ? 1 : 0),
      render: () => (
        <>
          {renderTextInput('connectTimeout', 'Connect Timeout (seconds)', '10')}
          {renderTextInput('keepaliveTime', 'Keepalive Time (seconds)', '60')}
          {renderToggle('noKeepalive', 'Disable keepalive (--no-keepalive)')}
          {renderToggle('tcpNodelay', 'TCP no delay (--tcp-nodelay)')}
        </>
      ),
    },
    {
      id: 'cookies',
      label: 'Cookies',
      badge: (advanced.cookie ? 1 : 0) + (advanced.cookieJar ? 1 : 0),
      render: () => (
        <>
          {renderTextInput('cookie', 'Cookie (string or file path)', 'name=value; name2=value2')}
          {renderTextInput('cookieJar', 'Cookie Jar (file path)', '/path/to/cookies.txt')}
        </>
      ),
    },
    {
      id: 'proxy',
      label: 'Proxy',
      badge:
        (advanced.proxy ? 1 : 0) +
        (advanced.proxyUser ? 1 : 0) +
        (advanced.noproxy ? 1 : 0),
      render: () => (
        <>
          {renderTextInput('proxy', 'Proxy URL', 'http://proxy:8080')}
          {renderTextInput('proxyUser', 'Proxy Auth (user:password)', 'user:password')}
          {renderTextInput('noproxy', 'No Proxy (comma-separated)', 'localhost,127.0.0.1')}
        </>
      ),
    },
    {
      id: 'ssl',
      label: 'SSL / TLS',
      badge:
        (advanced.tlsVersion !== 'default' ? 1 : 0) +
        (advanced.caCert ? 1 : 0) +
        (advanced.clientCert ? 1 : 0) +
        (advanced.clientKey ? 1 : 0),
      render: () => (
        <>
          <div className="advanced-field">
            <label htmlFor="adv-tlsVersion">TLS Version</label>
            <select
              id="adv-tlsVersion"
              value={advanced.tlsVersion}
              onChange={(e) => handleChange('tlsVersion', e.target.value)}
            >
              {TLS_VERSIONS.map((v) => (
                <option key={v.value} value={v.value}>{v.label}</option>
              ))}
            </select>
          </div>
          {renderTextInput('caCert', 'CA Certificate', '/path/to/ca.pem')}
          {renderTextInput('clientCert', 'Client Certificate', '/path/to/cert.pem')}
          {renderTextInput('clientKey', 'Client Key', '/path/to/key.pem')}
        </>
      ),
    },
    {
      id: 'redirects',
      label: 'Redirects',
      badge:
        (advanced.maxRedirs ? 1 : 0) +
        (advanced.locationTrusted ? 1 : 0) +
        (advanced.post301 ? 1 : 0) +
        (advanced.post302 ? 1 : 0) +
        (advanced.post303 ? 1 : 0),
      render: () => (
        <>
          {renderTextInput('maxRedirs', 'Max Redirects', '10')}
          {renderToggle('locationTrusted', 'Send auth to redirected hosts (--location-trusted)')}
          {renderToggle('post301', 'Keep POST on 301 redirect (--post301)')}
          {renderToggle('post302', 'Keep POST on 302 redirect (--post302)')}
          {renderToggle('post303', 'Keep POST on 303 redirect (--post303)')}
        </>
      ),
    },
    {
      id: 'retry',
      label: 'Retry',
      badge:
        (advanced.retry ? 1 : 0) +
        (advanced.retryDelay ? 1 : 0) +
        (advanced.retryMaxTime ? 1 : 0),
      render: () => (
        <>
          {renderTextInput('retry', 'Retry Count', '3')}
          {renderTextInput('retryDelay', 'Retry Delay (seconds)', '1')}
          {renderTextInput('retryMaxTime', 'Retry Max Time (seconds)', '30')}
        </>
      ),
    },
    {
      id: 'debug',
      label: 'Debug & Compression',
      badge: (advanced.compressed ? 1 : 0) + (advanced.verbose ? 1 : 0),
      render: () => (
        <>
          {renderToggle('compressed', 'Auto-decompress response (--compressed)')}
          {renderToggle('verbose', 'Verbose output (--verbose)')}
        </>
      ),
    },
    {
      id: 'authExt',
      label: 'Auth Extensions',
      badge:
        (advanced.digest ? 1 : 0) +
        (advanced.ntlm ? 1 : 0) +
        (advanced.negotiate ? 1 : 0) +
        (advanced.awsSigv4 ? 1 : 0) +
        (advanced.oauth2Bearer ? 1 : 0),
      render: () => (
        <>
          {renderToggle('digest', 'Digest authentication (--digest)')}
          {renderToggle('ntlm', 'NTLM authentication (--ntlm)')}
          {renderToggle('negotiate', 'Negotiate / SPNEGO (--negotiate)')}
          {renderTextInput('awsSigv4', 'AWS Sigv4 Provider', 'aws:amz:us-east-1:s3')}
          {renderTextInput('oauth2Bearer', 'OAuth2 Bearer Token', 'token')}
        </>
      ),
    },
    {
      id: 'dns',
      label: 'DNS / Resolution',
      badge: (advanced.resolve ? 1 : 0) + (advanced.connectTo ? 1 : 0),
      render: () => (
        <>
          {renderTextInput('resolve', 'Resolve (host:port:addr)', 'example.com:443:127.0.0.1')}
          {renderTextInput('connectTo', 'Connect-to (host1:port1:host2:port2)', 'example.com:443:localhost:8443')}
        </>
      ),
    },
    {
      id: 'rate',
      label: 'Rate Limiting',
      badge: (advanced.limitRate ? 1 : 0) + (advanced.maxFilesize ? 1 : 0),
      render: () => (
        <>
          {renderTextInput('limitRate', 'Limit Rate', '100K')}
          {renderTextInput('maxFilesize', 'Max Filesize (bytes)', '1048576')}
        </>
      ),
    },
    {
      id: 'other',
      label: 'Other',
      badge: (advanced.userAgent ? 1 : 0) + (advanced.referer ? 1 : 0),
      render: () => (
        <>
          {renderTextInput('userAgent', 'User-Agent', 'Mozilla/5.0...')}
          {renderTextInput('referer', 'Referer URL', 'https://example.com')}
        </>
      ),
    },
  ];

  const activeSection = sections.find((s) => s.id === selectedSection);

  return (
    <div className="advanced-editor">
      <div className="advanced-chip-grid">
        {sections.map((section) => (
          <button
            key={section.id}
            type="button"
            className={`advanced-chip${selectedSection === section.id ? ' active' : ''}`}
            onClick={() =>
              setSelectedSection(selectedSection === section.id ? null : section.id)
            }
          >
            {section.label}
            {section.badge > 0 && <span className="chip-badge" />}
          </button>
        ))}
      </div>

      {activeSection && (
        <div className="advanced-detail-pane">
          {activeSection.render()}
        </div>
      )}

      <div className="advanced-custom-flags">
        <div className="advanced-field">
          <label htmlFor="adv-rawFlags">Additional cURL Flags</label>
          <textarea
            id="adv-rawFlags"
            className="advanced-raw-flags"
            value={advanced.rawFlags}
            onChange={(e) => handleChange('rawFlags', e.target.value)}
            placeholder='--header "X-Custom: value" --compressed'
          />
          <span className="advanced-help-text">
            Enter additional cURL flags. Quoted strings are supported. These are appended after all other flags.
          </span>
        </div>
      </div>
    </div>
  );
}
