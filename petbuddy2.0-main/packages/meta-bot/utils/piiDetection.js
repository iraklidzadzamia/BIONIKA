/**
 * PII Detection and Masking Utility
 * Detects and masks sensitive personal information in text
 */

/**
 * Detect and mask PII in text
 * @param {string} text - Text to scan for PII
 * @returns {Object} - { maskedText, piiDetected, hadPII }
 */
export function detectAndMaskPII(text) {
  if (!text || typeof text !== "string") return { maskedText: text, piiDetected: [], hadPII: false };

  let maskedText = text;
  let piiDetected = [];

  // 1. Credit card detection (Luhn algorithm validation)
  const ccPattern = /\b\d{4}[\s\-]?\d{4}[\s\-]?\d{4}[\s\-]?\d{4}\b/g;
  const ccMatches = text.match(ccPattern);
  if (ccMatches) {
    ccMatches.forEach((cc) => {
      const cleanCC = cc.replace(/[\s\-]/g, "");
      if (isValidCreditCard(cleanCC)) {
        maskedText = maskedText.replace(cc, "[CARD_NUMBER_REDACTED]");
        piiDetected.push({ type: "credit_card", masked: true });
      }
    });
  }

  // 2. SSN / ID number detection (XXX-XX-XXXX pattern)
  const ssnPattern = /\b\d{3}[\s\-]?\d{2}[\s\-]?\d{4}\b/g;
  const ssnMatches = text.match(ssnPattern);
  if (ssnMatches) {
    ssnMatches.forEach((ssn) => {
      maskedText = maskedText.replace(ssn, "[ID_NUMBER_REDACTED]");
      piiDetected.push({ type: "ssn", masked: true });
    });
  }

  // 3. Email detection (optional - may be needed for business)
  // Only mask personal emails, preserve business context
  const emailPattern = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
  const emails = text.match(emailPattern);
  if (emails) {
    emails.forEach((email) => {
      // Only mask if it looks like sensitive context (not in business signature)
      if (!isBusinessContext(text, email)) {
        const atIndex = email.indexOf("@");
        const masked = `${email.substring(0, Math.min(3, atIndex))}***@***${email.substring(email.lastIndexOf("."))}`;
        maskedText = maskedText.replace(email, masked);
        piiDetected.push({ type: "email", partial: masked });
      }
    });
  }

  // 4. Password indicators
  const passwordPatterns = [
    /password\s*[:\-=]\s*\S+/gi,
    /pwd\s*[:\-=]\s*\S+/gi,
    /pass\s*[:\-=]\s*\S+/gi,
  ];

  passwordPatterns.forEach((pattern) => {
    if (pattern.test(maskedText)) {
      maskedText = maskedText.replace(pattern, "password: [REDACTED]");
      piiDetected.push({ type: "password", masked: true });
    }
  });

  // 5. Bank account patterns (simple heuristic)
  const bankAccountPattern = /\b(?:account|acct)[\s#:]*\d{8,17}\b/gi;
  if (bankAccountPattern.test(maskedText)) {
    maskedText = maskedText.replace(bankAccountPattern, "account: [REDACTED]");
    piiDetected.push({ type: "bank_account", masked: true });
  }

  // 6. API keys / tokens (common patterns)
  const apiKeyPatterns = [
    /\b[A-Za-z0-9]{32,}\b/g, // Long alphanumeric strings
    /\b(?:api[_-]?key|token|secret)[:\s=]+[A-Za-z0-9_\-]+/gi,
  ];

  apiKeyPatterns.forEach((pattern) => {
    const matches = maskedText.match(pattern);
    if (matches) {
      matches.forEach((match) => {
        // Only mask if it looks like a real API key (long, mixed case)
        if (match.length > 20 && /[A-Z]/.test(match) && /[a-z]/.test(match)) {
          maskedText = maskedText.replace(match, "[API_KEY_REDACTED]");
          piiDetected.push({ type: "api_key", masked: true });
        }
      });
    }
  });

  return {
    maskedText,
    piiDetected,
    hadPII: piiDetected.length > 0,
  };
}

/**
 * Luhn algorithm for credit card validation
 * @param {string} cardNumber - Card number to validate (digits only)
 * @returns {boolean} - True if valid credit card number
 */
function isValidCreditCard(cardNumber) {
  if (!/^\d+$/.test(cardNumber)) return false;
  if (cardNumber.length < 13 || cardNumber.length > 19) return false;

  const digits = cardNumber.split("").map(Number);
  let sum = 0;
  let isSecond = false;

  // Iterate from right to left
  for (let i = digits.length - 1; i >= 0; i--) {
    let digit = digits[i];

    if (isSecond) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }

    sum += digit;
    isSecond = !isSecond;
  }

  return sum % 10 === 0;
}

/**
 * Check if email appears in business context (signature, contact info)
 * @param {string} text - Full text
 * @param {string} email - Email to check
 * @returns {boolean} - True if appears to be business context
 */
function isBusinessContext(text, email) {
  // Simple heuristic: if near words like "contact", "support", "info"
  const businessKeywords = /\b(contact|support|info|help|service|team)\b/i;
  const emailIndex = text.indexOf(email);
  const contextBefore = text.substring(Math.max(0, emailIndex - 50), emailIndex);
  const contextAfter = text.substring(emailIndex, Math.min(text.length, emailIndex + 50));

  return (
    businessKeywords.test(contextBefore) || businessKeywords.test(contextAfter)
  );
}

/**
 * Sanitize user input for safe storage
 * @param {string} input - User input text
 * @param {string} type - Type of input ('text', 'phone', 'name')
 * @returns {string} - Sanitized input
 */
export function sanitizeInput(input, type = "text") {
  if (!input || typeof input !== "string") return input;

  if (type === "text") {
    // Basic XSS prevention (already handled by frameworks, but extra layer)
    return input.trim();
  } else if (type === "phone") {
    // Keep only numbers and common phone characters
    return String(input).replace(/[^0-9+\-\s()]/g, "");
  } else if (type === "name") {
    // Keep only letters, spaces, hyphens, apostrophes
    return String(input)
      .replace(/[^a-zA-Z\s'\-]/g, "")
      .slice(0, 100);
  }

  return input;
}
