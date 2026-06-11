<?php
// Endpoint de TESTE para o "Enviar via AJAX" do formulario (componente Form).
// Devolve um JSON com tudo o que recebeu (metodo, headers e corpo), para conferir
// no DevTools que o envio esta correto. Nao usar em producao.

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Headers: Authorization, Content-Type, X-API-Key');
header('Access-Control-Allow-Methods: POST, PUT, PATCH, OPTIONS');

// Preflight do CORS (quando ha headers customizados, o navegador manda OPTIONS antes).
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

$rawBody = file_get_contents('php://input');
$jsonBody = json_decode($rawBody, true);

$received = [
    'metodo'  => $_SERVER['REQUEST_METHOD'],
    'headers' => [
        'Authorization' => isset($_SERVER['HTTP_AUTHORIZATION']) ? $_SERVER['HTTP_AUTHORIZATION'] : null,
        'X-API-Key'     => isset($_SERVER['HTTP_X_API_KEY']) ? $_SERVER['HTTP_X_API_KEY'] : null,
        'Content-Type'  => isset($_SERVER['CONTENT_TYPE']) ? $_SERVER['CONTENT_TYPE'] : null,
    ],
    // Corpo JSON quando o formato e "json"; $_POST/$_FILES quando e "formdata".
    'json'    => $jsonBody,
    'post'    => $_POST,
    'arquivos' => array_keys($_FILES),
];

echo json_encode(['ok' => true, 'recebido' => $received], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
