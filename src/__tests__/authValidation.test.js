// tests/authValidation.test.js

const {
  validateEmailFormat,
  enforceEduDomain,
  checkApprovedEduDomain,
  validateDisplayName,
  checkUserAlreadyLoggedIn,
} = require('../test_services/authValidation');

describe('Auth Validation Logic', () => {
  describe('validateEmailFormat', () => {
    it('should accept a valid email', () => {
      expect(() => validateEmailFormat('test@school.edu')).not.toThrow();
    });

    it('should reject an invalid email format', () => {
      expect(() => validateEmailFormat('invalid-email')).toThrow('Invalid email format');
    });
  });

  describe('enforceEduDomain', () => {
    it('should allow an email ending in .edu', () => {
      expect(() => enforceEduDomain('user@university.edu')).not.toThrow();
    });

    it('should reject an email not ending in .edu', () => {
      expect(() => enforceEduDomain('user@gmail.com')).toThrow('Only .edu email addresses are allowed');
    });
  });

  describe('checkApprovedEduDomain', () => {
    const allowed = ['harvard.edu', 'mit.edu'];

    it('should allow an email from an approved domain', () => {
      expect(() => checkApprovedEduDomain('alice@mit.edu', allowed)).not.toThrow();
    });

    it('should reject an email from an unapproved .edu domain', () => {
      expect(() => checkApprovedEduDomain('bob@random.edu', allowed)).toThrow('Unauthorized domain');
    });
  });

  describe('validateDisplayName', () => {
    it('should allow a clean display name', () => {
      expect(() => validateDisplayName('Alice Smith')).not.toThrow();
    });

    it('should reject a display name with special characters', () => {
      expect(() => validateDisplayName('Alice$mith!')).toThrow('Invalid display name');
    });
  });

  describe('checkUserAlreadyLoggedIn', () => {
    const userCache = new Set(['already@school.edu']);

    it('should allow login if user is not in cache', () => {
      expect(() => checkUserAlreadyLoggedIn('new@school.edu', userCache)).not.toThrow();
    });

    it('should block login if user is already in cache', () => {
      expect(() => checkUserAlreadyLoggedIn('already@school.edu', userCache)).toThrow('User already logged in');
    });
  });
});
