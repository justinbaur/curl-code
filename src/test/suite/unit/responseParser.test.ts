import { expect } from 'chai';
import { ResponseParser } from '../../../curl/responseParser';
import { loadFixture } from '../../utils/testHelpers';

describe('ResponseParser', () => {
	let parser: ResponseParser;

	beforeEach(() => {
		parser = new ResponseParser();
	});

	describe('parse()', () => {
		it('should parse successful 200 OK response', async () => {
			const stdout = await loadFixture('curl-output.txt');
			const response = parser.parse(stdout, 245, 'curl -X GET https://api.example.com');

			expect(response.status).to.equal(200);
			expect(response.statusText).to.equal('OK');
			expect(response.curlCommand).to.equal('curl -X GET https://api.example.com');
		});

		it('should parse response headers', async () => {
			const stdout = await loadFixture('curl-output.txt');
			const response = parser.parse(stdout, 245, 'curl ...');

			expect(response.headers).to.be.an('object');
			expect(response.headers['content-type']).to.exist;
		});

		it('should parse response body', async () => {
			const stdout = await loadFixture('curl-output.txt');
			const response = parser.parse(stdout, 245, 'curl ...');

			expect(response.body).to.be.a('string');
			expect(response.body.length).to.be.greaterThan(0);
		});

		it('should detect content type from headers', async () => {
			const stdout = await loadFixture('curl-output.txt');
			const response = parser.parse(stdout, 245, 'curl ...');

			expect(response.contentType).to.be.a('string');
		});

		it('should parse redirect chain and use final response', async () => {
			const stdout = await loadFixture('curl-redirect-output.txt');
			const response = parser.parse(stdout, 345, 'curl ...');

			// Should use the LAST response in the chain
			expect(response.status).to.equal(200);
			expect(response.statusText).to.equal('OK');
		});

		it('should parse error responses', async () => {
			const stdout = await loadFixture('curl-error-output.txt');
			const response = parser.parse(stdout, 123, 'curl ...');

			expect(response.status).to.be.greaterThanOrEqual(400);
		});

		it('should handle empty body responses', () => {
			const stdout = `HTTP/1.1 204 No Content
Content-Length: 0

---CURL_INFO---
204
0.123
0`;
			const response = parser.parse(stdout, 123, 'curl ...');

			expect(response.status).to.equal(204);
			expect(response.body).to.equal('');
		});

		it('should parse curl info (status, time, size)', () => {
			const stdout = `HTTP/1.1 200 OK
Content-Type: application/json

{"result":"success"}
---CURL_INFO---
200
0.456
100`;
			const response = parser.parse(stdout, 500, 'curl ...');

			expect(response.status).to.equal(200);
			expect(response.time).to.equal(456); // ms
			expect(response.size).to.equal(100);
		});

		it('should calculate size from body if not provided', () => {
			const stdout = `HTTP/1.1 200 OK

{"test":"data"}
---CURL_INFO---
200
0.123
0`; // Size = 0 in info
			const response = parser.parse(stdout, 123, 'curl ...');

			expect(response.size).to.be.greaterThan(0);
		});

		it('should use total time if curl time not available', () => {
			const stdout = `HTTP/1.1 200 OK

{}
---CURL_INFO---
200
0
0`;
			const response = parser.parse(stdout, 789, 'curl ...');

			expect(response.time).to.equal(789);
		});

		it('should handle malformed response gracefully', () => {
			const stdout = 'This is not a valid HTTP response\n---CURL_INFO---\n0\n0\n0';

			expect(() => {
				parser.parse(stdout, 100, 'curl ...');
			}).to.not.throw();
		});

		it('should handle both CRLF and LF line endings', () => {
			const stdoutCRLF = `HTTP/1.1 200 OK\r\nContent-Type: text/plain\r\n\r\nBody`;
			const stdoutLF = `HTTP/1.1 200 OK\nContent-Type: text/plain\n\nBody`;

			const responseCRLF = parser.parse(stdoutCRLF + '\n---CURL_INFO---\n200\n0.1\n4', 100, 'curl ...');
			const responseLF = parser.parse(stdoutLF + '\n---CURL_INFO---\n200\n0.1\n4', 100, 'curl ...');

			expect(responseCRLF.body).to.equal('Body');
			expect(responseLF.body).to.equal('Body');
		});
	});

	describe('formatBody()', () => {
		it('should pretty-print JSON bodies', () => {
			const body = '{"name":"John","age":30}';
			const formatted = parser.formatBody(body, 'application/json');

			expect(formatted).to.include('\n'); // Should be indented
			expect(formatted).to.include('  '); // 2-space indent
		});

		it('should leave non-JSON bodies unchanged', () => {
			const body = 'Plain text response';
			const formatted = parser.formatBody(body, 'text/plain');

			expect(formatted).to.equal(body);
		});

		it('should handle invalid JSON gracefully', () => {
			const body = '{invalid json}';
			const formatted = parser.formatBody(body, 'application/json');

			expect(formatted).to.equal(body); // Returns original
		});
	});

	describe('getStatusText()', () => {
		it('should return correct status text for common codes', () => {
			expect(parser.getStatusText(200)).to.equal('OK');
			expect(parser.getStatusText(201)).to.equal('Created');
			expect(parser.getStatusText(404)).to.equal('Not Found');
			expect(parser.getStatusText(500)).to.equal('Internal Server Error');
		});

		it('should return empty string for unknown status codes', () => {
			expect(parser.getStatusText(999)).to.equal('');
		});
	});
});
