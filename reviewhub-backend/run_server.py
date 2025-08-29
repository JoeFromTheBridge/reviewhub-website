#!/usr/bin/env python3
"""
Simple server runner for ReviewHub backend testing.
"""

import os
import sys
from app import app

if __name__ == '__main__':
    # Set environment variables for development
    os.environ['FLASK_ENV'] = 'development'
    os.environ['FLASK_DEBUG'] = '1'
    
    print("Starting ReviewHub Backend Server...")
    print("Server will be available at: http://localhost:5000")
    print("API endpoints:")
    print("  - Health check: GET /api/health")
    print("  - Products: GET /api/products")
    print("  - Categories: GET /api/categories")
    print("  - Reviews: GET /api/reviews")
    print("  - Register: POST /api/register")
    print("  - Login: POST /api/login")
    print("\nPress Ctrl+C to stop the server")
    
    try:
        app.run(host='0.0.0.0', port=5000, debug=True)
    except KeyboardInterrupt:
        print("\nServer stopped.")
        sys.exit(0)

