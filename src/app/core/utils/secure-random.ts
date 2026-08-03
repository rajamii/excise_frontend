export function secureRandomFloat(): number {
  const cryptoApi = globalThis.crypto;
  if (!cryptoApi?.getRandomValues) {
    throw new Error('Secure randomness is unavailable in this environment.');
  }

  const randomValues = new Uint32Array(1);
  cryptoApi.getRandomValues(randomValues);
  return randomValues[0] / 0x1_0000_0000;
}

export function secureRandomInt(maxExclusive: number): number {
  if (!Number.isFinite(maxExclusive) || maxExclusive <= 0) {
    return 0;
  }

  return Math.floor(secureRandomFloat() * maxExclusive);
}

export function secureRandomChoice<T>(values: T[]): T {
  if (!Array.isArray(values) || values.length === 0) {
    throw new Error('secureRandomChoice requires at least one value.');
  }

  return values[secureRandomInt(values.length)];
}

export function secureRandomToken(length: number = 16): string {
  if (!Number.isFinite(length) || length <= 0) {
    return '';
  }

  const cryptoApi = globalThis.crypto;
  if (!cryptoApi?.getRandomValues) {
    throw new Error('Secure randomness is unavailable in this environment.');
  }

  const bytes = new Uint8Array(Math.ceil(length / 2));
  cryptoApi.getRandomValues(bytes);
  return Array.from(bytes, (value) => value.toString(16).padStart(2, '0')).join('').slice(0, length);
}
