#!/usr/bin/env python
import click
from alembic import command
from alembic.config import Config
import os

def get_alembic_config():
    config = Config("alembic.ini")
    return config

@click.group()
def cli():
    """Management script for the application."""
    pass

@cli.command()
@click.option('--message', '-m', help='Migration message')
def makemigrations(message):
    """Generate new migration."""
    if not message:
        message = "auto-generated migration"
    
    config = get_alembic_config()
    command.revision(config, autogenerate=True, message=message)
    click.echo("Migration file created. Please review the changes before applying.")

@cli.command()
def migrate():
    """Apply all pending migrations."""
    config = get_alembic_config()
    command.upgrade(config, "head")
    click.echo("Migrations applied successfully.")

@cli.command()
def show_migrations():
    """Show current migration status."""
    config = get_alembic_config()
    command.history(config)

if __name__ == '__main__':
    cli() 