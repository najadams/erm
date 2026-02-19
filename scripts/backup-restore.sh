#!/bin/bash
# ============================================================
# ERM-GIPC — Database Backup & Restore Utility
#
# Usage:
#   Backup:  ./scripts/backup-restore.sh backup
#   Restore: ./scripts/backup-restore.sh restore <filename>
#   List:    ./scripts/backup-restore.sh list
# ============================================================

set -e

BACKUP_DIR="./backups"
CONTAINER="erm-postgres"

# Load env vars
if [ -f .env ]; then
  export $(grep -v '^#' .env | xargs)
fi

DB_USER="${POSTGRES_USER:-erm}"
DB_NAME="${POSTGRES_DB:-erm}"

mkdir -p "$BACKUP_DIR"

case "${1:-help}" in
  backup)
    FILENAME="$BACKUP_DIR/erm-$(date +%Y%m%d-%H%M%S).dump"
    echo "📦 Creating backup: $FILENAME"
    docker exec "$CONTAINER" pg_dump -U "$DB_USER" -Fc "$DB_NAME" > "$FILENAME"
    SIZE=$(du -h "$FILENAME" | cut -f1)
    echo "✅ Backup complete ($SIZE)"
    ;;

  restore)
    if [ -z "$2" ]; then
      echo "❌ Usage: $0 restore <filename>"
      echo "Available backups:"
      ls -lh "$BACKUP_DIR"/*.dump 2>/dev/null || echo "  (none found)"
      exit 1
    fi

    RESTORE_FILE="$2"
    if [ ! -f "$RESTORE_FILE" ]; then
      RESTORE_FILE="$BACKUP_DIR/$2"
    fi

    if [ ! -f "$RESTORE_FILE" ]; then
      echo "❌ File not found: $2"
      exit 1
    fi

    echo "⚠️  This will DROP and recreate the '$DB_NAME' database."
    read -p "Are you sure? (y/N): " CONFIRM
    if [ "$CONFIRM" != "y" ] && [ "$CONFIRM" != "Y" ]; then
      echo "Aborted."
      exit 0
    fi

    echo "🔄 Restoring from: $RESTORE_FILE"
    cat "$RESTORE_FILE" | docker exec -i "$CONTAINER" pg_restore -U "$DB_USER" -d "$DB_NAME" --clean --if-exists
    echo "✅ Restore complete"
    ;;

  list)
    echo "📋 Available backups:"
    ls -lhS "$BACKUP_DIR"/*.dump 2>/dev/null || echo "  (none found)"
    ;;

  *)
    echo "ERM-GIPC Database Backup Utility"
    echo ""
    echo "Usage:"
    echo "  $0 backup              Create a new backup"
    echo "  $0 restore <file>      Restore from a backup file"
    echo "  $0 list                List available backups"
    ;;
esac
