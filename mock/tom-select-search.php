<?php
// Endpoint de TESTE para a "Busca remota (server-side)" do componente TomSelect.
// Recebe o termo no parametro ?q= (configuravel no painel), filtra um dataset de
// ~300 itens (busca sem acento, case-insensitive) e devolve no MESMO formato do
// mock/tom-select.json: { "categorias": [ { "id", "text" }, ... ] }.
// Termo vazio (preload ao abrir) devolve os primeiros resultados. Nao usar em producao.

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

const MAX_RESULTS = 20;

// Dataset deterministico: categorias x qualificadores (com acentos de proposito,
// para testar a normalizacao da busca).
$bases = [
    'Eletronicos', 'Roupas', 'Alimentos', 'Moveis', 'Livros', 'Esportes', 'Brinquedos',
    'Informatica', 'Decoracao', 'Jardinagem', 'Automotivo', 'Calcados', 'Beleza',
    'Saude', 'Papelaria', 'Ferramentas', 'Pet Shop', 'Bebes', 'Musica', 'Filmes'
];
$qualificadores = [
    'Importados', 'Nacionais', 'Promocao', 'Lancamentos', 'Usados',
    'Premium', 'Basicos', 'Infantis', 'Profissionais', 'Edicao Limitada',
    'Sao Paulo', 'Grao Especial', 'Coleção', 'Orgânicos', 'Açao'
];

$itens = [];
$id = 1;
foreach ($bases as $base) {
    $itens[] = ['id' => (string) $id++, 'text' => $base];
    foreach ($qualificadores as $qualificador) {
        $itens[] = ['id' => (string) $id++, 'text' => $base . ' - ' . $qualificador];
    }
}

$q = isset($_GET['q']) ? trim((string) $_GET['q']) : '';
$needle = normalizar($q);

$resultado = [];
foreach ($itens as $item) {
    if ($needle !== '' && strpos(normalizar($item['text']), $needle) === false) {
        continue;
    }
    $resultado[] = $item;
    if (count($resultado) >= MAX_RESULTS) {
        break;
    }
}

echo json_encode(['categorias' => $resultado], JSON_UNESCAPED_UNICODE);

function normalizar(string $valor): string
{
    $convertido = iconv('UTF-8', 'ASCII//TRANSLIT//IGNORE', $valor);
    if ($convertido === false) {
        $convertido = $valor;
    }
    return strtolower($convertido);
}
