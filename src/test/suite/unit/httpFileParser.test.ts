import { expect } from 'chai';
import { HttpFileParser } from '../../../parsers/httpFileParser';
import { loadFixture } from '../../utils/testHelpers';

describe('HttpFileParser', () => {
	let parser: HttpFileParser;

	beforeEach(() => {
		parser = new HttpFileParser();
	});

	describe('parseAll()', () => {
		it('should parse single request', () => {
			const content = `GET https://api.example.com/users`;
			const requests = parser.parseAll(content);

			expect(requests).to.have.lengthOf(1);
			expect(requests[0].method).to.equal('GET');
			expect(requests[0].url).to.equal('https://api.example.com/users');
		});

		it('should parse multiple requests separated by ###', async () => {
			const content = await loadFixture('sample.http');
			const requests = parser.parseAll(content);

			expect(requests.length).to.be.greaterThan(1);
		});

		it('should parse request with headers', () => {
			const content = `GET https://api.example.com/users
Content-Type: application/json
Authorization: Bearer token123`;

			const requests = parser.parseAll(content);

			expect(requests[0].headers).to.have.lengthOf(2);
			expect(requests[0].headers[0].key).to.equal('Content-Type');
			expect(requests[0].headers[1].key).to.equal('Authorization');
		});

		it('should parse request with JSON body', () => {
			const content = `POST https://api.example.com/users
Content-Type: application/json

{
  "name": "John Doe",
  "email": "john@example.com"
}`;

			const requests = parser.parseAll(content);

			expect(requests[0].method).to.equal('POST');
			expect(requests[0].body.type).to.equal('json');
			expect(requests[0].body.content).to.include('John Doe');
		});

		it('should extract query parameters from URL', () => {
			const content = `GET https://api.example.com/users?page=1&limit=10`;

			const requests = parser.parseAll(content);

			expect(requests[0].queryParams).to.have.lengthOf(2);
			expect(requests[0].queryParams[0].key).to.equal('page');
			expect(requests[0].queryParams[0].value).to.equal('1');
			expect(requests[0].queryParams[1].key).to.equal('limit');
			expect(requests[0].queryParams[1].value).to.equal('10');
		});

		it('should skip comment lines', () => {
			const content = `# This is a comment
// This is also a comment
GET https://api.example.com/users`;

			const requests = parser.parseAll(content);

			expect(requests).to.have.lengthOf(1);
			expect(requests[0].method).to.equal('GET');
		});

		it('should parse request name from # or ##', () => {
			const content = `# Get Users List
GET https://api.example.com/users`;

			const requests = parser.parseAll(content);

			expect(requests[0].name).to.equal('Get Users List');
		});

		it('should detect body type from Content-Type header', () => {
			const content1 = `POST https://api.example.com/users
Content-Type: application/json

{"name":"John"}`;

			const content2 = `POST https://api.example.com/users
Content-Type: application/x-www-form-urlencoded

name=John&age=30`;

			const requests1 = parser.parseAll(content1);
			const requests2 = parser.parseAll(content2);

			expect(requests1[0].body.type).to.equal('json');
			expect(requests2[0].body.type).to.equal('x-www-form-urlencoded');
		});

		it('should handle empty file', () => {
			const content = '';
			const requests = parser.parseAll(content);

			expect(requests).to.have.lengthOf(0);
		});

		it('should handle file with only comments', () => {
			const content = `# Comment 1
// Comment 2
### Separator`;

			const requests = parser.parseAll(content);

			expect(requests).to.have.lengthOf(0);
		});
	});

	describe('fixture: all-methods.http', () => {
		it('should parse all seven HTTP methods', async () => {
			const content = await loadFixture('all-methods.http');
			const requests = parser.parseAll(content);

			expect(requests).to.have.lengthOf(7);
			const methods = requests.map(r => r.method);
			expect(methods).to.deep.equal(['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS']);
		});

		it('should auto-generate names from URL when no # name comment', async () => {
			const content = await loadFixture('all-methods.http');
			const requests = parser.parseAll(content);

			// ### comments are separators, not names — names come from # or ##
			// Without a name comment, the parser generates from method + last URL segment
			expect(requests[0].name).to.equal('GET get');
			expect(requests[4].name).to.equal('DELETE delete');
		});
	});

	describe('fixture: comments-and-names.http', () => {
		it('should parse names from # and ## prefixes', async () => {
			const content = await loadFixture('comments-and-names.http');
			const requests = parser.parseAll(content);

			expect(requests).to.have.lengthOf(5);
			expect(requests[0].name).to.equal('Single hash name');
			expect(requests[1].name).to.equal('Double hash name');
		});

		it('should support special characters in names', async () => {
			const content = await loadFixture('comments-and-names.http');
			const requests = parser.parseAll(content);

			expect(requests[2].name).to.equal('Name with special chars: GET /users (v2)');
		});

		it('should use last name comment before a request', async () => {
			const content = await loadFixture('comments-and-names.http');
			const requests = parser.parseAll(content);

			// "# Comment before name" is a comment, "# Actual Name" is the name
			expect(requests[3].name).to.equal('Actual Name');
		});

		it('should skip JS-style comments', async () => {
			const content = await loadFixture('comments-and-names.http');
			const requests = parser.parseAll(content);

			expect(requests[4].url).to.equal('https://httpbin.org/ip');
		});
	});

	describe('fixture: variables.http', () => {
		it('should resolve variables in URL path segments', async () => {
			const content = await loadFixture('variables.http');
			const requests = parser.parseAll(content);

			expect(requests[0].url).to.equal('https://httpbin.org/anything/api/users');
		});

		it('should resolve variables in header values', async () => {
			const content = await loadFixture('variables.http');
			const requests = parser.parseAll(content);

			expect(requests[1].headers[0].value).to.equal('Bearer abc123');
			expect(requests[1].headers[1].value).to.equal('application/json');
		});

		it('should resolve variables embedded within strings', async () => {
			const content = await loadFixture('variables.http');
			const requests = parser.parseAll(content);

			expect(requests[1].headers[2].value).to.equal('prefix-abc123-suffix');
		});

		it('should resolve variables in request body', async () => {
			const content = await loadFixture('variables.http');
			const requests = parser.parseAll(content);

			expect(requests[2].body.content).to.include('"abc123"');
			expect(requests[2].body.content).to.include('https://httpbin.org/anything/callback');
		});

		it('should leave unresolved variables as {{name}}', async () => {
			const content = await loadFixture('variables.http');
			const requests = parser.parseAll(content);

			const url = requests[3].url;
			expect(url.includes('{{undefinedVar}}') || url.includes('%7B%7BundefinedVar%7D%7D')).to.be.true;
		});

		it('should resolve multiple variables in query string', async () => {
			const content = await loadFixture('variables.http');
			const requests = parser.parseAll(content);

			// The last request has ?token={{token}} which gets extracted as a query param
			const tokenParam = requests[4].queryParams.find(p => p.key === 'token');
			expect(tokenParam).to.not.be.undefined;
			expect(tokenParam!.value).to.equal('abc123');
		});
	});

	describe('fixture: body-types.http', () => {
		it('should detect JSON body type from Content-Type', async () => {
			const content = await loadFixture('body-types.http');
			const requests = parser.parseAll(content);

			expect(requests[0].body.type).to.equal('json');
		});

		it('should parse JSON array body', async () => {
			const content = await loadFixture('body-types.http');
			const requests = parser.parseAll(content);

			expect(requests[1].body.type).to.equal('json');
			const parsed = JSON.parse(requests[1].body.content);
			expect(parsed).to.be.an('array').with.lengthOf(2);
		});

		it('should detect form-urlencoded body type', async () => {
			const content = await loadFixture('body-types.http');
			const requests = parser.parseAll(content);

			expect(requests[2].body.type).to.equal('x-www-form-urlencoded');
			expect(requests[2].body.content).to.include('username=john');
		});

		it('should treat text/plain as raw body type', async () => {
			const content = await loadFixture('body-types.http');
			const requests = parser.parseAll(content);

			expect(requests[3].body.type).to.equal('raw');
			expect(requests[3].body.content).to.include('plain text content');
		});

		it('should treat XML as raw body type', async () => {
			const content = await loadFixture('body-types.http');
			const requests = parser.parseAll(content);

			expect(requests[4].body.type).to.equal('raw');
			expect(requests[4].body.content).to.include('<user>');
		});

		it('should auto-detect JSON when no Content-Type header', async () => {
			const content = await loadFixture('body-types.http');
			const requests = parser.parseAll(content);

			expect(requests[5].body.type).to.equal('json');
			expect(requests[5].body.content).to.include('"auto"');
		});

		it('should fall back to raw for invalid JSON-like body', async () => {
			const content = await loadFixture('body-types.http');
			const requests = parser.parseAll(content);

			expect(requests[6].body.type).to.equal('raw');
		});

		it('should handle POST with no body', async () => {
			const content = await loadFixture('body-types.http');
			const requests = parser.parseAll(content);

			expect(requests[7].method).to.equal('POST');
			expect(requests[7].body.type).to.equal('none');
			expect(requests[7].body.content).to.equal('');
		});
	});

	describe('fixture: query-params.http', () => {
		it('should extract single query param', async () => {
			const content = await loadFixture('query-params.http');
			const requests = parser.parseAll(content);

			expect(requests[0].queryParams).to.have.lengthOf(1);
			expect(requests[0].queryParams[0]).to.deep.include({ key: 'q', value: 'hello' });
		});

		it('should extract multiple query params', async () => {
			const content = await loadFixture('query-params.http');
			const requests = parser.parseAll(content);

			expect(requests[1].queryParams).to.have.lengthOf(4);
			expect(requests[1].queryParams[0]).to.deep.include({ key: 'page', value: '1' });
			expect(requests[1].queryParams[3]).to.deep.include({ key: 'order', value: 'asc' });
		});

		it('should decode percent-encoded values', async () => {
			const content = await loadFixture('query-params.http');
			const requests = parser.parseAll(content);

			expect(requests[2].queryParams[0].value).to.equal('hello world');
		});

		it('should return empty array when no query params', async () => {
			const content = await loadFixture('query-params.http');
			const requests = parser.parseAll(content);

			expect(requests[4].queryParams).to.have.lengthOf(0);
		});

		it('should strip query params from the URL', async () => {
			const content = await loadFixture('query-params.http');
			const requests = parser.parseAll(content);

			expect(requests[1].url).to.not.include('?');
			expect(requests[1].url).to.equal('https://httpbin.org/get');
		});

		it('should handle URL with port and query params', async () => {
			const content = await loadFixture('query-params.http');
			const requests = parser.parseAll(content);

			expect(requests[6].url).to.equal('https://httpbin.org:8443/anything/items');
			expect(requests[6].queryParams).to.have.lengthOf(2);
		});
	});

	describe('fixture: http-version.http', () => {
		it('should strip HTTP version from URL', async () => {
			const content = await loadFixture('http-version.http');
			const requests = parser.parseAll(content);

			expect(requests).to.have.lengthOf(4);
			expect(requests[0].url).to.equal('https://httpbin.org/get');
			expect(requests[0].method).to.equal('GET');
		});

		it('should parse body regardless of HTTP version', async () => {
			const content = await loadFixture('http-version.http');
			const requests = parser.parseAll(content);

			expect(requests[1].method).to.equal('POST');
			expect(requests[1].body.type).to.equal('json');
		});

		it('should handle HTTP/2', async () => {
			const content = await loadFixture('http-version.http');
			const requests = parser.parseAll(content);

			expect(requests[2].url).to.equal('https://httpbin.org/anything');
		});
	});

	describe('fixture: whitespace-edge-cases.http', () => {
		it('should skip leading blank lines', async () => {
			const content = await loadFixture('whitespace-edge-cases.http');
			const requests = parser.parseAll(content);

			expect(requests[0].url).to.equal('https://httpbin.org/get');
		});

		it('should skip extra blank lines between separator and request', async () => {
			const content = await loadFixture('whitespace-edge-cases.http');
			const requests = parser.parseAll(content);

			expect(requests[1].method).to.equal('POST');
			expect(requests[1].url).to.equal('https://httpbin.org/post');
		});

		it('should parse all requests despite whitespace variations', async () => {
			const content = await loadFixture('whitespace-edge-cases.http');
			const requests = parser.parseAll(content);

			expect(requests.length).to.be.greaterThanOrEqual(4);
		});
	});

	describe('fixture: case-insensitive.http', () => {
		it('should normalize lowercase methods to uppercase', async () => {
			const content = await loadFixture('case-insensitive.http');
			const requests = parser.parseAll(content);

			expect(requests[0].method).to.equal('GET');
		});

		it('should normalize mixed case methods', async () => {
			const content = await loadFixture('case-insensitive.http');
			const requests = parser.parseAll(content);

			expect(requests[1].method).to.equal('POST');
		});

		it('should parse body with case-insensitive method', async () => {
			const content = await loadFixture('case-insensitive.http');
			const requests = parser.parseAll(content);

			expect(requests[3].method).to.equal('PATCH');
			expect(requests[3].body.type).to.equal('json');
		});
	});

	describe('fixture: multiple-headers.http', () => {
		it('should parse many headers on one request', async () => {
			const content = await loadFixture('multiple-headers.http');
			const requests = parser.parseAll(content);

			expect(requests[0].headers).to.have.lengthOf(8);
		});

		it('should preserve duplicate header names', async () => {
			const content = await loadFixture('multiple-headers.http');
			const requests = parser.parseAll(content);

			const acceptHeaders = requests[1].headers.filter(h => h.key === 'Accept');
			expect(acceptHeaders).to.have.lengthOf(2);
		});

		it('should preserve colons in header values', async () => {
			const content = await loadFixture('multiple-headers.http');
			const requests = parser.parseAll(content);

			const timestamp = requests[3].headers.find(h => h.key === 'X-Timestamp');
			expect(timestamp).to.not.be.undefined;
			expect(timestamp!.value).to.equal('2026-02-22T10:30:00Z');
		});
	});

	describe('fixture: empty and minimal files', () => {
		it('should return empty array for empty file', async () => {
			const content = await loadFixture('empty.http');
			const requests = parser.parseAll(content);

			expect(requests).to.have.lengthOf(0);
		});

		it('should return empty array for comments-only file', async () => {
			const content = await loadFixture('comments-only.http');
			const requests = parser.parseAll(content);

			expect(requests).to.have.lengthOf(0);
		});

		it('should parse single-line request file', async () => {
			const content = await loadFixture('single-request.http');
			const requests = parser.parseAll(content);

			expect(requests).to.have.lengthOf(1);
			expect(requests[0].method).to.equal('GET');
			expect(requests[0].url).to.equal('https://httpbin.org/get');
		});
	});

	describe('fixture: no-separator.http', () => {
		it('should treat file without ### as a single block', async () => {
			const content = await loadFixture('no-separator.http');
			const requests = parser.parseAll(content);

			// Without separators, only the first request line is found
			// The second GET line is treated as a header (and won't match header regex)
			expect(requests).to.have.lengthOf(1);
			expect(requests[0].method).to.equal('GET');
			expect(requests[0].url).to.equal('https://httpbin.org/get');
		});
	});

	describe('fixture: multiline-body.http', () => {
		it('should preserve full multiline JSON body', async () => {
			const content = await loadFixture('multiline-body.http');
			const requests = parser.parseAll(content);

			const body = JSON.parse(requests[0].body.content);
			expect(body.query).to.be.a('string');
			expect(body.variables.limit).to.equal(10);
		});

		it('should preserve deeply nested JSON body', async () => {
			const content = await loadFixture('multiline-body.http');
			const requests = parser.parseAll(content);

			const body = JSON.parse(requests[1].body.content);
			expect(body.operations).to.be.an('array').with.lengthOf(2);
			expect(body.operations[0].data.tags).to.deep.equal(['a', 'b', 'c']);
			expect(body.options.atomic).to.be.true;
		});
	});

	describe('fixture: sample.http', () => {
		it('should parse all four requests', async () => {
			const content = await loadFixture('sample.http');
			const requests = parser.parseAll(content);

			expect(requests).to.have.lengthOf(4);
		});

		it('should resolve file-level variables across all requests', async () => {
			const content = await loadFixture('sample.http');
			const requests = parser.parseAll(content);

			for (const req of requests) {
				expect(req.url).to.include('https://httpbin.org');
				expect(req.url).to.not.include('{{baseUrl}}');
			}
		});

		it('should resolve token variable in Authorization headers', async () => {
			const content = await loadFixture('sample.http');
			const requests = parser.parseAll(content);

			const authHeader = requests[0].headers.find(h => h.key === 'Authorization');
			expect(authHeader).to.not.be.undefined;
			expect(authHeader!.value).to.equal('Bearer test-token-12345');
		});
	});

	describe('parseAtPosition()', () => {
		it('should parse request at specific line number', () => {
			const content = `GET https://api.example.com/users

###

POST https://api.example.com/users
Content-Type: application/json`;

			const request = parser.parseAtPosition(content, 4);

			expect(request).to.not.be.null;
			expect(request!.method).to.equal('POST');
		});

		it('should return null if no request at position', () => {
			const content = `GET https://api.example.com/users`;

			const request = parser.parseAtPosition(content, 100);

			expect(request).to.be.null;
		});
	});

	describe('getVariables()', () => {
		it('should extract variable definitions', () => {
			const content = `@baseUrl = https://api.example.com
@token = my-secret-token

GET {{baseUrl}}/users
Authorization: Bearer {{token}}`;

			const variables = parser.getVariables(content);

			expect(variables.size).to.equal(2);
			expect(variables.get('baseUrl')).to.equal('https://api.example.com');
			expect(variables.get('token')).to.equal('my-secret-token');
		});

		it('should resolve variables in URL and headers', () => {
			const content = `@baseUrl = https://api.example.com
@token = secret

GET {{baseUrl}}/users
Authorization: Bearer {{token}}`;

			const requests = parser.parseAll(content);

			expect(requests[0].url).to.equal('https://api.example.com/users');
			expect(requests[0].headers[0].value).to.equal('Bearer secret');
		});

		it('should leave unresolved variables as-is', () => {
			const content = `GET https://api.example.com/{{endpoint}}`;

			const requests = parser.parseAll(content);

			// Query params are extracted, but the path with unresolved variable stays
			// URL parsing may encode the curly braces
			const url = requests[0].url;
			expect(url.includes('/{{endpoint}}') || url.includes('%7B%7Bendpoint%7D%7D')).to.be.true;
		});
	});
});
