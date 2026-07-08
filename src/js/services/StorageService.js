export class StorageService {

    static #generateId() {
        return Math.random().toString(36).substring(2, 11) + Date.now().toString(36);
    }

    // Simula GET /api/{coleccion} — ahora es síncrono (localStorage ya lo es)
    static getAll(collectionName) {
        const data = localStorage.getItem(collectionName);
        return data ? JSON.parse(data) : [];
    }

    // Faltaba: guarda/sobrescribe toda la colección
    static saveAll(collectionName, items) {
        localStorage.setItem(collectionName, JSON.stringify(items));
        return items;
    }

    static create(collectionName, item) {
        const data = this.getAll(collectionName);
        const newItem = {
            id: this.#generateId(),
            createdAt: new Date().toISOString(),
            ...item
        };
        data.push(newItem);
        this.saveAll(collectionName, data);
        return newItem;
    }

    static update(collectionName, id, updatedItem) {
        const data = this.getAll(collectionName);
        const index = data.findIndex(item => item.id == id);
        if (index === -1) return null;

        data[index] = { ...data[index], ...updatedItem, updatedAt: new Date().toISOString() };
        this.saveAll(collectionName, data);
        return data[index];
    }

    // Faltaba: eliminar un registro (lo necesita el panel de adopciones)
    static remove(collectionName, id) {
        const data = this.getAll(collectionName);
        const filtered = data.filter(item => item.id != id);
        this.saveAll(collectionName, filtered);
        return filtered;
    }
}