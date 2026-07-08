
 /* GLOBAL LAYOUT CONTROLLER*/
 /* Maneja interacciones globales como el menú lateral (Sidebar)*/

import './utils/seeder.js';

document.addEventListener('DOMContentLoaded', () => {
    const sidebar = document.getElementById('sidebar');
    const menuToggle = document.getElementById('menuToggle');
    const overlay = document.getElementById('sidebarOverlay');

    const toggleSidebar = () => {
        const isOpen = sidebar.classList.contains('is-open');
        
        if (isOpen) {
            sidebar.classList.remove('is-open');
            overlay.style.display = 'none';
            document.body.style.overflow = ''; // Restaurar scroll
        } else {
            sidebar.classList.add('is-open');
            overlay.style.display = 'block';
            document.body.style.overflow = 'hidden'; // Bloquear scroll de fondo
        }
    };

    if (menuToggle && sidebar && overlay) {
        menuToggle.addEventListener('click', toggleSidebar);
        overlay.addEventListener('click', toggleSidebar);
    }
});