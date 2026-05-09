#!/bin/bash

set -e

echo "=========================================="
echo "  智能设备监控平台 - 重启脚本"
echo "=========================================="
echo ""

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="${SCRIPT_DIR}/backend"
FRONTEND_DIR="${SCRIPT_DIR}/frontend"
BACKEND_PORT=3000
FRONTEND_PORT=5173

DATABASE_URL="postgresql://dev:dev123456@localhost:5432/db_zj_60033?schema=public"
REDIS_URL="redis://default:redis123456@localhost:6379"
JWT_SECRET="iot-platform-super-secret-jwt-key-change-in-production-2024"
JWT_EXPIRES_IN="24h"

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1"
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
        log "警告: 无法创建 .env 文件，后端可能无法启动"
    fi
}

kill_port_process() {
    local PORT=$1
    local SERVICE_NAME=$2
    
    log "检查端口 ${PORT} (${SERVICE_NAME})..."
    
    local PIDS=$(lsof -ti :${PORT} 2>/dev/null || true)
    
    if [ -n "${PIDS}" ]; then
        log "发现占用端口 ${PORT} 的进程，PID: ${PIDS}"
        log "正在终止进程..."
        
        for PID in ${PIDS}; do
            if kill -9 "${PID}" 2>/dev/null; then
                log "进程 ${PID} 已终止"
            else
                log "无法终止进程 ${PID}，可能需要手动处理"
            fi
        done
        
        sleep 2
        
        local REMAINING_PIDS=$(lsof -ti :${PORT} 2>/dev/null || true)
        if [ -n "${REMAINING_PIDS}" ]; then
            log "警告: 端口 ${PORT} 仍被进程占用: ${REMAINING_PIDS}"
        else
            log "端口 ${PORT} 已释放"
        fi
    else
        log "端口 ${PORT} 未被占用"
    fi
}

echo "[步骤 1/5] 终止现有服务进程..."
kill_port_process ${BACKEND_PORT} "后端服务"
kill_port_process ${FRONTEND_PORT} "前端服务"
echo ""

echo "[步骤 2/5] 检查 Docker 容器..."
DOCKER_CONTAINER="dev-postgres"
if ! docker ps --format '{{.Names}}' | grep -q "${DOCKER_CONTAINER}"; then
    if docker ps -a --format '{{.Names}}' | grep -q "${DOCKER_CONTAINER}"; then
        log "启动 Docker 容器 ${DOCKER_CONTAINER}..."
        docker start "${DOCKER_CONTAINER}"
        sleep 3
    else
        log "警告: Docker 容器 ${DOCKER_CONTAINER} 不存在"
    fi
fi
log "Docker 容器检查完成"
echo ""

echo "[步骤 3/5] 检查后端 .env 文件..."
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

echo "[步骤 4/5] 启动后端服务..."
cd "${BACKEND_DIR}"

if [ ! -d "node_modules" ]; then
    log "安装后端依赖..."
    npm install
fi

log "生成 Prisma Client..."
npx prisma generate

log "启动后端服务 (端口 ${BACKEND_PORT})..."
if [ -d "dist" ]; then
    nohup npm run start:prod > "${BACKEND_DIR}/backend.log" 2>&1 &
else
    nohup npm run start:dev > "${BACKEND_DIR}/backend.log" 2>&1 &
fi
BACKEND_PID=$!
log "后端服务已启动，PID: ${BACKEND_PID}"

echo ""
echo "[步骤 5/5] 启动前端服务..."
cd "${FRONTEND_DIR}"

if [ ! -d "node_modules" ]; then
    log "安装前端依赖..."
    npm install
fi

sleep 3

log "启动前端服务 (端口 ${FRONTEND_PORT})..."
nohup npm run dev > "${FRONTEND_DIR}/frontend.log" 2>&1 &
FRONTEND_PID=$!
log "前端服务已启动，PID: ${FRONTEND_PID}"

echo ""
echo "=========================================="
echo "  重启完成！"
echo "=========================================="
echo ""
echo "服务地址:"
echo "  前端: http://localhost:${FRONTEND_PORT}"
echo "  后端 API: http://localhost:${BACKEND_PORT}/api"
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
echo "=========================================="
