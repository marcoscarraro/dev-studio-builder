<?php
// Mock server-side para o componente DataTable.
// Gera 80000 registros deterministicos em memoria (TOTAL_RECORDS) e responde no
// protocolo server-side do jQuery DataTables. Aceita GET, POST form-url-encoded
// e POST JSON. Guia completo: docs/COMPONENTE_DATATABLE.md

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Headers: Authorization, Content-Type, X-API-Key, X-Tenant');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

const TOTAL_RECORDS = 80000;

$request = read_datatable_request();
$draw = max(0, (int) get_value($request, 'draw', 0));
$start = max(0, (int) get_value($request, 'start', 0));
$length = (int) get_value($request, 'length', 10);

if ($length < 1 || $length > 500) {
    $length = 10;
}

$search = trim((string) get_nested_value($request, ['search', 'value'], ''));
$columns = normalize_columns(get_value($request, 'columns', []));
$order = normalize_order(get_value($request, 'order', []));
$sortField = resolve_sort_field($columns, $order);
$sortDir = resolve_sort_direction($order);
$returnObjects = should_return_objects($columns);

$filtered = [];
for ($id = 1; $id <= TOTAL_RECORDS; $id++) {
    $record = make_record($id);
    if ($search !== '' && !record_matches_search($record, $search)) {
        continue;
    }
    $filtered[] = $record;
}

if ($sortField !== '') {
    usort($filtered, function ($a, $b) use ($sortField, $sortDir) {
        $left = $a[$sortField] ?? '';
        $right = $b[$sortField] ?? '';

        if (is_numeric($left) && is_numeric($right)) {
            $result = $left <=> $right;
        } else {
            $result = strnatcasecmp((string) $left, (string) $right);
        }

        return $sortDir === 'desc' ? -$result : $result;
    });
}

$page = array_slice($filtered, $start, $length);
$data = array_map(function ($record) use ($returnObjects) {
    if ($returnObjects) {
        return $record;
    }

    return [
        $record['id'],
        $record['nome'],
        $record['email'],
        $record['situacao'],
    ];
}, $page);

echo json_encode([
    'draw' => $draw,
    'recordsTotal' => TOTAL_RECORDS,
    'recordsFiltered' => count($filtered),
    'data' => $data,
], JSON_UNESCAPED_UNICODE);

function read_datatable_request(): array
{
    $rawBody = file_get_contents('php://input');
    $contentType = $_SERVER['CONTENT_TYPE'] ?? '';
    $jsonBody = [];

    if (stripos($contentType, 'application/json') !== false && $rawBody !== '') {
        $decoded = json_decode($rawBody, true);
        if (is_array($decoded)) {
            $jsonBody = $decoded;
        }
    }

    return array_replace_recursive($_GET, $_POST, $jsonBody);
}

function make_record(int $id): array
{
    $firstNames = ['Maria', 'Joao', 'Ana', 'Carlos', 'Fernanda', 'Roberto', 'Juliana', 'Ricardo', 'Patricia', 'Lucas'];
    $lastNames = ['Silva', 'Santos', 'Oliveira', 'Lima', 'Costa', 'Souza', 'Pereira', 'Almeida', 'Rocha', 'Martins'];
    $statuses = ['Ativo', 'Inativo', 'Pendente'];
    $cities = ['Sao Paulo', 'Rio de Janeiro', 'Curitiba', 'Belo Horizonte', 'Porto Alegre', 'Recife'];

    $firstName = $firstNames[($id - 1) % count($firstNames)];
    $lastName = $lastNames[(int) floor(($id - 1) / count($firstNames)) % count($lastNames)];
    $name = $firstName . ' ' . $lastName;

    return [
        'id' => $id,
        'nome' => $name,
        'email' => strtolower(remove_accents($firstName . '.' . $lastName . $id)) . '@email.com',
        'situacao' => $statuses[$id % count($statuses)],
        'cidade' => $cities[$id % count($cities)],
        'valor' => number_format(fmod($id * 13.73, 10000), 2, '.', ''),
        'criado_em' => date('Y-m-d', strtotime('2024-01-01 +' . ($id % 730) . ' days')),
    ];
}

function record_matches_search(array $record, string $search): bool
{
    $needle = strtolower(remove_accents($search));
    foreach ($record as $value) {
        $haystack = strtolower(remove_accents((string) $value));
        if (strpos($haystack, $needle) !== false) {
            return true;
        }
    }

    return false;
}

function normalize_columns($columns): array
{
    if (!is_array($columns)) {
        return [];
    }

    return array_values(array_map(function ($column) {
        if (!is_array($column)) {
            return ['data' => '', 'name' => ''];
        }

        return [
            'data' => (string) ($column['data'] ?? ''),
            'name' => (string) ($column['name'] ?? ''),
        ];
    }, $columns));
}

function normalize_order($order): array
{
    if (!is_array($order)) {
        return [];
    }

    return array_values($order);
}

function resolve_sort_field(array $columns, array $order): string
{
    $allowed = ['id', 'nome', 'email', 'situacao', 'cidade', 'valor', 'criado_em'];
    $columnIndex = (int) get_nested_value($order, [0, 'column'], 0);
    $column = $columns[$columnIndex] ?? [];
    $field = (string) ($column['data'] ?? '');

    if ($field === '' || is_numeric($field)) {
        $fallbackByIndex = ['id', 'nome', 'email', 'situacao'];
        $field = $fallbackByIndex[$columnIndex] ?? 'id';
    }

    return in_array($field, $allowed, true) ? $field : 'id';
}

function resolve_sort_direction(array $order): string
{
    $dir = strtolower((string) get_nested_value($order, [0, 'dir'], 'asc'));
    return $dir === 'desc' ? 'desc' : 'asc';
}

function should_return_objects(array $columns): bool
{
    foreach ($columns as $column) {
        $data = (string) ($column['data'] ?? '');
        if ($data !== '' && !is_numeric($data)) {
            return true;
        }
    }

    return false;
}

function get_value(array $source, string $key, $default = null)
{
    return array_key_exists($key, $source) ? $source[$key] : $default;
}

function get_nested_value($source, array $path, $default = null)
{
    $value = $source;
    foreach ($path as $key) {
        if (!is_array($value) || !array_key_exists($key, $value)) {
            return $default;
        }
        $value = $value[$key];
    }

    return $value;
}

function remove_accents(string $value): string
{
    $converted = iconv('UTF-8', 'ASCII//TRANSLIT//IGNORE', $value);
    return $converted === false ? $value : $converted;
}
