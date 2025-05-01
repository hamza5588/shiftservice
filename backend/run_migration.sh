#!/bin/bash

# Build the Docker image for running migrations
docker build -t shift-management-migration -f Dockerfile.migration .

# Run the migration container
docker run --rm \
  --network shift-management-network \
  -e DATABASE_URL=postgresql://postgres:postgres@db:5432/shiftmanagement \
  shift-management-migration \
  alembic upgrade head 