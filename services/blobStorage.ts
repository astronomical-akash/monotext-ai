export interface AppData {
    topics: any[];
    notes: any[];
}

const STORAGE_KEY = 'monotext-data';

export const saveDataToStorage = (data: AppData): void => {
    try {
        const jsonData = JSON.stringify(data);
        localStorage.setItem(STORAGE_KEY, jsonData);
    } catch (error) {
        console.error('Error saving data to localStorage:', error);
    }
};

export const loadDataFromStorage = (): AppData | null => {
    try {
        const localData = localStorage.getItem(STORAGE_KEY);
        return localData ? JSON.parse(localData) : null;
    } catch (error) {
        console.error('Error loading data from localStorage:', error);
        return null;
    }
};

export const clearStorage = (): void => {
    try {
        localStorage.removeItem(STORAGE_KEY);
    } catch (error) {
        console.error('Error clearing storage:', error);
    }
};
