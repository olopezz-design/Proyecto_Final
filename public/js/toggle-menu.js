// js/toggle-menu.js
$('#menu-toggle').click(function() {
    $('#wrapper').toggleClass('toggled');
    const icon = $(this).find('i');
    icon.toggleClass('fa-chevron-left fa-chevron-right');
});

// toggle-menu.js

document.addEventListener('DOMContentLoaded', function () {
    const sidebar = document.getElementById('sidebar-wrapper');
    const toggleButton = document.getElementById('menu-toggle');

    // Comprobar el estado guardado en localStorage
    const sidebarState = localStorage.getItem('sidebarState');
    if (sidebarState === 'collapsed') {
        sidebar.classList.add('collapsed');
        toggleButton.querySelector('i').classList.add('fa-chevron-right');
        toggleButton.querySelector('i').classList.remove('fa-chevron-left');
    }

    toggleButton.addEventListener('click', () => {
        sidebar.classList.toggle('collapsed');
        toggleButton.querySelector('i').classList.toggle('fa-chevron-right');
        toggleButton.querySelector('i').classList.toggle('fa-chevron-left');

        // Guardar el estado en localStorage
        const currentState = sidebar.classList.contains('collapsed') ? 'collapsed' : 'expanded';
        localStorage.setItem('sidebarState', currentState);
    });
});

// toggle-menu.js

document.addEventListener('DOMContentLoaded', function () {
    const sidebar = document.getElementById('sidebar-wrapper');
    const toggleButton = document.getElementById('menu-toggle');

    // Comprobar el estado guardado en localStorage
    const sidebarState = localStorage.getItem('sidebarState');
    if (sidebarState === 'collapsed') {
        sidebar.classList.add('collapsed');
        toggleButton.querySelector('i').classList.add('fa-chevron-right');
        toggleButton.querySelector('i').classList.remove('fa-chevron-left');
    }

    toggleButton.addEventListener('click', () => {
        sidebar.classList.toggle('collapsed');
        toggleButton.querySelector('i').classList.toggle('fa-chevron-right');
        toggleButton.querySelector('i').classList.toggle('fa-chevron-left');

        // Guardar el estado en localStorage
        const currentState = sidebar.classList.contains('collapsed') ? 'collapsed' : 'expanded';
        localStorage.setItem('sidebarState', currentState);
    });
});