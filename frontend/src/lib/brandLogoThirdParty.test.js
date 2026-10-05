import { isThirdPartyLogoDomain } from './brandLogo';

describe('isThirdPartyLogoDomain', () => {
  it('flags pages that only mention a brand', () => {
    expect(isThirdPartyLogoDomain('www.pinterest.com')).toBe(true);
    expect(isThirdPartyLogoDomain('i.pinimg.com')).toBe(true);
    expect(isThirdPartyLogoDomain('instagram.com')).toBe(true);
    expect(isThirdPartyLogoDomain('uk.pinterest.co.uk')).toBe(true);
  });

  it('leaves brand domains alone', () => {
    expect(isThirdPartyLogoDomain('gucci.com')).toBe(false);
    expect(isThirdPartyLogoDomain('www.mtn.ng')).toBe(false);
    expect(isThirdPartyLogoDomain('notpinterest.com')).toBe(false);
    expect(isThirdPartyLogoDomain('')).toBe(false);
  });
});

describe('emailDomainMatchesBrand', () => {
  it('uses a contact domain only when it carries the brand name', () => {
    const { emailDomainMatchesBrand } = require('./brandLogo');
    expect(emailDomainMatchesBrand('gucci.com', 'Gucci')).toBe(true);
    expect(emailDomainMatchesBrand('mtn.ng', 'MTN Nigeria')).toBe(true);
    expect(emailDomainMatchesBrand('thcohqs.com', 'Gucci')).toBe(false);
    expect(emailDomainMatchesBrand('', 'Gucci')).toBe(false);
  });
});
