#!/usr/bin/env python3
"""
Product Data Import Script for ReviewHub

This script allows importing product data from CSV or JSON files into the ReviewHub database.
It supports various data formats and provides validation and error handling.

Usage:
    python import_products.py --file products.csv --format csv
    python import_products.py --file products.json --format json
"""

import argparse
import csv
import json
import sqlite3
import sys
from datetime import datetime
from pathlib import Path

def connect_db():
    """Connect to the SQLite database."""
    return sqlite3.connect('reviewhub.db')

def validate_product_data(product):
    """Validate required product fields."""
    required_fields = ['name', 'brand', 'category']
    missing_fields = [field for field in required_fields if not product.get(field)]
    
    if missing_fields:
        return False, f"Missing required fields: {', '.join(missing_fields)}"
    
    return True, None

def normalize_product_data(product):
    """Normalize product data to match database schema."""
    normalized = {
        'name': product.get('name', '').strip(),
        'brand': product.get('brand', '').strip(),
        'category': product.get('category', '').strip(),
        'description': product.get('description', '').strip(),
        'price_range': product.get('price_range', product.get('price', '')).strip(),
        'image_url': product.get('image_url', product.get('image', '')).strip(),
        'specifications': product.get('specifications', ''),
        'created_at': datetime.utcnow().isoformat()
    }
    
    # Handle specifications - convert list to JSON string if needed
    if isinstance(normalized['specifications'], list):
        normalized['specifications'] = json.dumps(normalized['specifications'])
    elif not normalized['specifications']:
        normalized['specifications'] = '[]'
    
    return normalized

def import_from_csv(file_path):
    """Import products from CSV file."""
    products = []
    
    try:
        with open(file_path, 'r', encoding='utf-8') as csvfile:
            # Try to detect delimiter
            sample = csvfile.read(1024)
            csvfile.seek(0)
            sniffer = csv.Sniffer()
            delimiter = sniffer.sniff(sample).delimiter
            
            reader = csv.DictReader(csvfile, delimiter=delimiter)
            
            for row_num, row in enumerate(reader, start=2):  # Start at 2 for header
                # Clean up field names (remove BOM, strip whitespace)
                clean_row = {}
                for key, value in row.items():
                    clean_key = key.strip().replace('\ufeff', '')  # Remove BOM
                    clean_row[clean_key] = value.strip() if value else ''
                
                is_valid, error = validate_product_data(clean_row)
                if not is_valid:
                    print(f"Warning: Row {row_num} skipped - {error}")
                    continue
                
                normalized = normalize_product_data(clean_row)
                products.append(normalized)
                
    except FileNotFoundError:
        print(f"Error: File '{file_path}' not found.")
        return []
    except Exception as e:
        print(f"Error reading CSV file: {e}")
        return []
    
    return products

def import_from_json(file_path):
    """Import products from JSON file."""
    try:
        with open(file_path, 'r', encoding='utf-8') as jsonfile:
            data = json.load(jsonfile)
            
            # Handle different JSON structures
            if isinstance(data, list):
                products_data = data
            elif isinstance(data, dict):
                # Try common keys for product arrays
                products_data = data.get('products', data.get('items', data.get('data', [])))
                if not isinstance(products_data, list):
                    products_data = [data]  # Single product object
            else:
                print("Error: Invalid JSON structure")
                return []
            
            products = []
            for i, product in enumerate(products_data):
                is_valid, error = validate_product_data(product)
                if not is_valid:
                    print(f"Warning: Product {i+1} skipped - {error}")
                    continue
                
                normalized = normalize_product_data(product)
                products.append(normalized)
                
    except FileNotFoundError:
        print(f"Error: File '{file_path}' not found.")
        return []
    except json.JSONDecodeError as e:
        print(f"Error: Invalid JSON format - {e}")
        return []
    except Exception as e:
        print(f"Error reading JSON file: {e}")
        return []
    
    return products

