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

    $input = json_decode(file_get_contents('php://input'), true);

    if (!is_array($input)) {
        throw new Exception('JSON inválido');
    }

    /*
     * Datos recibidos
     */
    $sessionId      = $input['session_id'] ?? '';
    $evento         = $input['evento'] ?? '';
    $calidad        = $input['calidad'] ?? null;
    $ancho          = $input['ancho'] ?? null;
    $alto           = $input['alto'] ?? null;
    $area           = $input['area'] ?? null;
    $precio         = $input['precio'] ?? null;
    $numeroVentanas = $input['numero_ventanas'] ?? null;
    $total          = $input['total'] ?? null;

    /*
     * Eventos permitidos
     */
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

    /*
     * Validar session_id
     */
    if (
        !is_string($sessionId) ||
        !preg_match(
            '/^[a-f0-9]{8}-[a-f0-9]{4}-[1-5][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i',
            $sessionId
        )
    ) {
        throw new Exception('session_id inválido');
    }

    /*
     * Validar evento
     */
    if (
        !is_string($evento) ||
        !in_array($evento, $eventosPermitidos, true)
    ) {
        throw new Exception('Evento no permitido');
    }

    /*
     * Validar calidad si viene incluida
     */
    if ($calidad !== null) {

        $calidadesPermitidas = [
            'basico',
            'intermedio',
            'masVendido'
        ];

        if (
            !is_string($calidad) ||
            !in_array($calidad, $calidadesPermitidas, true)
        ) {
            throw new Exception('Calidad inválida');
        }
    }

    /*
     * Validar medidas
     */
    if ($ancho !== null) {

        if (!is_numeric($ancho) || $ancho < 1 || $ancho > 500) {
            throw new Exception('Ancho inválido');
        }

        $ancho = (float) $ancho;
    }

    if ($alto !== null) {

        if (!is_numeric($alto) || $alto < 1 || $alto > 500) {
            throw new Exception('Alto inválido');
        }

        $alto = (float) $alto;
    }

    /*
     * Validar área
     */
    if ($area !== null) {

        if (!is_numeric($area) || $area < 0) {
            throw new Exception('Área inválida');
        }

        $area = (float) $area;
    }

    /*
     * Validar precio
     */
    if ($precio !== null) {

        if (!is_numeric($precio) || $precio < 0) {
            throw new Exception('Precio inválido');
        }

        $precio = (float) $precio;
    }

    /*
     * Validar número de ventanas
     */
    if ($numeroVentanas !== null) {

        if (
            filter_var($numeroVentanas, FILTER_VALIDATE_INT) === false ||
            $numeroVentanas < 1 ||
            $numeroVentanas > 100
        ) {
            throw new Exception('Número de ventanas inválido');
        }

        $numeroVentanas = (int) $numeroVentanas;
    }

    /*
     * Validar total
     */
    if ($total !== null) {

        if (!is_numeric($total) || $total < 0) {
            throw new Exception('Total inválido');
        }

        $total = (float) $total;
    }

    /*
     * Insertar evento
     */
    $sql = "
        INSERT INTO cotizador_eventos (
            session_id,
            evento,
            calidad,
            ancho,
            alto,
            area,
            precio,
            numero_ventanas,
            total
        )
        VALUES (
            :session_id,
            :evento,
            :calidad,
            :ancho,
            :alto,
            :area,
            :precio,
            :numero_ventanas,
            :total
        )
    ";

    $stmt = $pdo->prepare($sql);

    $stmt->execute([
        ':session_id'      => $sessionId,
        ':evento'          => $evento,
        ':calidad'         => $calidad,
        ':ancho'           => $ancho,
        ':alto'            => $alto,
        ':area'            => $area,
        ':precio'          => $precio,
        ':numero_ventanas' => $numeroVentanas,
        ':total'           => $total
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