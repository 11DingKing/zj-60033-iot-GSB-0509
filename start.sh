#!/bin/bash

set -e

echo "=========================================="
echo "  智能设备监控平台 - 启动脚本"
echo "=========================================="
echo ""

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="${SCRIPT_DIR}/backend"
FRONTEND_DIR="${SCRIPT_DIR}/frontend"
DATABASE_NAME="db_zj_60033"
DOCKER_CONTAINER="dev-postgres"
PG_USER="dev"
PG_PASSWORD="dev123456"

DATABASE_URL="postgresql://dev:dev123456@localhost:5432/db_zj_60033?schema=public"
REDIS_URL="redis://default:redis123456@localhost:6379"
JWT_SECRET="iot-platform-super-secret-jwt-key-change-in-production-2024"
JWT_EXPIRES_IN="24h"
BACKEND_PORT=3000

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1"
}

error_exit() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] 错误: $1" >&2
    exit 1
}

create_env_file() {
    local ENV_FILE="${BACKEND_DIR}/.env"
    log "创建 .env 文件..."
    
    cat > "${ENV_FILE}" << EOF
DATABASE_URL="${DATABASE_URL}"
REDIS_URL="${REDIS_URL}"
JWT_SECRET="${JWT_SECRET}"
JWT_EXPIRES_IN="${JWT_EXPIRES_IN}"
PORT=${BACKEND_PORT}
EOF

    if [ $? -eq 0 ]; then
        log ".env 文件创建成功: ${ENV_FILE}"
    else
        error_exit "无法创建 .env 文件"
    fi
}

echo "[步骤 1/9] 检查 Docker 容器 ${DOCKER_CONTAINER}..."
if ! docker ps --format '{{.Names}}' | grep -q "${DOCKER_CONTAINER}"; then
    if ! docker ps -a --format '{{.Names}}' | grep -q "${DOCKER_CONTAINER}"; then
        error_exit "Docker 容器 ${DOCKER_CONTAINER} 不存在，请先创建 PostgreSQL 容器"
    else
        log "启动 Docker 容器 ${DOCKER_CONTAINER}..."
        docker start "${DOCKER_CONTAINER}"
        sleep 3
    fi
fi

if ! docker ps --format '{{.Names}}' | grep -q "${DOCKER_CONTAINER}"; then
    error_exit "无法启动 Docker 容器 ${DOCKER_CONTAINER}"
fi

log "Docker 容器 ${DOCKER_CONTAINER} 运行正常"
echo ""

echo "[步骤 2/9] 检查数据库 ${DATABASE_NAME}..."
DB_EXISTS=$(docker exec -e PGPASSWORD="${PG_PASSWORD}" "${DOCKER_CONTAINER}" psql -U "${PG_USER}" -d postgres -t -c "SELECT 1 FROM pg_database WHERE datname='${DATABASE_NAME}'")

if [ -z "$DB_EXISTS" ] || [ "$DB_EXISTS" = " 1" ] 2>/dev/null || echo "$DB_EXISTS" | grep -q "1"; then
    log "数据库 ${DATABASE_NAME} 已存在"
else
    log "创建数据库 ${DATABASE_NAME}..."
    docker exec -e PGPASSWORD="${PG_PASSWORD}" "${DOCKER_CONTAINER}" psql -U "${PG_USER}" -d postgres -c "CREATE DATABASE ${DATABASE_NAME}"
    log "数据库 ${DATABASE_NAME} 创建成功"
fi
echo ""

