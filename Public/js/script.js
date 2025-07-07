document.addEventListener("DOMContentLoaded", () => {
  const API_URL = "/api/transacciones";
  let todasLasTransacciones = [];

  // --- Elementos del DOM ---
  const totalIngresosEl = document.getElementById("total-ingresos");
  const totalEgresosEl = document.getElementById("total-egresos");
  const totalPendientesEl = document.getElementById("total-pendientes");
  const balanceGeneralEl = document.getElementById("balance-general");
  const saldoLiquidoEl = document.getElementById("saldo-liquido");
  const transactionsTableBody = document.getElementById("transactions-table-body");
  const financialForm = document.getElementById("financial-form");
  const tipoInput = document.getElementById("tipo");
  const fechaInput = document.getElementById("fecha");
  const bancoInput = document.getElementById("banco");
  const valorInput = document.getElementById("valor");
  const descripcionInput = document.getElementById("descripcion");
  const comprobanteInput = document.getElementById("comprobante");
  const exportCsvBtn = document.getElementById("export-csv-btn");
  const startDateInput = document.getElementById("start-date");
  const endDateInput = document.getElementById("end-date");

  // --- Funciones de Lógica ---
  const formatearMoneda = (valor) => valor.toLocaleString("es-CO", { style: "currency", currency: "COP", minimumFractionDigits: 0 });

  const calcularYActualizarDashboard = (transacciones) => {
    let ingresosConfirmados = 0, ingresosPendientes = 0, egresos = 0, totalValorLiquido = 0;
    transacciones.forEach((t) => {
      if (t.tipo === "Ingreso") {
        if (t.estado === 'pendiente') {
          ingresosPendientes += t.valor;
        } else {
          ingresosConfirmados += t.valor;
          totalValorLiquido += (t.valor - (t.valor * 0.004) - (t.valor * 0.01));
        }
      } else if (t.tipo === "Egreso") {
        egresos += t.valor;
      }
    });
    const saldoLiquidoFinal = totalValorLiquido - egresos;
    totalIngresosEl.textContent = formatearMoneda(ingresosConfirmados);
    totalPendientesEl.textContent = formatearMoneda(ingresosPendientes);
    totalEgresosEl.textContent = formatearMoneda(egresos);
    balanceGeneralEl.textContent = formatearMoneda(ingresosConfirmados - egresos);
    saldoLiquidoEl.textContent = formatearMoneda(saldoLiquidoFinal);
  };
  
  const renderizarTabla = (transacciones) => {
    transactionsTableBody.innerHTML = "";
    transacciones.forEach((t, index) => {
      const impuesto = t.tipo === 'Ingreso' && t.estado !== 'pendiente' ? t.valor * 0.004 : 0;
      const comision = t.tipo === 'Ingreso' && t.estado !== 'pendiente' ? t.valor * 0.01 : 0;
      const valorLiquido = t.tipo === 'Ingreso' && t.estado !== 'pendiente' ? t.valor - impuesto - comision : t.valor;
      const tipoHtml = t.estado === 'pendiente' ? `<span title="Ingreso pendiente de confirmación">${t.tipo} ⚠️</span>` : t.tipo;
      const comprobanteHtml = t.comprobante ? `<a href="${t.comprobante}" target="_blank" class="link-comprobante">Ver Link</a>` : 'No';
      const row = document.createElement("tr");
      row.dataset.id = t._id;
      row.innerHTML = `
        <td>${transacciones.length - index}</td><td>${tipoHtml}</td>
        <td>${new Date(t.fecha).toLocaleString('es-CO')}</td><td>${t.banco}</td>
        <td>${formatearMoneda(t.valor)}</td><td class="editable" data-field="descripcion">${t.descripcion}</td>
        <td>${formatearMoneda(impuesto)}</td><td>${formatearMoneda(comision)}</td>
        <td>${formatearMoneda(valorLiquido)}</td>
        <td class="editable" data-field="comprobante" data-original-value="${t.comprobante || ''}">${comprobanteHtml}</td>
        <td class="acciones"><button class="edit-btn">Editar</button><button class="delete-btn">Eliminar</button></td>`;
      transactionsTableBody.appendChild(row);
    });
  };
  
  const cargarDatos = async () => {
    try {
      const res = await fetch(API_URL);
      if (!res.ok) throw new Error('Error en la respuesta del servidor');
      const transacciones = await res.json();
      todasLasTransacciones = transacciones;
      calcularYActualizarDashboard(transacciones);
      renderizarTabla(transacciones);
    } catch (err) {
      console.error("Error al cargar datos:", err);
      alert("No se pudieron cargar los datos del servidor.");
    }
  };
  
  // --- Event Listener para CREAR registros ---
  financialForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const nuevaTransaccion = {
      tipo: tipoInput.value, fecha: fechaInput.value, banco: bancoInput.value,
      valor: parseFloat(valorInput.value), descripcion: descripcionInput.value,
      comprobante: comprobanteInput.value
    };
    try {
      const res = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(nuevaTransaccion),
      });
      if (!res.ok) throw new Error('Error al guardar la transacción');
      financialForm.reset();
      cargarDatos();
    } catch (error) {
      console.error("Error al guardar:", error);
      alert("Ocurrió un error al guardar el movimiento.");
    }
  });
  
  // --- Event Listener para la tabla (EDITAR, BORRAR, GUARDAR, CANCELAR) ---
  transactionsTableBody.addEventListener('click', async (e) => {
    const row = e.target.closest('tr');
    if (!row) return;
    const id = row.dataset.id;

    if (e.target.classList.contains('delete-btn')) {
        if (confirm('¿Estás seguro de que quieres eliminar este movimiento?')) {
            try {
                const res = await fetch(`${API_URL}/${id}`, { method: 'DELETE' });
                if (!res.ok) throw new Error('Error al eliminar');
                cargarDatos();
            } catch (error) {
                console.error('Error al eliminar:', error);
                alert('No se pudo eliminar el movimiento.');
            }
        }
    } else if (e.target.classList.contains('edit-btn')) {
        const descripcionCell = row.querySelector('[data-field="descripcion"]');
        const comprobanteCell = row.querySelector('[data-field="comprobante"]');
        descripcionCell.innerHTML = `<input type="text" value="${descripcionCell.textContent}" />`;
        comprobanteCell.innerHTML = `<input type="text" value="${comprobanteCell.dataset.originalValue}" placeholder="Pega el link aquí"/>`;
        row.querySelector('.acciones').innerHTML = `<button class="save-btn">Guardar</button><button class="cancel-btn">Cancelar</button>`;
    } else if (e.target.classList.contains('save-btn')) {
        const nuevaDescripcion = row.querySelector('[data-field="descripcion"] input').value;
        const nuevoComprobante = row.querySelector('[data-field="comprobante"] input').value;
        try {
            const res = await fetch(`${API_URL}/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ descripcion: nuevaDescripcion, comprobante: nuevoComprobante })
            });
            if (!res.ok) throw new Error('Error al guardar los cambios');
            cargarDatos();
        } catch (error) {
            console.error('Error al guardar:', error);
            alert('No se pudieron guardar los cambios.');
        }
    } else if (e.target.classList.contains('cancel-btn')) {
        cargarDatos();
    }
  });

  // --- Event Listener para EXPORTAR ---
  exportCsvBtn.addEventListener('click', () => {
    const startDate = startDateInput.value ? new Date(startDateInput.value + 'T00:00:00') : null;
    const endDate = endDateInput.value ? new Date(endDateInput.value + 'T23:59:59') : null;
    const transaccionesFiltradas = todasLasTransacciones.filter(t => {
      const fechaTransaccion = new Date(t.fecha);
      if (startDate && !endDate) return fechaTransaccion >= startDate;
      if (!startDate && endDate) return fechaTransaccion <= endDate;
      if (startDate && endDate) return fechaTransaccion >= startDate && fechaTransaccion <= endDate;
      return true;
    });
    if (transaccionesFiltradas.length === 0) return alert('No hay movimientos en el rango de fechas seleccionado.');
    const headers = ['Ticket #', 'Tipo', 'Estado', 'Fecha y Hora', 'Banco', 'Valor', 'Descripción', 'Link Comprobante', 'Imp. 4/1000', 'Comisión 1%', 'Valor Líquido'];
    const csvRows = [headers.join(',')];
    transaccionesFiltradas.forEach((t, index) => {
      const impuesto = t.tipo === 'Ingreso' && t.estado !== 'pendiente' ? t.valor * 0.004 : 0;
      const comision = t.tipo === 'Ingreso' && t.estado !== 'pendiente' ? t.valor * 0.01 : 0;
      const valorLiquido = t.tipo === 'Ingreso' && t.estado !== 'pendiente' ? t.valor - impuesto - comision : t.valor;
      const row = [
        transaccionesFiltradas.length - index, t.tipo, t.estado, `"${new Date(t.fecha).toLocaleString('es-CO')}"`,
        t.banco, t.valor, `"${t.descripcion.replace(/"/g, '""')}"`, t.comprobante,
        impuesto, comision, valorLiquido
      ];
      csvRows.push(row.join(','));
    });
    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.setAttribute('href', URL.createObjectURL(blob));
    link.setAttribute('download', 'movimientos.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  });
  
  // --- Carga inicial de datos ---
  cargarDatos();
});