#!/bin/bash

# ============================================================================
# Trading Platform - Start Script (Root)
# ============================================================================
# Starts both backend (FastAPI) and frontend (Next.js) servers.
# Run from project root: ./start.sh
# Stop: Ctrl+C
# ============================================================================

set -e

# ============================================================================
# COLOR DEFINITIONS
# ============================================================================
CYAN='\033[0;36m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
WHITE='\033[1;37m'
GRAY='\033[0;37m'
BOLD='\033[1m'
NC='\033[0m'

# ============================================================================
# PATHS
# ============================================================================
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$ROOT_DIR/backend"
FRONTEND_DIR="$ROOT_DIR/frontend"

# ============================================================================
# UTILITY FUNCTIONS
# ============================================================================

print_banner() {
    echo -e "${CYAN}"
    echo "╔══════════════════════════════════════════════════════════════════════════╗"
    echo "║                                                                          ║"
    echo "║   ████████╗███████╗██████╗ ███╗   ███╗██╗███╗   ██╗ █████╗ ██╗         ║"
    echo "║   ╚══██╔══╝██╔════╝██╔══██╗████╗ ████║██║████╗  ██║██╔══██╗██║         ║"
    echo "║      ██║   █████╗  ██████╔╝██╔████╔██║██║██╔██╗ ██║███████║██║         ║"
    echo "║      ██║   ██╔══╝  ██╔══██╗██║╚██╔╝██║██║██║╚██╗██║██╔══██║██║         ║"
    echo "║      ██║   ███████╗██║  ██║██║ ╚═╝ ██║██║██║ ╚████║██║  ██║███████╗    ║"
    echo "║      ╚═╝   ╚══════╝╚═╝  ╚═╝╚═╝     ╚═╝╚═╝╚═╝  ╚═══╝╚═╝  ╚═╝╚══════╝    ║"
    echo "║                                                                          ║"
    echo "║              Trading Platform - Backend + Frontend                       ║"
    echo "║                              v2.0.0                                      ║"
    echo "║                                                                          ║"
    echo "╚══════════════════════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
}

print_step() {
    local step=$1
    local total=$2
    local message=$3
    echo -e "${WHITE}[${CYAN}${step}/${total}${WHITE}]${NC} ${BOLD}${message}${NC}"
}

print_success() {
    echo -e "    ${GREEN}[✓]${NC} $1"
}

print_error() {
    echo -e "    ${RED}[✗]${NC} $1"
}

print_warning() {
    echo -e "    ${YELLOW}[!]${NC} $1"
}

print_info() {
    echo -e "    ${GRAY}[→]${NC} $1"
}

print_separator() {
    echo -e "${GRAY}────────────────────────────────────────────────────────────────────────────${NC}"
}

# ============================================================================
# MAIN SCRIPT
# ============================================================================

TOTAL_STEPS=8

clear
print_banner

echo -e "${CYAN}Starting project setup...${NC}"
echo ""
print_separator
echo ""

# ============================================================================
# STEP 1: Python Check
# ============================================================================

print_step 1 $TOTAL_STEPS "Checking Python installation..."
echo ""

if command -v python3 &> /dev/null; then
    PYTHON_VERSION=$(python3 --version 2>&1 | awk '{print $2}')
    PYTHON_MAJOR=$(echo $PYTHON_VERSION | cut -d. -f1)
    PYTHON_MINOR=$(echo $PYTHON_VERSION | cut -d. -f2)
    
    if [ "$PYTHON_MAJOR" -ge 3 ] && [ "$PYTHON_MINOR" -ge 8 ]; then
        print_success "Python ${PYTHON_VERSION} found"
        PYTHON_CMD="python3"
    else
        print_error "Python 3.8+ required (found ${PYTHON_VERSION})"
        exit 1
    fi
else
    print_error "Python not found. Please install Python 3.8+"
    exit 1
fi

echo ""
print_separator
echo ""

# ============================================================================
# STEP 2: Environment File Check (backend/.env)
# ============================================================================

print_step 2 $TOTAL_STEPS "Checking environment configuration..."
echo ""

