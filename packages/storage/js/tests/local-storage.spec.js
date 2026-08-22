import {
	localStorage as blockeraLocalStorage,
	sessionStorage as blockeraSessionStorage,
	getStorageKey,
} from '../local-storage';

describe('scoped browser storage API', () => {
	beforeEach(() => {
		window.localStorage.clear();
		window.sessionStorage.clear();
		delete window.blockeraStorageSiteKey;
		delete window.blockeraStorageUserId;
	});

	afterEach(() => {
		jest.restoreAllMocks();
	});

	describe('getStorageKey', () => {
		it('should scope keys with site key and user id from window', () => {
			window.blockeraStorageSiteKey = 'site-uuid';
			window.blockeraStorageUserId = 7;
			expect(getStorageKey('testKey')).toBe('testKey__site-uuid_u7');
		});

		it('should fall back to 0 site and user when globals are missing', () => {
			expect(getStorageKey('testKey')).toBe('testKey__0_u0');
		});
	});

	describe('localStorage (string API)', () => {
		it('should set and get a string value with a scoped key', () => {
			blockeraLocalStorage.setItem('testKey', 'hello');
			expect(window.localStorage.getItem('testKey__0_u0')).toBe('hello');
			expect(blockeraLocalStorage.getItem('testKey')).toBe('hello');
		});

		it('should remove a scoped key', () => {
			blockeraLocalStorage.setItem('testKey', 'hello');
			blockeraLocalStorage.removeItem('testKey');
			expect(window.localStorage.getItem('testKey__0_u0')).toBeNull();
			expect(blockeraLocalStorage.getItem('testKey')).toBeNull();
		});

		it('should not throw when backend setItem fails', () => {
			jest.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
				throw new Error('Storage failure');
			});
			const errorSpy = jest
				.spyOn(console, 'error')
				.mockImplementation(() => {});
			expect(() =>
				blockeraLocalStorage.setItem('testKey', 'x')
			).not.toThrow();
			errorSpy.mockRestore();
		});
	});

	describe('localStorage JSON helpers', () => {
		it('should set and get JSON values', () => {
			blockeraLocalStorage.setJSON('testKey', { name: 'John' });
			expect(window.localStorage.getItem('testKey__0_u0')).toBe(
				JSON.stringify({ name: 'John' })
			);
			expect(blockeraLocalStorage.getJSON('testKey')).toEqual({
				name: 'John',
			});
		});

		it('should update JSON values', () => {
			blockeraLocalStorage.setJSON('testKey', { name: 'John', age: 30 });
			const result = blockeraLocalStorage.updateJSON('testKey', {
				age: 31,
			});
			expect(result).toEqual({ name: 'John', age: 31 });
			expect(blockeraLocalStorage.getJSON('testKey')).toEqual({
				name: 'John',
				age: 31,
			});
		});

		it('should return null from updateJSON when missing', () => {
			expect(
				blockeraLocalStorage.updateJSON('missing', { a: 1 })
			).toBeNull();
		});

		it('should remove via removeItem', () => {
			blockeraLocalStorage.setJSON('testKey', { a: 1 });
			blockeraLocalStorage.removeItem('testKey');
			expect(window.localStorage.getItem('testKey__0_u0')).toBeNull();
		});
	});

	describe('freshItem', () => {
		it('should remove old cache keys for the current site/user only', () => {
			window.localStorage.setItem('cache_v1_data__0_u0', '1');
			window.localStorage.setItem('cache_v2_data__0_u0', '2');
			window.localStorage.setItem('cache_v3_data__0_u0', '3');
			window.localStorage.setItem('cache_v1_data__other_u1', 'other');

			blockeraLocalStorage.freshItem('cache_v2_data', 'cache_');

			expect(window.localStorage.getItem('cache_v1_data__0_u0')).toBeNull();
			expect(window.localStorage.getItem('cache_v3_data__0_u0')).toBeNull();
			expect(window.localStorage.getItem('cache_v2_data__0_u0')).toBe('2');
			expect(window.localStorage.getItem('cache_v1_data__other_u1')).toBe(
				'other'
			);
		});
	});

	describe('sessionStorage', () => {
		it('should set and get with scoped keys on sessionStorage', () => {
			blockeraSessionStorage.setItem('bulk', '1,2,3');
			expect(window.sessionStorage.getItem('bulk__0_u0')).toBe('1,2,3');
			expect(blockeraSessionStorage.getItem('bulk')).toBe('1,2,3');
			blockeraSessionStorage.removeItem('bulk');
			expect(window.sessionStorage.getItem('bulk__0_u0')).toBeNull();
		});
	});
});
