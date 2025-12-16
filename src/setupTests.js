import '@testing-library/jest-dom';

// Compatibility shim: if running under Vitest (vi) but tests expect `jest`, alias it
if (typeof global !== 'undefined' && typeof jest === 'undefined' && typeof vi !== 'undefined') {
	global.jest = vi;
}

// Ensure fetch is defined for tests (can be overridden in specific tests)
if (typeof global !== 'undefined' && typeof global.fetch === 'undefined') {
	global.fetch = () => Promise.resolve({ ok: false });
}
