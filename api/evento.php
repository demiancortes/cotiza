<?php

header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);

    echo json_encode([
        'ok' => false,
        'mensaje' => 'Método no permitido'
    ]);

    exit;
}

try {

    require_once __DIR__ . '/../db.php';

    // Leer JSON enviado por la SPA
    $input = json_decode(file_get_contents('php://input'), true);

    if (!is_array($input)) {
        throw new Exception('JSON inválido');
    }

    $sessionId = $input['session_id'] ?? '';
    $evento    = $input['evento'] ?? '';

    // Eventos permitidos
    $eventosPermitidos = [
        'cotizador_inicio',
        'calidad_seleccionada',
        'medidas_calculadas',
        'ventana_agregada',
        'cotizacion_generada',
        'interesado_click',
        'datos_enviados',
        'whatsapp_click'
    ];

    // Validar session_id
    if (
        !is_string($sessionId) ||
        strlen($sessionId) !== 36
    ) {
        throw new Exception('session_id inválido');
    }

    // Validar evento
    if (
        !is_string($evento) ||
        !in_array($evento, $eventosPermitidos, true)
    ) {
        throw new Exception('Evento no permitido');
    }

    /*
     * Por ahora solamente guardaremos:
     * session_id
     * evento
     *
     * Los demás campos los agregaremos
     * cuando conectemos los eventos reales.
     */

    $sql = "
        INSERT INTO cotizador_eventos (
            session_id,
            evento
        )
        VALUES (
            :session_id,
            :evento
        )
    ";

    $stmt = $pdo->prepare($sql);

    $stmt->execute([
        ':session_id' => $sessionId,
        ':evento'    => $evento
    ]);

    echo json_encode([
        'ok' => true,
        'mensaje' => 'Evento registrado'
    ]);

} catch (Throwable $e) {

    http_response_code(500);

    echo json_encode([
        'ok' => false,
        'mensaje' => 'No se pudo registrar el evento'
    ]);
}