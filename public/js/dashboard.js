$(document).ready(function() {
    // Inicializa DataTables con opciones personalizadas
    const userTable = $('#userTable').DataTable({
        destroy: true,  // Destruir cualquier tabla previamente inicializada
        paging: true,
        searching: false,  // Desactiva la búsqueda nativa de DataTables, usaremos la personalizada
        ordering: true,
        info: true,
        lengthChange: false,
        language: {
            info: "Mostrando _START_ a _END_ de _TOTAL_ entradas",
            paginate: {
                next: ' Siguiente',
                previous: 'Anterior ',
            },
            emptyTable: 'No hay usuarios disponibles'
        },
        order: []  // No establecer un orden por defecto al cargar la tabla
    });

    // Manejo del formulario de agregar usuario
    $('#addUserForm').on('submit', function(e) {
        e.preventDefault();  // Evita el envío del formulario por defecto

        const formData = $(this).serialize();  // Serializa los datos del formulario

        $.ajax({
            type: 'POST',
            url: '/admin/usuarios',
            data: formData,
            success: function(response) {
                console.log('Usuario agregado exitosamente:', response);
                location.reload();  // Recarga la página para actualizar la lista de usuarios
            },
            error: function(err) {
                console.error('Error al agregar usuario:', err);
                alert('Hubo un error al agregar el usuario. Por favor, intente nuevamente.');
            }
        });
    });

    // Manejo del formulario de editar usuario
    $('#editUserForm').on('submit', function(e) {
        e.preventDefault();  // Evita el envío del formulario por defecto
    
        const userId = $('#editUserId').val();  // Captura el ID del usuario
        const formData = $(this).serialize();  // Serializa los datos del formulario
    
        $.ajax({
            type: 'PUT',
            url: '/admin/usuarios/' + userId,
            data: formData,
            success: function(response) {
                console.log('Usuario actualizado exitosamente:', response);
                location.reload();  // Recarga la página para reflejar los cambios
            },
            error: function(err) {
                console.error('Error al actualizar usuario:', err);
                alert('Hubo un error al actualizar el usuario. Por favor, intente nuevamente.');
            }
        });
    });

    // Mostrar datos del usuario en el formulario de edición
    $(document).on('click', '.editUserBtn', function() {
        const userId = $(this).data('userid');
        
        $.get('/admin/usuarios/' + userId, function(data) {
            $('#editUserId').val(data.id);
            $('#editUsername').val(data.username);
            $('#editRole').val(data.role);
            $('#editUserModal').modal('show');  // Abre el modal de edición
        }).fail(function(err) {
            console.error('Error al obtener los datos del usuario:', err);
            alert('No se pudo cargar la información del usuario. Intente más tarde.');
        });
    });

    // Función para buscar usuarios en la tabla (usando DataTables)
    $('#searchButton').on('click', function() {
        const searchQuery = $("#searchUser").val();
        userTable.search(searchQuery).draw();  // Utiliza la funcionalidad de búsqueda de DataTables
    });

    // Funcionalidad del botón para ocultar/mostrar el menú
    $("#menu-toggle").click(function(e) {
        e.preventDefault();
        $("#wrapper").toggleClass("toggled");
        // Cambiar la flecha de dirección al togglear
        $(this).find("i").toggleClass("fa-chevron-left fa-chevron-right");
    });
});

// Función para ver la información del doctor
function verInformacion(id, nombre, apellido, especialidad, telefono, email, observaciones) {
    $('#infoDoctorId').text(id);
    $('#infoDoctorName').text(nombre);
    $('#infoDoctorLastName').text(apellido);
    $('#infoDoctorSpecialty').text(especialidad);
    $('#infoDoctorPhone').text(telefono);
    $('#infoDoctorEmail').text(email);
    $('#infoDoctorObservations').text(observaciones);
    $('#infoDoctorModal').modal('show');
}


