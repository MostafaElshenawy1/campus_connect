// services/authValidation.js

function validateEmailFormat(email) {
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error('Invalid email format');
  }
}

function enforceEduDomain(email) {
  if (!email.endsWith('.edu')) {
    throw new Error('Only .edu email addresses are allowed');
  }
}

function checkApprovedEduDomain(email, allowedDomains) {
  const domain = email.split('@')[1];
  if (!allowedDomains.includes(domain)) {
    throw new Error('Unauthorized domain');
  }
}

function validateDisplayName(name) {
  if (!/^[a-zA-Z\s]+$/.test(name)) {
    throw new Error('Invalid display name');
  }
}

function checkUserAlreadyLoggedIn(email, cache) {
  if (cache.has(email)) {
    throw new Error('User already logged in');
  }
}

module.exports = {
  validateEmailFormat,
  enforceEduDomain,
  checkApprovedEduDomain,
  validateDisplayName,
  checkUserAlreadyLoggedIn,
};
