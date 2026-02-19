// CRUD de Turnos con API Backend

class GestorTurnos {
    constructor() {
        this.turnos = [];
        this.usuarios = [];
        this.profesionales = [];
        this.editandoId = null;
        this.apiUrl = '/api';
        this.inicializarEventos();
        this.cargarDatos();
    }

    // EVENTOS
    inicializarEventos() {
        const form = document.getElementById('turnoForm');
        const buscar = document.getElementById('buscar');
        const filtroEspecialidad = document.getElementById('filtroEspecialidad');
        const filtroEstado = document.getElementById('filtroEstado');

        form.addEventListener('submit', (e) => this.manejarSubmit(e));
        document.getElementById('btnLimpiar').addEventListener('click', () => this.limpiarFormulario());
        buscar.addEventListener('input', () => this.aplicarFiltros());
        filtroEspecialidad.addEventListener('change', () => this.aplicarFiltros());
        filtroEstado.addEventListener('change', () => this.aplicarFiltros());
    }

    // CARGAR DATOS DESDE API
    async cargarDatos() {
        try {
            // Cargar turnos
            const respTurnos = await fetch(`${this.apiUrl}/appointments`);
            this.turnos = await respTurnos.json();

            // Cargar usuarios
            const respUsuarios = await fetch(`${this.apiUrl}/users`);
            this.usuarios = await respUsuarios.json();

            // Cargar profesionales
            const respProfesionales = await fetch(`${this.apiUrl}/professionals`);
            this.profesionales = await respProfesionales.json();

            // Poblar selects de usuario y profesional
            this.poblarSelects();

            this.renderizarTurnos();
        } catch (error) {
            console.error('Error cargando datos:', error);
            alert('Error al cargar los datos del servidor');
        }
    }

    poblarSelects() {
        const userSelect = document.getElementById('userSelect');
        const profSelect = document.getElementById('professionalSelect');

        if (userSelect) {
            userSelect.innerHTML = '<option value="">Seleccionar usuario...</option>';
            this.usuarios.forEach(u => {
                const opt = document.createElement('option');
                opt.value = u.id;
                opt.textContent = u.name || (`Usuario ${u.id}`);
                userSelect.appendChild(opt);
            });
        }

        if (profSelect) {
            profSelect.innerHTML = '<option value="">Seleccionar profesional...</option>';
            this.profesionales.forEach(p => {
                const opt = document.createElement('option');
                opt.value = p.id;
                opt.textContent = p.name || (`Profesional ${p.id}`);
                profSelect.appendChild(opt);
            });
        }
    }

