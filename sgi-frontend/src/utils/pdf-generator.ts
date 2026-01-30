import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Activo } from '@/types/organizacion/activo';

export const generateCartaResponsabilidad = (activo: Activo) => {
    const doc = new jsPDF();

    // Configuración base
    const pageWidth = doc.internal.pageSize.width;
    const marginKey = 20;
    const lineHeight = 7;
    let yPos = 30;

    // Título
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('CARTA DE RESPONSABILIDAD - ENTREGA DE EQUIPOS', pageWidth / 2, yPos, { align: 'center' });

    yPos += 20;

    // Fecha
    const fechaActual = new Date().toLocaleDateString('es-PE', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });

    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    doc.text(`Callao, ${fechaActual}`, pageWidth - marginKey, yPos, { align: 'right' });

    yPos += 20;

    // Cuerpo
    const nombreEmpleado = activo.empleado_asignado_nombre || "______________________";
    const dniEmpleado = activo.empleado_asignado_dni || "___________";

    const textoCuerpo = `Yo, ${nombreEmpleado}, identificado(a) con DNI N° ${dniEmpleado}, recibo de la empresa GRUPO CORBAN S.A.C. los siguientes equipos de cómputo/comunicación para el desempeño de mis funciones laborales:`;

    const splitText = doc.splitTextToSize(textoCuerpo, pageWidth - (marginKey * 2));
    doc.text(splitText, marginKey, yPos);

    yPos += 20;

    // Tabla de equipos
    const tableBody = [
        ['Producto', activo.producto],
        ['Marca', activo.marca || '-'],
        ['Modelo', activo.modelo || '-'],
        ['Serie / IMEI', activo.serie || '-'],
        ['Cód. Inventario', activo.codigo_inventario || '-'],
        ['Estado de Entrega', activo.estado_nombre || '-'],
        ['Observaciones', activo.observaciones || 'Ninguna']
    ];

    autoTable(doc, {
        startY: yPos,
        head: [['Concepto', 'Detalle']],
        body: tableBody,
        theme: 'grid',
        headStyles: { fillColor: [41, 128, 185], textColor: 255, halign: 'center' },
        styles: { fontSize: 10, cellPadding: 4 },
        columnStyles: {
            0: { fontStyle: 'bold', cellWidth: 50 },
            1: { cellWidth: 'auto' }
        },
        margin: { left: marginKey, right: marginKey }
    });

    // @ts-ignore
    yPos = doc.lastAutoTable.finalY + 20;

    // Compromiso
    const compromisos = [
        "1. Me comprometo a destinar los equipos descritos exclusivamente para los fines laborales asignados por la empresa.",
        "2. Asumo la responsabilidad total por la custodia, cuidado y conservación del equipo.",
        "3. Me comprometo a no instalar software no autorizado ni modificar la configuración del hardware/software sin autorización del área de Sistemas.",
        "4. En caso de pérdida, robo o daño irreparable causado por negligencia comprobada, asumo la responsabilidad de reposición o reparación, autorizando el descuento correspondiente de mis haberes según ley.",
        "5. Me comprometo a devolver los equipos inmediatamente al finalizar mi vínculo laboral o cuando la empresa lo solicite, en el mismo estado en que los recibí, salvo el desgaste natural por su uso legítimo."
    ];

    doc.setFontSize(10);
    compromisos.forEach(item => {
        const splitItem = doc.splitTextToSize(item, pageWidth - (marginKey * 2));
        doc.text(splitItem, marginKey, yPos);
        yPos += (splitItem.length * 5) + 3;
    });

    yPos += 30;

    // Firmas
    const firmaY = yPos + 10; // Espacio para firma

    // Línea de firma Empleado
    doc.line(marginKey + 10, firmaY, marginKey + 70, firmaY);
    doc.setFontSize(9);
    doc.text('RECIBÍ CONFORME', marginKey + 40, firmaY + 5, { align: 'center' });
    doc.text('Empleado', marginKey + 40, firmaY + 10, { align: 'center' });
    doc.text(`DNI: ${dniEmpleado}`, marginKey + 40, firmaY + 15, { align: 'center' });

    // Línea de firma Entrega (Sistemas/Admin)
    const rightMargin = pageWidth - marginKey - 70;
    doc.line(rightMargin, firmaY, pageWidth - marginKey - 10, firmaY);
    doc.text('ENTREGADO POR', rightMargin + 30, firmaY + 5, { align: 'center' });
    doc.text('Área de Sistemas / Admin', rightMargin + 30, firmaY + 10, { align: 'center' });

    // Guardar
    const fileName = `Carta_Responsabilidad_${nombreEmpleado.replace(/\s+/g, '_')}_${activo.producto}.pdf`;
    doc.save(fileName);
};
