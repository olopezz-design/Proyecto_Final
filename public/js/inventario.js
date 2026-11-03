// Función para ajustar el stock de un producto con un mejor manejo de errores
async function ajustarStock(event) {
    event?.preventDefault();

    const data = {
        producto_id: $('#producto').val(),
        ajuste: $('#ajuste').val()
    };

    try {
        const response = await $.ajax({
            url: '/api/inventario/ajustar',
            type: 'POST',
            contentType: 'application/json',
            data: JSON.stringify(data),
            dataType: 'json'
        });

        if (response.success) {
            alert('Stock ajustado correctamente');
            $('#ajustarStockModal').modal('hide');
            await cargarInventario();
        } else {
            alert('No se pudo ajustar el stock. Verifique los datos ingresados.');
            console.warn('Ajuste de stock no exitoso:', response);
        }
    } catch (error) {
        handleAjaxError(error, 'ajustar el stock');
    }
}

// Cargar inventario desde la API con control de errores
async function cargarInventario() {
    try {
        const data = await $.get('/api/inventario');

        if (!Array.isArray(data) || data.length === 0) {
            alert('No se encontraron productos en el inventario.');
            $('#inventarioTable tbody').html('<tr><td colspan="4">No hay datos disponibles.</td></tr>');
            return;
        }

        const rows = data.map(item => {
            const estado = item.stock_actual < item.stock_seguridad ? 'badge-danger' : 'badge-success';
            const estadoTexto = item.stock_actual < item.stock_seguridad ? 'Bajo' : 'Adecuado';
            return `
                <tr>
                    <td>${item.nombre}</td>
                    <td>${item.stock_actual}</td>
                    <td>${item.stock_seguridad}</td>
                    <td><span class="badge ${estado}">${estadoTexto}</span></td>
                </tr>`;
        }).join('');
        $('#inventarioTable tbody').html(rows);

    } catch (error) {
        handleAjaxError(error, 'cargar el inventario');
    }
}

// Función para manejar errores de solicitudes AJAX
function handleAjaxError(error, action) {
    if (error.status === 0) {
        alert(`Error de conexión al ${action}. Verifique su conexión a internet.`);
    } else if (error.status === 404) {
        alert(`Error 404: La API de ${action} no se encontró.`);
    } else if (error.status === 500) {
        alert(`Error en el servidor al ${action}. Intente nuevamente más tarde.`);
    } else {
        alert(`Ocurrió un error inesperado al ${action}.`);
    }
    console.error(`Error en ${action}:`, error);
}

// Inicializar DataTable
function inicializarTablaInventario() {
    $('#inventarioTable').DataTable({
        destroy: true,
        paging: true,
        searching: true,
        ordering: true,
        info: true,
        lengthChange: false,
        pageLength: 10,
        language: {
            paginate: {
                previous: "<",
                next: ">"
            },
            emptyTable: "No hay datos disponibles en la tabla"
        },
        order: []
    });

    // Vincula el campo de búsqueda al DataTable
    $('#searchInventario').on('keyup', function() {
        table.search(this.value).draw();
    });
}

export { ajustarStock, cargarInventario, inicializarTablaInventario };