<?php
/**
 * EJEMPLO DE INTEGRACIÓN: Envío de Leads Web al SGI
 * Este código debe agregarse en el archivo `mailer.php` (o similar) de cada página web.
 * 
 * Requisitos:
 * - Tener PHP con la extensión cURL habilitada.
 * - Conocer el dominio del SGI (ej: https://api.grupocorban.pe o http://ip:8000)
 * - Conocer la API Key configurada en el servidor SGI (`SGI_WEB_API_KEY`)
 */

// ==========================================
// 1. CONFIGURACIÓN (Ajustar según entorno)
// ==========================================
$SGI_URL = "http://localhost:8000/api/v1/publico/leads-web"; // URL del endpoint público del SGI
$SGI_API_KEY = "PONER_AQUI_LA_API_KEY_SECRETA"; // Debe coincidir con el .env del backend
$PAGINA_ORIGEN = "eblgroup.pe"; // Dominio exacto configurado en MAPEO_PAGINA_EMPRESA en el SGI

// ==========================================
// 2. DATOS DEL LEAD (Obtenidos del $_POST)
// ==========================================
// Asumiendo que estas variables ya fueron sanitizadas en tu mailer.php original:
// $nombre_limpio, $correo_limpio, $contacto_limpio, $asunto_limpio, $mensaje_limpio

$lead_data = array(
    "nombre" => $nombre_limpio,
    "correo" => $correo_limpio,
    "telefono" => $contacto_limpio,
    "asunto" => $asunto_limpio,
    "mensaje" => $mensaje_limpio,
    "pagina_origen" => $PAGINA_ORIGEN
);

// ==========================================
// 3. ENVÍO AL SGI (usando cURL)
// ==========================================
// OJO: Es recomendable ejecutar esto DESPUÉS de comprobar que el reCAPTCHA es válido
// y después de enviar el correo por PHPMailer.

$ch = curl_init($SGI_URL);

// Configurar opciones de cURL
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true); // Devolver respuesta como string
curl_setopt($ch, CURLOPT_POST, true);           // Método POST
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($lead_data)); // Datos en formato JSON

// Configurar Headers (incluyendo la API Key)
curl_setopt($ch, CURLOPT_HTTPHEADER, array(
    'Content-Type: application/json',
    'X-SGI-API-Key: ' . $SGI_API_KEY
));

// (Opcional) Si hay problemas con SSL en local, usar esto (NO RECOMENDADO EN PRODUCCIÓN)
// curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);

// Ejecutar la petición
$response = curl_exec($ch);
$http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);

// Cerrar conexión
curl_close($ch);

// ==========================================
// 4. MANEJO DE RESULTADOS (Opcional, para logs)
// ==========================================
if ($http_code == 200 || $http_code == 201) {
    // Éxito: El lead se registró en el SGI
    // error_log("SGI: Lead enviado correctamente desde " . $PAGINA_ORIGEN);
} else {
    // Error
    // error_log("SGI: Error enviando lead. Code: $http_code. Response: $response");
}
?>
