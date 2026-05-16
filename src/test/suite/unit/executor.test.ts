import { expect } from 'chai';
import { parseMaxTimeMs } from '../../../utils/curlFlagParser';

describe('parseMaxTimeMs()', () => {
    it('parses --max-time with a space', () => {
        expect(parseMaxTimeMs('--max-time 90')).to.equal(90000);
    });

    it('parses --max-time= syntax', () => {
        expect(parseMaxTimeMs('--max-time=90')).to.equal(90000);
    });

    it('parses a decimal value', () => {
        expect(parseMaxTimeMs('--max-time 1.5')).to.equal(1500);
    });

    it('rounds up fractional ms', () => {
        expect(parseMaxTimeMs('--max-time 0.001')).to.equal(1);
    });

    it('parses --max-time embedded among other flags', () => {
        expect(parseMaxTimeMs('--compressed --max-time 120 --verbose')).to.equal(120000);
    });

    it('returns null when --max-time is absent', () => {
        expect(parseMaxTimeMs('--compressed --verbose')).to.be.null;
    });

    it('returns null for empty string', () => {
        expect(parseMaxTimeMs('')).to.be.null;
    });
});
