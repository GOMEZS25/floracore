// GTIN (UPC-A / EAN-13) validation for the optional `upc` field of a sales
// order line. The value is optional: an absent or blank code is accepted and
// normalized to null so a line without a UPC is stored exactly as before.

// Expected check digit for a code whose last digit is the checksum: drop that
// digit, reverse the rest, and weight digits by 3 on even indices (from the
// right) and by 1 on odd indices.
const expectedCheckDigit = (code) => {
  const body = code.slice(0, -1).split('').reverse();
  const sum = body.reduce((acc, ch, i) => acc + Number(ch) * (i % 2 === 0 ? 3 : 1), 0);
  return (10 - (sum % 10)) % 10;
};

// Returns { value } with the normalized code (string or null) when acceptable,
// or { error } with a Spanish message when a code is present but malformed.
const validateUpc = (raw) => {
  const value = raw === null || raw === undefined ? '' : String(raw).trim();
  if (value === '') return { value: null };

  if (!/^\d{12,13}$/.test(value)) {
    return { error: 'El UPC debe tener 12 o 13 dígitos numéricos' };
  }
  if (expectedCheckDigit(value) !== Number(value[value.length - 1])) {
    return { error: 'El dígito verificador del UPC no es válido' };
  }
  return { value };
};

module.exports = { validateUpc };