echo "[步骤 3/9] 检查后端 .env 文件..."
if [ -f "${BACKEND_DIR}/.env" ]; then
    log ".env 文件已存在: ${BACKEND_DIR}/.env"
    
    if grep -q "DATABASE_URL" "${BACKEND_DIR}/.env"; then
        log "DATABASE_URL 已配置"
    else
        log "DATABASE_URL 未配置，追加到 .env 文件..."
        echo "DATABASE_URL=\"${DATABASE_URL}\"" >> "${BACKEND_DIR}/.env"
    fi
    
    if grep -q "REDIS_URL" "${BACKEND_DIR}/.env"; then
        log "REDIS_URL 已配置"
    else
        log "REDIS_URL 未配置，追加到 .env 文件..."
        echo "REDIS_URL=\"${REDIS_URL}\"" >> "${BACKEND_DIR}/.env"
    fi
    
    if grep -q "JWT_SECRET" "${BACKEND_DIR}/.env"; then
        log "JWT_SECRET 已配置"
    else
        log "JWT_SECRET 未配置，追加到 .env 文件..."
        echo "JWT_SECRET=\"${JWT_SECRET}\"" >> "${BACKEND_DIR}/.env"
    fi
else
    create_env_file
fi
echo ""

echo "[步骤 4/9] 检查 Redis 连接..."
if ! command -v redis-cli &> /dev/null; then
    log "redis-cli 未安装，跳过 Redis 连接检查（后端会自动处理连接）"
elif ! redis-cli ping >/dev/null 2>&1; then
    log "警告: 无法连接到 Redis，后端启动后会自动重试。如需缓存功能请确保 Redis 已启动"
else
    log "Redis 连接正常"
fi
echo ""

echo "[步骤 5/9] 安装后端依赖..."
cd "${BACKEND_DIR}"

if [ -d "node_modules" ]; then
    log "后端 node_modules 已存在，跳过安装"
else
    log "正在安装后端依赖..."
    npm install
fi
echo ""

echo "[步骤 6/9] 安装前端依赖..."
cd "${FRONTEND_DIR}"

if [ -d "node_modules" ]; then
    log "前端 node_modules 已存在，跳过安装"
else
    log "正在安装前端依赖..."
    npm install
fi
echo ""

echo "[步骤 7/9] 生成 Prisma Client..."
cd "${BACKEND_DIR}"
log "正在生成 Prisma Client..."
npx prisma generate
echo ""

echo "[步骤 8/9] 执行 Prisma 迁移和种子数据..."
if [ ! -d "prisma/migrations" ] || [ -z "$(ls -A prisma/migrations 2>/dev/null)" ]; then
    log "首次运行，创建初始迁移..."
    npx prisma migrate dev --name init
else
    log "执行数据库迁移..."
    npx prisma migrate dev
fi

echo ""
echo "[步骤 9/9] 启动服务..."

cd "${BACKEND_DIR}"
log "启动后端服务 (端口 ${BACKEND_PORT})..."
if [ -d "dist" ]; then
    log "使用已编译的文件启动..."
    nohup npm run start:prod > "${BACKEND_DIR}/backend.log" 2>&1 &
else
    log "使用开发模式启动..."
    nohup npm run start:dev > "${BACKEND_DIR}/backend.log" 2>&1 &
fi
BACKEND_PID=$!
log "后端服务已启动，PID: ${BACKEND_PID}"

sleep 3

cd "${FRONTEND_DIR}"
log "启动前端服务 (端口 5173)..."
nohup npm run dev > "${FRONTEND_DIR}/frontend.log" 2>&1 &
FRONTEND_PID=$!
log "前端服务已启动，PID: ${FRONTEND_PID}"

echo ""
echo "=========================================="
echo "  启动完成！"
echo "=========================================="
echo ""
echo "服务地址:"
echo "  前端: http://localhost:5173"
echo "  后端 API: http://localhost:${BACKEND_PORT}/api"
echo ""
echo "默认管理员账号:"
echo "  用户名: admin"
echo "  密码: admin123"
echo ""
echo "环境变量文件:"
echo "  ${BACKEND_DIR}/.env"
echo ""
echo "日志文件:"
echo "  后端: ${BACKEND_DIR}/backend.log"
echo "  前端: ${FRONTEND_DIR}/frontend.log"
echo ""
echo "进程 PID:"
echo "  后端: ${BACKEND_PID}"
echo "  前端: ${FRONTEND_PID}"
echo ""
echo "提示: 后端会每 30 秒为在线设备模拟生成数据"
echo "=========================================="
