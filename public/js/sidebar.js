// js/sidebar.js
const sidebarMenu = [
    {
        title: "Pacientes",
        icon: "fas fa-user",
        submenu: [
            { title: "Pacientes", link: "/admin/pacientes" },
            { title: "Citas", link: "/admin/citas" },
            { title: "Historial Tratamiento", link: "/admin/historial" },
            { title: "Control de Pago", link: "/admin/pago" },
            { title: "Pacientes Archivados", link: "/admin/archivados" }
        ]
    },
    {
        title: "Doctores",
        icon: "fas fa-user-md",
        submenu: [
            { title: "Doctores", link: "/admin/doctores" },
            { title: "Usuarios Activos", link: "/admin/usuarios" },
            { title: "Usuarios Inactivos", link: "/admin/usuariosinactivos" }
        ]
    },
    {
        title: "Inventario",
        icon: "fas fa-box",
        submenu: [
            { title: "Inventario", link: "/admin/inventario" },
            { title: "Producto", link: "/admin/producto" },
            { title: "Proveedores", link: "/admin/proveedores" },
            { title: "Compra", link: "/admin/compra" }
        ]
    }
];

$(document).ready(function () {
    const sidebarContainer = $('.list-group');

    // Generar el sidebar dinámico
    sidebarMenu.forEach(section => {
        const submenuId = section.title.toLowerCase().replace(/ /g, '-') + '-submenu';
        let submenuHTML = `
            <a href="#${submenuId}" class="list-group-item list-group-item-action bg-dark text-white" data-toggle="collapse">
                <i class="${section.icon}"></i> ${section.title}
            </a>
            <div id="${submenuId}" class="collapse">
        `;
        section.submenu.forEach(item => {
            submenuHTML += `
                <a href="${item.link}" class="list-group-item list-group-item-action bg-dark text-white pl-4">${item.title}</a>
            `;
        });
        submenuHTML += '</div>';
        sidebarContainer.append(submenuHTML);
    });

    // Aplicar el estado abierto o cerrado según localStorage
    const openMenu = localStorage.getItem('openMenu');
    if (openMenu) {
        $(`#${openMenu}`).addClass('show');
    }

    // Guardar el estado de la sección abierta en localStorage
    sidebarContainer.find('[data-toggle="collapse"]').on('click', function () {
        const submenuId = $(this).attr('href').substring(1);
        const isOpen = $(`#${submenuId}`).hasClass('show');
        localStorage.setItem('openMenu', isOpen ? '' : submenuId);
    });
});
