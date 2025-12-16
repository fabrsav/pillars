import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import DailyItems from '../DailyItems';
import itemsData from '../../data/items.json';
import { vi, describe, it, beforeEach, afterEach, expect } from 'vitest';

beforeEach(() => {
	localStorage.clear();
});

describe('DailyItems - server empty handling and import', () => {
	it('ignores empty server copy and shows banner', async () => {
		vi.stubGlobal('fetch', vi.fn(async (url, opts) => {
			if (url === '/api/store/daily_items' && (!opts || !opts.method || opts.method === 'GET')) {
				return { ok: true, json: async () => [] };
			}
			return { ok: false, status: 404, json: async () => null };
		}));

		render(<DailyItems isEditMode={false} />);

		// banner should appear
		await waitFor(() => expect(screen.getByText(/Copia server vuota/i)).toBeInTheDocument());

		// defaults should still be present
		expect(screen.getByText(itemsData[0].name)).toBeInTheDocument();
	});

	it('imports items from a JSON file and clears serverEmpty', async () => {
		vi.stubGlobal('fetch', vi.fn(async (url, opts) => {
			if (url === '/api/store/daily_items' && (!opts || !opts.method || opts.method === 'GET')) {
				return { ok: true, json: async () => [] };
			}
			return { ok: false, status: 404, json: async () => null };
		}));

		const { container } = render(<DailyItems isEditMode={true} />);

		// prepare file to import
		const file = new File([JSON.stringify([{ id: 'test-1', name: 'Importato', connector: '', magneticMount: false, base: false, cable: false, notes: '' }])], 'import.json', { type: 'application/json' });
		const input = container.querySelector('input[type="file"]');
		expect(input).toBeTruthy();

		// simulate file selection
		fireEvent.change(input, { target: { files: [file] } });

		await waitFor(() => expect(screen.getByText('Importato')).toBeInTheDocument());

		// serverEmpty flag should be cleared (banner removed)
		expect(screen.queryByText(/Copia server vuota/i)).toBeNull();
	});
});