def insert_products(products):
    """Insert products into the database."""
    if not products:
        print("No valid products to import.")
        return 0
    
    conn = connect_db()
    cursor = conn.cursor()
    
    # Get existing categories
    cursor.execute("SELECT name FROM categories")
    existing_categories = {row[0] for row in cursor.fetchall()}
    
    # Insert new categories if needed
    new_categories = set()
    for product in products:
        category = product['category']
        if category not in existing_categories and category not in new_categories:
            new_categories.add(category)
    
    for category in new_categories:
        cursor.execute(
            "INSERT INTO categories (name, created_at) VALUES (?, ?)",
            (category, datetime.utcnow().isoformat())
        )
        print(f"Created new category: {category}")
    
    # Insert products
    inserted_count = 0
    skipped_count = 0
    
    for product in products:
        try:
            # Check if product already exists (by name and brand)
            cursor.execute(
                "SELECT id FROM products WHERE name = ? AND brand = ?",
                (product['name'], product['brand'])
            )
            
            if cursor.fetchone():
                print(f"Skipping duplicate product: {product['name']} by {product['brand']}")
                skipped_count += 1
                continue
            
            cursor.execute("""
                INSERT INTO products (name, brand, category, description, price_range, 
                                    image_url, specifications, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                product['name'],
                product['brand'],
                product['category'],
                product['description'],
                product['price_range'],
                product['image_url'],
                product['specifications'],
                product['created_at']
            ))
            
            inserted_count += 1
            
        except sqlite3.Error as e:
            print(f"Error inserting product '{product['name']}': {e}")
            skipped_count += 1
    
    conn.commit()
    conn.close()
    
    print(f"\nImport completed:")
    print(f"  - {inserted_count} products inserted")
    print(f"  - {skipped_count} products skipped")
    print(f"  - {len(new_categories)} new categories created")
    
    return inserted_count

def create_sample_csv():
    """Create a sample CSV file for reference."""
    sample_data = [
        {
            'name': 'iPhone 15 Pro',
            'brand': 'Apple',
            'category': 'Electronics',
            'description': 'Latest iPhone with titanium design and A17 Pro chip',
            'price_range': '$999 - $1,199',
            'image_url': 'https://example.com/iphone15pro.jpg',
            'specifications': '["6.1-inch Display", "128GB Storage", "48MP Camera", "A17 Pro Chip"]'
        },
        {
            'name': 'Model S',
            'brand': 'Tesla',
            'category': 'Automotive',
            'description': 'Electric luxury sedan with autopilot capabilities',
            'price_range': '$75,000 - $100,000',
            'image_url': 'https://example.com/tesla-model-s.jpg',
            'specifications': '["Electric Motor", "400+ mile range", "Autopilot", "Premium Interior"]'
        }
    ]
    
    with open('sample_products.csv', 'w', newline='', encoding='utf-8') as csvfile:
        fieldnames = ['name', 'brand', 'category', 'description', 'price_range', 'image_url', 'specifications']
        writer = csv.DictWriter(csvfile, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(sample_data)
    
    print("Sample CSV file 'sample_products.csv' created.")

def create_sample_json():
    """Create a sample JSON file for reference."""
    sample_data = {
        "products": [
            {
                "name": "iPhone 15 Pro",
                "brand": "Apple",
                "category": "Electronics",
                "description": "Latest iPhone with titanium design and A17 Pro chip",
                "price_range": "$999 - $1,199",
                "image_url": "https://example.com/iphone15pro.jpg",
                "specifications": ["6.1-inch Display", "128GB Storage", "48MP Camera", "A17 Pro Chip"]
            },
            {
                "name": "Model S",
                "brand": "Tesla",
                "category": "Automotive",
                "description": "Electric luxury sedan with autopilot capabilities",
                "price_range": "$75,000 - $100,000",
                "image_url": "https://example.com/tesla-model-s.jpg",
                "specifications": ["Electric Motor", "400+ mile range", "Autopilot", "Premium Interior"]
            }
        ]
    }
    
    with open('sample_products.json', 'w', encoding='utf-8') as jsonfile:
        json.dump(sample_data, jsonfile, indent=2, ensure_ascii=False)
    
    print("Sample JSON file 'sample_products.json' created.")

def main():
    parser = argparse.ArgumentParser(description='Import product data into ReviewHub database')
    parser.add_argument('--file', '-f', help='Path to the data file')
    parser.add_argument('--format', '-t', choices=['csv', 'json'], help='File format (csv or json)')
    parser.add_argument('--sample', '-s', choices=['csv', 'json'], help='Create sample file')
    
    args = parser.parse_args()
    
    if args.sample:
        if args.sample == 'csv':
            create_sample_csv()
        elif args.sample == 'json':
            create_sample_json()
        return
    
    if not args.file or not args.format:
        print("Error: Both --file and --format are required (unless using --sample)")
        print("\nUsage examples:")
        print("  python import_products.py --file products.csv --format csv")
        print("  python import_products.py --file products.json --format json")
        print("  python import_products.py --sample csv  # Create sample CSV")
        print("  python import_products.py --sample json  # Create sample JSON")
        sys.exit(1)
    
    if not Path(args.file).exists():
        print(f"Error: File '{args.file}' does not exist.")
        sys.exit(1)
    
    print(f"Importing products from {args.file} ({args.format} format)...")
    
    if args.format == 'csv':
        products = import_from_csv(args.file)
    elif args.format == 'json':
        products = import_from_json(args.file)
    else:
        print(f"Error: Unsupported format '{args.format}'")
        sys.exit(1)
    
    if products:
        insert_products(products)
    else:
        print("No products imported.")

if __name__ == '__main__':
    main()

