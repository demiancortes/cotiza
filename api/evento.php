<?php

header('Content-Type: application/json; charset=utf-8');

try {

    require_once __DIR__ . '/../db.php';

    // Prueba sencilla de conexión
    $pdo->query('SELECT 1');

    echo json_encode([
        'ok' => true,
        'mensaje' => 'Conexión a la base de datos funcionando'
    ]);

} catch (Throwable $e) {

    http_response_code(500);

    echo json_encode([
        'ok' => false,
        'mensaje' => 'Error de conexión a la base de datos'
    ]);
}