    // CREAR/ACTUALIZAR TURNO
    async manejarSubmit(e) {
        e.preventDefault();

        const paciente = document.getElementById('paciente').value.trim();
        const fecha = document.getElementById('fecha').value;
        const hora = document.getElementById('hora').value;
        const especialidad = document.getElementById('especialidad').value;
        const estado = document.getElementById('estado').value;
        const selectedUser = document.getElementById('userSelect') ? document.getElementById('userSelect').value : '';
        const selectedProfessional = document.getElementById('professionalSelect') ? document.getElementById('professionalSelect').value : '';

        // Combinar fecha y hora
        const scheduled_at = `${fecha}T${hora}:00`;

        try {
            if (this.editandoId) {
                // ACTUALIZAR
                const payload = { scheduled_at, service: especialidad, status: estado };
                if (selectedUser) payload.user_id = parseInt(selectedUser);
                if (selectedProfessional) payload.professional_id = parseInt(selectedProfessional);

                const response = await fetch(`${this.apiUrl}/appointments/${this.editandoId}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });

                if (!response.ok) throw new Error('Error al actualizar');
                alert('Turno actualizado correctamente');
                this.editandoId = null;
            } else {
                // CREAR
                const payload = { scheduled_at, service: especialidad, notes: paciente };
                if (selectedUser) payload.user_id = parseInt(selectedUser);
                if (selectedProfessional) payload.professional_id = parseInt(selectedProfessional);

                const response = await fetch(`${this.apiUrl}/appointments`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });

                if (!response.ok) throw new Error('Error al crear');
                alert('Turno registrado correctamente');
            }

            this.limpiarFormulario();
            await this.cargarDatos();
        } catch (error) {
            console.error('Error:', error);
            alert('Error al guardar el turno');
        }
    }

    // LEER TURNOS (con filtros)
    aplicarFiltros() {
        const busqueda = document.getElementById('buscar').value.toLowerCase();
        const filtroEsp = document.getElementById('filtroEspecialidad').value;
        const filtroEst = document.getElementById('filtroEstado').value;

        const turnosFiltrados = this.turnos.filter(turno => {
            const notas = turno.notes ? turno.notes.toLowerCase() : '';
            const coincideBusqueda = notas.includes(busqueda);
            const coincideEspecialidad = !filtroEsp || turno.service === filtroEsp;
            const coincideEstado = !filtroEst || turno.status === filtroEst;

            return coincideBusqueda && coincideEspecialidad && coincideEstado;
        });

        this.renderizarTurnos(turnosFiltrados);
    }

    // RENDERIZAR TABLA
    renderizarTurnos(turnosAMostrar = this.turnos) {
        const tbody = document.getElementById('turnosBody');
        tbody.innerHTML = '';

        if (turnosAMostrar.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" class="text-center">No hay turnos registrados</td></tr>';
            return;
        }

        turnosAMostrar.forEach(turno => {
            const fila = document.createElement('tr');
            const estadoClase = turno.status ? turno.status.toLowerCase() : 'scheduled';

            fila.innerHTML = `
                <td>${turno.id}</td>
                <td>${turno.notes || 'N/A'}</td>
                <td>${this.formatearFecha(turno.scheduled_at)}</td>
                <td>${this.extraerHora(turno.scheduled_at)}</td>
                <td>${turno.service || 'N/A'}</td>
                <td><span class="estado ${estadoClase}">${turno.status || 'scheduled'}</span></td>
                <td>
                    <div class="actions">
                        <button class="btn btn-edit" onclick="gestor.editar(${turno.id})">Editar</button>
                        <button class="btn btn-delete" onclick="gestor.eliminar(${turno.id})">Eliminar</button>
                    </div>
                </td>
            `;

            tbody.appendChild(fila);
        });
    }

    // EDITAR
    editar(id) {
        const turno = this.turnos.find(t => t.id === id);
        if (!turno) return;

        const [fecha, hora] = turno.scheduled_at.split('T');
        
        document.getElementById('paciente').value = turno.notes || '';
        document.getElementById('fecha').value = fecha;
        document.getElementById('hora').value = hora.substring(0, 5);
        document.getElementById('especialidad').value = turno.service || '';
        document.getElementById('estado').value = turno.status || 'scheduled';
        if (document.getElementById('userSelect')) document.getElementById('userSelect').value = turno.user_id || '';
        if (document.getElementById('professionalSelect')) document.getElementById('professionalSelect').value = turno.professional_id || '';

        this.editandoId = id;
        
        // Cambiar botón
        const btn = document.querySelector('button[type="submit"]');
        btn.textContent = 'Actualizar Turno';
        btn.style.background = 'linear-gradient(135deg, #ff9800 0%, #f57c00 100%)';

        // Scroll al formulario
        document.querySelector('.form-section').scrollIntoView({ behavior: 'smooth' });
    }

    // ELIMINAR
    async eliminar(id) {
        if (confirm('¿Está seguro de que desea eliminar este turno?')) {
            try {
                const response = await fetch(`${this.apiUrl}/appointments/${id}`, {
                    method: 'DELETE'
                });

                if (!response.ok) throw new Error('Error al eliminar');
                alert('Turno eliminado correctamente');
                await this.cargarDatos();
            } catch (error) {
                console.error('Error:', error);
                alert('Error al eliminar el turno');
            }
        }
    }

    // LIMPIAR FORMULARIO
    limpiarFormulario() {
        document.getElementById('turnoForm').reset();
        this.editandoId = null;
        
        const btn = document.querySelector('button[type="submit"]');
        btn.textContent = 'Guardar Turno';
        btn.style.background = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
    }

    // UTILIDADES
    formatearFecha(fecha) {
        const date = new Date(fecha);
        return date.toLocaleDateString('es-AR', { 
            year: 'numeric', 
            month: '2-digit', 
            day: '2-digit' 
        });
    }

    extraerHora(datetime) {
        return datetime.substring(11, 16);
    }
}

// Inicializar la aplicación
const gestor = new GestorTurnos();
