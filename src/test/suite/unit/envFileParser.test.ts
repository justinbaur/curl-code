import { expect } from 'chai';
import { parseEnvFileContent } from '../../../parsers/envFileParser';

describe('envFileParser', () => {
	describe('parseEnvFileContent()', () => {
		it('should parse basic KEY=VALUE pairs', () => {
			const content = 'API_URL=http://localhost:3000\nAPI_KEY=abc123';
			const vars = parseEnvFileContent(content);

			expect(vars).to.have.lengthOf(2);
			expect(vars[0].key).to.equal('API_URL');
			expect(vars[0].value).to.equal('http://localhost:3000');
			expect(vars[1].key).to.equal('API_KEY');
			expect(vars[1].value).to.equal('abc123');
		});

		it('should skip empty lines and comments', () => {
			const content = `# This is a comment
API_URL=http://localhost:3000

# Another comment
API_KEY=abc123
`;
			const vars = parseEnvFileContent(content);

			expect(vars).to.have.lengthOf(2);
			expect(vars[0].key).to.equal('API_URL');
			expect(vars[1].key).to.equal('API_KEY');
		});

		it('should handle double-quoted values', () => {
			const content = 'MESSAGE="hello world"';
			const vars = parseEnvFileContent(content);

			expect(vars).to.have.lengthOf(1);
			expect(vars[0].value).to.equal('hello world');
		});

		it('should handle single-quoted values', () => {
			const content = "MESSAGE='hello world'";
			const vars = parseEnvFileContent(content);

			expect(vars).to.have.lengthOf(1);
			expect(vars[0].value).to.equal('hello world');
		});

		it('should strip export prefix', () => {
			const content = 'export API_URL=http://localhost:3000';
			const vars = parseEnvFileContent(content);

			expect(vars).to.have.lengthOf(1);
			expect(vars[0].key).to.equal('API_URL');
			expect(vars[0].value).to.equal('http://localhost:3000');
		});

		it('should handle values with equals signs', () => {
			const content = 'CONNECTION_STRING=host=localhost;port=5432';
			const vars = parseEnvFileContent(content);

			expect(vars).to.have.lengthOf(1);
			expect(vars[0].key).to.equal('CONNECTION_STRING');
			expect(vars[0].value).to.equal('host=localhost;port=5432');
		});

		it('should handle empty values', () => {
			const content = 'EMPTY_VAR=';
			const vars = parseEnvFileContent(content);

			expect(vars).to.have.lengthOf(1);
			expect(vars[0].key).to.equal('EMPTY_VAR');
			expect(vars[0].value).to.equal('');
		});

		it('should skip lines without equals sign', () => {
			const content = 'INVALID_LINE\nAPI_KEY=abc123';
			const vars = parseEnvFileContent(content);

			expect(vars).to.have.lengthOf(1);
			expect(vars[0].key).to.equal('API_KEY');
		});

		it('should handle Windows-style line endings', () => {
			const content = 'KEY1=value1\r\nKEY2=value2\r\n';
			const vars = parseEnvFileContent(content);

			expect(vars).to.have.lengthOf(2);
			expect(vars[0].key).to.equal('KEY1');
			expect(vars[1].key).to.equal('KEY2');
		});

		it('should trim whitespace around keys and values', () => {
			const content = '  API_KEY  =  some_value  ';
			const vars = parseEnvFileContent(content);

			expect(vars).to.have.lengthOf(1);
			expect(vars[0].key).to.equal('API_KEY');
			expect(vars[0].value).to.equal('some_value');
		});

		it('should return empty array for empty content', () => {
			const vars = parseEnvFileContent('');
			expect(vars).to.have.lengthOf(0);
		});

		it('should return empty array for comments-only content', () => {
			const content = '# comment 1\n# comment 2\n';
			const vars = parseEnvFileContent(content);
			expect(vars).to.have.lengthOf(0);
		});

		it('should handle export with quoted values', () => {
			const content = 'export SECRET="my secret value"';
			const vars = parseEnvFileContent(content);

			expect(vars).to.have.lengthOf(1);
			expect(vars[0].key).to.equal('SECRET');
			expect(vars[0].value).to.equal('my secret value');
		});
	});
});
