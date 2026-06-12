<?php
// Endpoint de TESTE para a "Busca remota (server-side)" do componente Tags input.
// Recebe o termo no parametro ?q= (configuravel no painel), filtra um dataset de
// tecnologias (busca sem acento, case-insensitive) e devolve no MESMO formato do
// mock/tags-input.json: { "tags": [ { "id", "text" }, ... ] }.
// Termo vazio (preload ao abrir) devolve os primeiros resultados. Nao usar em producao.

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

const MAX_RESULTS = 20;

$nomes = [
    'HTML', 'CSS', 'JavaScript', 'TypeScript', 'Python', 'PHP', 'Java', 'C#', 'C++',
    'Go', 'Rust', 'Ruby', 'Swift', 'Kotlin', 'Dart', 'Laravel', 'Symfony', 'CodeIgniter',
    'Vue.js', 'React', 'Angular', 'Svelte', 'jQuery', 'Alpine.js', 'Node.js', 'Deno',
    'Express', 'NestJS', 'Django', 'Flask', 'FastAPI', 'Spring Boot', 'Rails',
    'MySQL', 'MariaDB', 'PostgreSQL', 'SQLite', 'SQL Server', 'Oracle', 'Firebird',
    'MongoDB', 'Redis', 'Elasticsearch', 'RabbitMQ', 'Kafka', 'Docker', 'Kubernetes',
    'Nginx', 'Apache', 'Linux', 'Git', 'GitHub Actions', 'GitLab CI', 'Terraform',
    'AWS', 'Azure', 'Google Cloud', 'Tailwind CSS', 'Bootstrap', 'Tabler', 'Sass',
    'Webpack', 'Vite', 'ESLint', 'Jest', 'PHPUnit', 'Cypress', 'Playwright',
    'GraphQL', 'REST', 'gRPC', 'WebSocket', 'OAuth', 'JWT', 'Programacao Orientada a Objetos',
    'Integracao Continua', 'Computacao em Nuvem', 'Seguranca da Informacao'
];

$tags = [];
foreach ($nomes as $nome) {
    $tags[] = ['id' => slug($nome), 'text' => $nome];
}

$q = isset($_GET['q']) ? trim((string) $_GET['q']) : '';
$needle = normalizar($q);

$resultado = [];
foreach ($tags as $tag) {
    if ($needle !== '' && strpos(normalizar($tag['text']), $needle) === false) {
        continue;
    }
    $resultado[] = $tag;
    if (count($resultado) >= MAX_RESULTS) {
        break;
    }
}

echo json_encode(['tags' => $resultado], JSON_UNESCAPED_UNICODE);

function normalizar(string $valor): string
{
    $convertido = iconv('UTF-8', 'ASCII//TRANSLIT//IGNORE', $valor);
    if ($convertido === false) {
        $convertido = $valor;
    }
    return strtolower($convertido);
}

function slug(string $valor): string
{
    $base = normalizar($valor);
    return trim(preg_replace('/[^a-z0-9]+/', '-', $base), '-');
}
