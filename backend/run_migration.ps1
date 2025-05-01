# Change to the backend directory
Set-Location -Path $PSScriptRoot

# Create Docker network if it doesn't exist
Write-Host "Checking Docker network..."
$networkExists = docker network ls --filter name=shift-management-network --format "{{.Name}}"
if (-not $networkExists) {
    Write-Host "Creating Docker network..."
    docker network create shift-management-network
}

# Start PostgreSQL container if not running
Write-Host "Checking if PostgreSQL is running..."
$dbRunning = docker ps --filter name=shift-management-db --format "{{.Names}}"
if (-not $dbRunning) {
    Write-Host "Starting PostgreSQL container..."
    docker run -d `
        --name shift-management-db `
        --network shift-management-network `
        -e POSTGRES_USER=postgres `
        -e POSTGRES_PASSWORD=postgres `
        -e POSTGRES_DB=shiftmanagement `
        postgres:13

    Write-Host "Waiting for PostgreSQL to be ready..."
    Start-Sleep -Seconds 10
}

# Build the Docker image
Write-Host "Building Docker image..."
docker build -t shift-management-migration -f Dockerfile.migration .

if ($LASTEXITCODE -ne 0) {
    Write-Host "Error building Docker image. Exiting."
    exit 1
}

# Run the migration container
Write-Host "Running migrations..."
docker run --rm `
    --network shift-management-network `
    -e DATABASE_URL="postgresql://postgres:postgres@shift-management-db:5432/shiftmanagement" `
    shift-management-migration

if ($LASTEXITCODE -ne 0) {
    Write-Host "Error running migrations. Exiting."
    exit 1
}

Write-Host "Migrations completed successfully." 