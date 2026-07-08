import { inicializarBaseDeDatosLocal } from './utils/seeder.js';

class PetPantryApp {
    constructor() {
        this.init();
    }

    init() {
        // 1. Asegurar que la base de datos local tenga datos
        inicializarBaseDeDatosLocal();

        // 2. Inicializar íconos globales (Lucide)
        if (typeof lucide !== 'undefined') {
            lucide.createIcons();
        }

        // 3. Prevenir comportamientos por defecto indeseados
        document.addEventListener('dragover', (e) => e.preventDefault());
        document.addEventListener('drop', (e) => e.preventDefault());

        console.log("🚀 Pet Pantry Pro - Core System Initialized");
    }
}

document.addEventListener('DOMContentLoaded', () => {
    window.App = new PetPantryApp();
});