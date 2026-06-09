<?php
// api/db.php

// Simple env loader
if (file_exists(__DIR__ . '/../.env')) {
    $lines = file(__DIR__ . '/../.env', FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    foreach ($lines as $line) {
        if (strpos(trim($line), '#') === 0) continue;
        list($name, $value) = explode('=', $line, 2);
        $name = trim($name);
        $value = trim($value);
        putenv("$name=$value");
        $_ENV[$name] = $value;
        $_SERVER[$name] = $value;
    }
}

class SupabaseDB {
    public $pdo = null;
    public $connect_error = null;
    public $insert_id = null;
    public $error = null;

    public function __construct() {
        $host = getenv('SUPABASE_DB_HOST') ?: 'db.usdbyomrcjxdxgwfzwkc.supabase.co';
        $port = getenv('SUPABASE_DB_PORT') ?: '5432';
        $dbname = getenv('SUPABASE_DB_NAME') ?: 'postgres';
        $user = getenv('SUPABASE_DB_USER') ?: 'postgres';
        $pass = getenv('SUPABASE_DB_PASSWORD') ?: 'xlhKE3GnjJxkpd8v';

        $sslmode = getenv('SUPABASE_DB_SSLMODE') ?: 'require';
        
        // Auto-disable SSL if connecting to localhost, 127.0.0.1, or local sandbox/private IPs
        $is_local = false;
        if ($host === 'localhost' || $host === '127.0.0.1' || $host === '::1') {
            $is_local = true;
        } else {
            $resolved_ip = filter_var($host, FILTER_VALIDATE_IP) ? $host : @gethostbyname($host);
            if ($resolved_ip) {
                if (strpos($resolved_ip, '127.') === 0 || 
                    strpos($resolved_ip, '198.18.') === 0 || 
                    strpos($resolved_ip, '10.') === 0 || 
                    strpos($resolved_ip, '192.168.') === 0 ||
                    preg_match('/^172\.(1[6-9]|2[0-9]|3[0-1])\./', $resolved_ip)) {
                    $is_local = true;
                }
            }
        }

        if ($is_local && !getenv('SUPABASE_DB_SSLMODE')) {
            $sslmode = 'disable';
        }

        try {
            $dsn = "pgsql:host=$host;port=$port;dbname=$dbname;sslmode=$sslmode";
            $this->pdo = new PDO($dsn, $user, $pass, [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_EMULATE_PREPARES => true
            ]);

            // Auto-initialize DB schema if it doesn't exist
            $this->initializeSchema();

        } catch (PDOException $e) {
            $this->connect_error = $e->getMessage();
            $this->error = $e->getMessage();
        }
    }

    private function initializeSchema() {
        if (!$this->pdo) return;
        try {
            $stmt = $this->pdo->query("SELECT to_regclass('public.country_regulations')");
            $exists = $stmt->fetchColumn();
            if (!$exists) {
                $sqlFile = __DIR__ . '/../supabase_schema.sql';
                if (file_exists($sqlFile)) {
                    $sql = file_get_contents($sqlFile);
                    $this->pdo->exec($sql);
                }
            }
        } catch (Exception $e) {
            // Ignore schema initialization errors (e.g. if read-only or permission issues)
        }
    }

    public function query($sql) {
        $this->error = null;
        $is_select = preg_match('/^\s*(select|show|describe|explain)\s/i', $sql);
        
        if (!$this->pdo) {
            $this->error = "Database connection not established: " . $this->connect_error;
            return $is_select ? new SupabaseDB_result([]) : false;
        }
        try {
            if ($is_select) {
                $stmt = $this->pdo->query($sql);
                return new SupabaseDB_result($stmt->fetchAll());
            } else {
                $affected = $this->pdo->exec($sql);
                if (preg_match('/^\s*insert\s/i', $sql)) {
                    $this->insert_id = $this->pdo->lastInsertId();
                }
                return true;
            }
        } catch (PDOException $e) {
            $this->error = $e->getMessage();
            return $is_select ? new SupabaseDB_result([]) : false;
        }
    }

    public function prepare($sql) {
        $this->error = null;
        if (!$this->pdo) {
            $this->error = "Database connection not established: " . $this->connect_error;
            return new SupabaseDB_stmt(null, $this);
        }
        try {
            $stmt = $this->pdo->prepare($sql);
            return new SupabaseDB_stmt($stmt, $this);
        } catch (PDOException $e) {
            $this->error = $e->getMessage();
            return new SupabaseDB_stmt(null, $this);
        }
    }

    public function close() {
        $this->pdo = null;
    }

    public function lastInsertId() {
        if (!$this->pdo) return null;
        return $this->pdo->lastInsertId();
    }
}

class SupabaseDB_stmt {
    private $stmt;
    private $parent;
    private $params = [];

    public function __construct($stmt, $parent) {
        $this->stmt = $stmt;
        $this->parent = $parent;
    }

    public function bind_param($types, &...$args) {
        $this->params = $args;
        return true;
    }

    public function execute() {
        if (!$this->stmt) return false;
        try {
            // Bind parameters and execute
            $res = $this->stmt->execute($this->params);
            
            // Check if it's an insert to update lastInsertId
            $sql = $this->stmt->queryString;
            if (preg_match('/^\s*insert\s/i', $sql)) {
                $this->parent->insert_id = $this->parent->lastInsertId();
            }
            return $res;
        } catch (PDOException $e) {
            $this->parent->error = $e->getMessage();
            return false;
        }
    }

    public function get_result() {
        if (!$this->stmt) return new SupabaseDB_result([]);
        try {
            $rows = $this->stmt->fetchAll();
            return new SupabaseDB_result($rows);
        } catch (PDOException $e) {
            $this->parent->error = $e->getMessage();
            return new SupabaseDB_result([]);
        }
    }

    public function close() {
        $this->stmt = null;
    }
}

class SupabaseDB_result {
    private $rows;
    private $index = 0;
    public $num_rows = 0;

    public function __construct($rows) {
        $this->rows = $rows ?: [];
        $this->num_rows = count($this->rows);
    }

    public function fetch_assoc() {
        if ($this->index < $this->num_rows) {
            return $this->rows[$this->index++];
        }
        return null;
    }

    public function fetch_all($mode = null) {
        return $this->rows;
    }
}
