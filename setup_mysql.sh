#!/bin/bash

# ============================================================================
# MySQL Setup Script (Root)
# ============================================================================
# Run this script ONCE on a new system to set up MySQL for this project.
# Requires: MySQL installed and running
# Run from project root: ./setup_mysql.sh
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

# ============================================================================
# UTILITY FUNCTIONS
# ============================================================================

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

TOTAL_STEPS=4

echo -e "${CYAN}"
echo "╔══════════════════════════════════════════════════════════════════════════╗"
echo "║                    MySQL Database Setup                                 ║"
echo "╚══════════════════════════════════════════════════════════════════════════╝"
echo -e "${NC}"

print_separator
echo ""

# ============================================================================
# STEP 1: Load Environment Variables
# ============================================================================

print_step 1 $TOTAL_STEPS "Loading environment configuration..."
echo ""

if [ -f "$BACKEND_DIR/.env" ]; then
    print_success ".env file found in backend/"
    
    while IFS='=' read -r key value; do
        [[ "$key" =~ ^#.*$ || -z "$key" ]] && continue
        value="${value%\"}"
        value="${value#\"}"
        value="${value%\'}"
        value="${value#\'}"
        export "$key=$value"
    done < "$BACKEND_DIR/.env"
    
    MYSQL_USER="${MYSQL_USER:-root}"
    MYSQL_HOST="${MYSQL_HOST:-localhost}"
    MYSQL_DATABASE="${MYSQL_DATABASE:-TeamXDataBase}"
    
    print_info "MySQL Host: $MYSQL_HOST"
    print_info "MySQL User: $MYSQL_USER"
    print_info "Database: $MYSQL_DATABASE"
else
    print_error ".env file not found in backend/"
    echo -e "    ${YELLOW}Please create backend/.env first with:${NC}"
    echo -e "    ${GRAY}MYSQL_HOST, MYSQL_USER, MYSQL_PASSWORD, MYSQL_DATABASE${NC}"
    exit 1
fi

echo ""
print_separator
echo ""

# ============================================================================
# STEP 2: Configure MySQL Authentication
# ============================================================================

print_step 2 $TOTAL_STEPS "Configuring MySQL authentication..."
echo ""

if command -v mysql &> /dev/null; then
    print_success "MySQL client found"
    
    print_info "Configuring root password authentication..."
    
    if sudo mysql -u root -e "ALTER USER '${MYSQL_USER}'@'localhost' IDENTIFIED WITH caching_sha2_password BY '${MYSQL_PASSWORD}'; FLUSH PRIVILEGES;" 2>/dev/null; then
        print_success "Root password authentication configured"
    else
        print_warning "Could not configure authentication (may already be set)"
    fi
else
    print_error "MySQL client not found"
    echo -e "    ${YELLOW}Please install MySQL client first:${NC}"
    echo -e "    ${GRAY}sudo apt install mysql-client${NC}"
    exit 1
fi

echo ""
print_separator
echo ""

# ============================================================================
# STEP 3: Create Database
# ============================================================================

print_step 3 $TOTAL_STEPS "Creating database..."
echo ""

if mysql -h "$MYSQL_HOST" -u "$MYSQL_USER" -p"$MYSQL_PASSWORD" --skip-ssl -e "USE ${MYSQL_DATABASE}" 2>/dev/null; then
    print_success "Database '${MYSQL_DATABASE}' already exists"
else
    print_info "Creating database '${MYSQL_DATABASE}'..."
    if mysql -h "$MYSQL_HOST" -u "$MYSQL_USER" -p"$MYSQL_PASSWORD" --skip-ssl -e "CREATE DATABASE IF NOT EXISTS ${MYSQL_DATABASE}" 2>/dev/null; then
        print_success "Database '${MYSQL_DATABASE}' created"
    else
        print_error "Failed to create database"
        exit 1
    fi
fi

echo ""
print_separator
echo ""

# ============================================================================
# STEP 4: Run Schema (if available)
# ============================================================================

print_step 4 $TOTAL_STEPS "Running schema setup..."
echo ""

if [ -f "$BACKEND_DIR/schema.sql" ]; then
    print_info "Running schema.sql..."
    if mysql -h "$MYSQL_HOST" -u "$MYSQL_USER" -p"$MYSQL_PASSWORD" --skip-ssl -D "$MYSQL_DATABASE" < "$BACKEND_DIR/schema.sql" 2>/dev/null; then
        print_success "Schema applied successfully"
    else
        print_warning "Schema may have already been applied"
    fi
else
    print_warning "schema.sql not found in backend/"
    print_info "Skipping schema setup"
fi

echo ""
print_separator
echo ""

# ============================================================================
# DONE
# ============================================================================

echo -e "${GREEN}╔══════════════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║                                                                          ║${NC}"
echo -e "${GREEN}║                    MySQL Setup Complete!                                 ║${NC}"
echo -e "${GREEN}║                                                                          ║${NC}"
echo -e "${GREEN}║   ${CYAN}Start the platform with: ./start.sh${GREEN}                                     ║${NC}"
echo -e "${GREEN}║                                                                          ║${NC}"
echo -e "${GREEN}╚══════════════════════════════════════════════════════════════════════════╝${NC}"
echo ""
