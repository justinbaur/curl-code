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