if [ -f "$BACKEND_DIR/.env" ]; then
    print_success ".env file found in backend/"
    
    print_info "Validating required environment variables..."
    
    while IFS='=' read -r key value; do
        [[ "$key" =~ ^#.*$ || -z "$key" ]] && continue
        value="${value%\"}"
        value="${value#\"}"
        value="${value%\'}"
        value="${value#\'}"
        export "$key=$value"
    done < "$BACKEND_DIR/.env"
    
    REQUIRED_VARS=(
        "MYSQL_HOST"
        "MYSQL_USER"
        "MYSQL_PASSWORD"
        "MYSQL_DATABASE"
        "SECRET_KEY"
        "DATABASE_URL"
    )
    
    MISSING_VARS=()
    for var in "${REQUIRED_VARS[@]}"; do
        if [ -z "${!var}" ]; then
            MISSING_VARS+=("$var")
        fi
    done
    
    if [ ${#MISSING_VARS[@]} -eq 0 ]; then
        print_success "All required environment variables are set"
    else
        print_error "Missing required environment variables:"
        for var in "${MISSING_VARS[@]}"; do
            echo -e "        ${RED}• ${var}${NC}"
        done
        exit 1
    fi
else
    print_error ".env file not found in backend/"
    echo ""
    echo -e "    ${YELLOW}Please create backend/.env with:${NC}"
    echo -e "    ${GRAY}MYSQL_HOST, MYSQL_USER, MYSQL_PASSWORD, MYSQL_DATABASE${NC}"
    echo -e "    ${GRAY}SECRET_KEY, DATABASE_URL${NC}"
    exit 1
fi

echo ""
print_separator
echo ""

# ============================================================================
# STEP 3: Virtual Environment Setup (backend/venv)
# ============================================================================

print_step 3 $TOTAL_STEPS "Setting up virtual environment..."
echo ""

if [ -d "$BACKEND_DIR/venv" ]; then
    print_info "Virtual environment found"
else
    print_info "Creating virtual environment..."
    $PYTHON_CMD -m venv "$BACKEND_DIR/venv" 2>/dev/null
    
    if [ -d "$BACKEND_DIR/venv" ]; then
        print_success "Virtual environment created"
    else
        print_error "Failed to create virtual environment"
        exit 1
    fi
fi

print_info "Activating virtual environment..."
source "$BACKEND_DIR/venv/bin/activate"

if [ "$VIRTUAL_ENV" != "" ]; then
    print_success "Virtual environment activated"
else
    print_error "Failed to activate virtual environment"
    exit 1
fi

echo ""
print_separator
echo ""

# ============================================================================
# STEP 4: Install Dependencies (backend/requirements.txt)
# ============================================================================

print_step 4 $TOTAL_STEPS "Installing dependencies..."
echo ""

if [ -f "$BACKEND_DIR/requirements.txt" ]; then
    print_info "Installing packages from requirements.txt..."
    
    python -m pip install --upgrade pip --quiet 2>/dev/null || true
    
    if pip install -r "$BACKEND_DIR/requirements.txt" --quiet 2>/dev/null; then
        print_success "Dependencies installed successfully"
    else
        print_warning "Some dependencies may have failed to install"
        print_info "Attempting to install individually..."
        
        while IFS= read -r line; do
            if [[ ! "$line" =~ ^# ]] && [[ -n "$line" ]]; then
                if pip install "$line" --quiet 2>/dev/null; then
                    print_success "Installed: $line"
                else
                    print_warning "Failed to install: $line"
                fi
            fi
        done < "$BACKEND_DIR/requirements.txt"
    fi
else
    print_error "requirements.txt not found in backend/"
    exit 1
fi

echo ""
print_separator
echo ""

# ============================================================================
# STEP 5: MySQL Setup (backend/schema.sql)
# ============================================================================

print_step 5 $TOTAL_STEPS "Setting up MySQL database..."
echo ""

if command -v mysql &> /dev/null; then
    print_success "MySQL client found"
    
    print_info "Checking MySQL service status..."
    
    if mysqladmin ping -h "$MYSQL_HOST" -u "$MYSQL_USER" -p"$MYSQL_PASSWORD" --skip-ssl --silent 2>/dev/null; then
        print_success "MySQL service is running"
    else
        print_warning "MySQL service is not responding. Attempting to start..."
        
        if sudo systemctl start mysql 2>/dev/null; then
            print_success "MySQL service started"
        elif sudo systemctl start mysqld 2>/dev/null; then
            print_success "MySQL service started"
        elif sudo service mysql start 2>/dev/null; then
            print_success "MySQL service started"
        else
            print_error "Failed to start MySQL service"
            exit 1
        fi
        
        sleep 2
        
        if mysqladmin ping -h "$MYSQL_HOST" -u "$MYSQL_USER" -p"$MYSQL_PASSWORD" --skip-ssl --silent 2>/dev/null; then
            print_success "MySQL service is now running"
        else
            print_error "MySQL service failed to start"
            exit 1
        fi
    fi
    
    print_info "Checking database '${MYSQL_DATABASE}'..."
    
    if mysql -h "$MYSQL_HOST" -u "$MYSQL_USER" -p"$MYSQL_PASSWORD" --skip-ssl -e "USE ${MYSQL_DATABASE}" 2>/dev/null; then
        print_success "Database '${MYSQL_DATABASE}' exists"
    else
        print_info "Creating database '${MYSQL_DATABASE}'..."
        if mysql -h "$MYSQL_HOST" -u "$MYSQL_USER" -p"$MYSQL_PASSWORD" --skip-ssl -e "CREATE DATABASE IF NOT EXISTS ${MYSQL_DATABASE}" 2>/dev/null; then
            print_success "Database '${MYSQL_DATABASE}' created"
        else
            print_error "Failed to create database"
            exit 1
        fi
    fi
    
    print_info "Checking required tables..."
    
    TABLE_EXISTS=$(mysql -h "$MYSQL_HOST" -u "$MYSQL_USER" -p"$MYSQL_PASSWORD" --skip-ssl -D "$MYSQL_DATABASE" -e "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='${MYSQL_DATABASE}' AND table_name='evergreen_bot_alert_filter';" -s -N 2>/dev/null)

    if [ "$TABLE_EXISTS" -gt 0 ]; then
        print_success "Table 'evergreen_bot_alert_filter' exists"
    else
        print_warning "Table 'evergreen_bot_alert_filter' not found"
        
        if [ -f "$BACKEND_DIR/schema.sql" ]; then
            print_info "Running schema.sql to create tables..."
            if mysql -h "$MYSQL_HOST" -u "$MYSQL_USER" -p"$MYSQL_PASSWORD" --skip-ssl -D "$MYSQL_DATABASE" < "$BACKEND_DIR/schema.sql" 2>/dev/null; then
                print_success "Tables created successfully"
            else
                print_error "Failed to run schema.sql"
                exit 1
            fi
        else
            print_error "schema.sql not found in backend/"
            exit 1
        fi
    fi
else
    print_warning "MySQL client not found. Skipping database setup"
fi

echo ""
print_separator
echo ""

# ============================================================================
# STEP 6: Directory Setup (backend/thumbnail, backend/static)
# ============================================================================

print_step 6 $TOTAL_STEPS "Checking directories..."
echo ""

REQUIRED_DIRS=("$BACKEND_DIR/thumbnail" "$BACKEND_DIR/static")

for dir in "${REQUIRED_DIRS[@]}"; do
    if [ -d "$dir" ]; then
        print_info "Directory '$(basename $dir)' exists"
    else
        print_info "Creating directory '$(basename $dir)'..."
        mkdir -p "$dir"
        print_success "Directory '$(basename $dir)' created"
    fi
done

echo ""
print_separator
echo ""

# ============================================================================
# STEP 7: Frontend Dependencies Check
# ============================================================================

print_step 7 $TOTAL_STEPS "Checking frontend..."
echo ""

if [ -d "$FRONTEND_DIR/node_modules" ]; then
    print_info "node_modules found in frontend/"
else
    print_info "Installing frontend dependencies..."
    if command -v npm &> /dev/null; then
        (cd "$FRONTEND_DIR" && npm install --quiet 2>/dev/null)
        print_success "Frontend dependencies installed"
    else
        print_warning "npm not found. Please install frontend dependencies manually."
    fi
fi

echo ""
print_separator
echo ""

# ============================================================================
# STEP 8: Start Both Servers
# ============================================================================

print_step 8 $TOTAL_STEPS "Starting servers..."
echo ""

echo -e "${GREEN}╔══════════════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║                                                                          ║${NC}"
echo -e "${GREEN}║                        Servers Starting...                               ║${NC}"
echo -e "${GREEN}║                                                                          ║${NC}"
echo -e "${GREEN}║   ${CYAN}Backend:    http://localhost:8000${GREEN}                                      ║${NC}"
echo -e "${GREEN}║   ${CYAN}Frontend:   http://localhost:3000${GREEN}                                      ║${NC}"
echo -e "${GREEN}║   ${CYAN}API Docs:   http://localhost:8000/docs${GREEN}                                  ║${NC}"
echo -e "${GREEN}║                                                                          ║${NC}"
echo -e "${GREEN}║   ${YELLOW}Press Ctrl+C to stop both servers${GREEN}                                       ║${NC}"
echo -e "${GREEN}║                                                                          ║${NC}"
echo -e "${GREEN}╚══════════════════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Function to cleanup both servers on exit
cleanup() {
    echo -e "\n${YELLOW}Stopping servers...${NC}"
    kill $BACKEND_PID $FRONTEND_PID 2>/dev/null
    wait $BACKEND_PID $FRONTEND_PID 2>/dev/null
    echo -e "${GREEN}All servers stopped.${NC}"
    exit 0
}

trap cleanup SIGINT SIGTERM

# Start backend
print_info "Starting FastAPI backend on port 8000..."
(cd "$BACKEND_DIR" && uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload) &
BACKEND_PID=$!
print_success "Backend started (PID: $BACKEND_PID)"

sleep 2

# Start frontend
print_info "Starting Next.js frontend on port 3000..."
(cd "$FRONTEND_DIR" && npx next dev --port 3000) &
FRONTEND_PID=$!
print_success "Frontend started (PID: $FRONTEND_PID)"

echo ""
print_separator
echo -e "${GREEN}Both servers running. Press Ctrl+C to stop.${NC}"
print_separator

# Wait for both processes
wait
