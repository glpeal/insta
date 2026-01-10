#!/bin/bash

# Setup script for Instagram DM Panel

echo "🚀 Instagram DM Panel - Setup Script"
echo "====================================="
echo ""

# Check Node.js version
echo "📦 Checking Node.js version..."
NODE_VERSION=$(node -v 2>/dev/null)
if [ $? -ne 0 ]; then
    echo "❌ Node.js is not installed. Please install Node.js v18 or higher."
    exit 1
fi

echo "✅ Node.js version: $NODE_VERSION"
echo ""

# Install backend dependencies
echo "📦 Installing backend dependencies..."
cd backend
if [ ! -f "package.json" ]; then
    echo "❌ Backend package.json not found!"
    exit 1
fi
npm install
if [ $? -ne 0 ]; then
    echo "❌ Failed to install backend dependencies"
    exit 1
fi
echo "✅ Backend dependencies installed"
echo ""

# Setup .env file
if [ ! -f ".env" ]; then
    echo "🔧 Creating .env file from template..."
    cp .env.example .env

    # Generate random encryption key
    RANDOM_KEY=$(openssl rand -base64 32 | tr -d "=+/" | cut -c1-32)

    # Update .env with random key
    if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS
        sed -i '' "s/change_this_to_random_32_char_key_for_production/$RANDOM_KEY/" .env
    else
        # Linux
        sed -i "s/change_this_to_random_32_char_key_for_production/$RANDOM_KEY/" .env
    fi

    echo "✅ .env file created with random encryption key"
else
    echo "ℹ️  .env file already exists, skipping..."
fi
echo ""

# Install frontend dependencies
echo "📦 Installing frontend dependencies..."
cd ../frontend
if [ ! -f "package.json" ]; then
    echo "❌ Frontend package.json not found!"
    exit 1
fi
npm install
if [ $? -ne 0 ]; then
    echo "❌ Failed to install frontend dependencies"
    exit 1
fi
echo "✅ Frontend dependencies installed"
echo ""

# Create necessary directories
cd ..
echo "📁 Creating necessary directories..."
mkdir -p backend/.browser-data
mkdir -p backend/logs
echo "✅ Directories created"
echo ""

echo "✅ Setup completed successfully!"
echo ""
echo "📝 Next steps:"
echo "1. Edit backend/.env if needed"
echo "2. Start backend: cd backend && npm run dev"
echo "3. Start frontend: cd frontend && npm run dev"
echo "4. Open http://localhost:3000 in your browser"
echo ""
echo "⚠️  Warning: Use at your own risk. Instagram may ban accounts using automation."
echo ""
