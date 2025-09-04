"""
Seed data script for ReviewHub database
Run this script to populate the database with initial data
"""

from app import app, db, User, Category, Product, Review, ReviewVote
from datetime import datetime, timedelta
import random

def create_seed_data():
    """Create initial seed data for the database"""
    
    with app.app_context():
        # Clear existing data
        print("Clearing existing data...")
        db.drop_all()
        db.create_all()
        
        # Create categories
        print("Creating categories...")
        categories = [
            {
                'name': 'Electronics',
                'slug': 'electronics',
                'description': 'Smartphones, laptops, headphones, and other electronic devices',
                'icon_url': '/assets/category_electronics.png'
            },
            {
                'name': 'Automotive',
                'slug': 'automotive',
                'description': 'Cars, motorcycles, and automotive accessories',
                'icon_url': '/assets/category_automotive.png'
            },
            {
                'name': 'Home & Garden',
                'slug': 'home-garden',
                'description': 'Home appliances, furniture, and garden tools',
                'icon_url': '/assets/category_home.png'
            },
            {
                'name': 'Beauty & Health',
                'slug': 'beauty-health',
                'description': 'Cosmetics, skincare, and health products',
                'icon_url': '/assets/category_beauty.png'
            }
        ]
        
        category_objects = []
        for cat_data in categories:
            category = Category(**cat_data)
            db.session.add(category)
            category_objects.append(category)
        
        db.session.commit()
        
        # Create products
        print("Creating products...")
        products_data = [
            # Electronics
            {
                'name': 'iPhone 15 Pro',
                'brand': 'Apple',
                'description': 'The iPhone 15 Pro features a titanium design, advanced camera system, and the powerful A17 Pro chip for exceptional performance.',
                'image_url': 'https://images.unsplash.com/photo-1592750475338-74b7b21085ab?w=400',
                'price_min': 999,
                'price_max': 1199,
                'specifications': {
                    'display': '6.1-inch Super Retina XDR',
                    'storage': '128GB, 256GB, 512GB, 1TB',
                    'camera': '48MP Main, 12MP Ultra Wide, 12MP Telephoto',
                    'chip': 'A17 Pro',
                    'material': 'Titanium'
                },
                'category_id': 1
            },
            {
                'name': 'Samsung Galaxy S24',
                'brand': 'Samsung',
                'description': 'Flagship Android phone with AI features and exceptional camera capabilities.',
                'image_url': 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=400',
                'price_min': 799,
                'price_max': 999,
                'specifications': {
                    'display': '6.2-inch Dynamic AMOLED 2X',
                    'storage': '128GB, 256GB, 512GB',
                    'camera': '50MP Main, 12MP Ultra Wide, 10MP Telephoto',
                    'chip': 'Snapdragon 8 Gen 3',
                    'features': 'Galaxy AI, S Pen support'
                },
                'category_id': 1
            },
            {
                'name': 'MacBook Pro 14-inch',
                'brand': 'Apple',
                'description': 'Professional laptop with M3 chip, stunning Liquid Retina XDR display, and all-day battery life.',
                'image_url': 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=400',
                'price_min': 1599,
                'price_max': 2499,
                'specifications': {
                    'display': '14.2-inch Liquid Retina XDR',
                    'chip': 'Apple M3, M3 Pro, M3 Max',
                    'memory': '8GB, 16GB, 32GB unified memory',
                    'storage': '512GB, 1TB, 2TB, 4TB SSD',
                    'battery': 'Up to 22 hours'
                },
                'category_id': 1
            },
            {
                'name': 'Sony WH-1000XM5',
                'brand': 'Sony',
                'description': 'Industry-leading noise canceling headphones with exceptional sound quality.',
                'image_url': 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400',
                'price_min': 299,
                'price_max': 399,
                'specifications': {
                    'type': 'Over-ear wireless headphones',
                    'noise_canceling': 'Industry-leading ANC',
                    'battery': 'Up to 30 hours',
                    'connectivity': 'Bluetooth 5.2, NFC',
                    'features': 'Touch controls, voice assistant'
                },
                'category_id': 1
            },
            # Automotive
            {
                'name': 'Toyota RAV4',
                'brand': 'Toyota',
                'description': 'Reliable compact SUV with excellent fuel economy and advanced safety features.',
                'image_url': 'https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?w=400',
                'price_min': 28000,
                'price_max': 38000,
                'specifications': {
                    'type': 'Compact SUV',
                    'engine': '2.5L 4-cylinder',
                    'fuel_economy': '28 city / 35 highway mpg',
                    'drivetrain': 'FWD, AWD available',
                    'safety': 'Toyota Safety Sense 2.0'
                },
                'category_id': 2
            },
            {
                'name': 'Tesla Model 3',
                'brand': 'Tesla',
                'description': 'Electric sedan with autopilot capabilities and impressive range.',
                'image_url': 'https://images.unsplash.com/photo-1560958089-b8a1929cea89?w=400',
                'price_min': 35000,
                'price_max': 55000,
                'specifications': {
                    'type': 'Electric sedan',
                    'range': 'Up to 358 miles',
                    'acceleration': '0-60 mph in 3.1s (Performance)',
                    'charging': 'Supercharger network',
                    'features': 'Autopilot, over-the-air updates'
                },
                'category_id': 2
            },
            # Home & Garden
            {
                'name': 'Dyson V15 Detect',
                'brand': 'Dyson',
                'description': 'Powerful cordless vacuum with laser dust detection and advanced filtration.',
                'image_url': 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400',
                'price_min': 649,
                'price_max': 749,
                'specifications': {
                    'type': 'Cordless stick vacuum',
                    'runtime': 'Up to 60 minutes',
                    'filtration': 'Advanced whole-machine filtration',
                    'features': 'Laser dust detection, LCD screen',
                    'attachments': 'Multiple cleaning tools included'
                },
                'category_id': 3
            },
            {
                'name': 'KitchenAid Stand Mixer',
                'brand': 'KitchenAid',
                'description': 'Professional-grade stand mixer for all your baking and cooking needs.',
                'image_url': 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=400',
                'price_min': 299,
                'price_max': 499,
                'specifications': {
                    'capacity': '5-quart stainless steel bowl',
                    'power': '325-watt motor',
                    'speeds': '10 speeds',
                    'attachments': 'Dough hook, flat beater, wire whip',
                    'colors': 'Multiple color options available'
                },
                'category_id': 3
            },
            # Beauty & Health
            {
                'name': 'Olaplex Hair Perfector No. 3',
                'brand': 'Olaplex',
                'description': 'At-home hair treatment that repairs and strengthens damaged hair.',
                'image_url': 'https://images.unsplash.com/photo-1522338242992-e1a54906a8da?w=400',
                'price_min': 28,
                'price_max': 28,
                'specifications': {
                    'type': 'Hair treatment',
                    'size': '3.3 fl oz / 100 ml',
                    'usage': 'Weekly treatment',
                    'benefits': 'Repairs, strengthens, protects',
                    'suitable_for': 'All hair types'
                },
                'category_id': 4
            },
            {
                'name': 'Fitbit Charge 5',
                'brand': 'Fitbit',
                'description': 'Advanced fitness tracker with built-in GPS and health monitoring features.',
                'image_url': 'https://images.unsplash.com/photo-1575311373937-040b8e1fd5b6?w=400',
                'price_min': 149,
                'price_max': 199,
                'specifications': {
                    'display': 'Color AMOLED display',
                    'battery': 'Up to 7 days',
                    'features': 'Built-in GPS, heart rate monitoring',
                    'health': 'Stress management, sleep tracking',
                    'compatibility': 'iOS and Android'
                },
                'category_id': 4
            }
        ]
        
        product_objects = []
        for prod_data in products_data:
            product = Product(**prod_data)
            db.session.add(product)
            product_objects.append(product)
        
        db.session.commit()
        
        # Create sample users
        print("Creating sample users...")
        users_data = [
            {
                'username': 'john_doe',
                'email': 'john@example.com',
                'first_name': 'John',
                'last_name': 'Doe',
                'password': 'password123'
            },
            {
                'username': 'jane_smith',
                'email': 'jane@example.com',
                'first_name': 'Jane',
                'last_name': 'Smith',
                'password': 'password123'
            },
            {
                'username': 'mike_wilson',
                'email': 'mike@example.com',
                'first_name': 'Mike',
                'last_name': 'Wilson',
                'password': 'password123'
            },
            {
                'username': 'sarah_johnson',
                'email': 'sarah@example.com',
                'first_name': 'Sarah',
                'last_name': 'Johnson',
                'password': 'password123'
            },
            {
                'username': 'alex_brown',
                'email': 'alex@example.com',
                'first_name': 'Alex',
                'last_name': 'Brown',
                'password': 'password123'
            }
        ]
        
        user_objects = []
        for user_data in users_data:
            user = User(
                username=user_data['username'],
                email=user_data['email'],
                first_name=user_data['first_name'],
                last_name=user_data['last_name']
            )
            user.set_password(user_data['password'])
            db.session.add(user)
            user_objects.append(user)
        
        db.session.commit()
        
        # Create sample reviews
        print("Creating sample reviews...")
        sample_reviews = [
            # iPhone 15 Pro reviews
            {
                'user_id': 1,
                'product_id': 1,
                'rating': 5,
                'title': 'Amazing phone with incredible camera',
                'content': 'The iPhone 15 Pro exceeded my expectations. The camera quality is outstanding, especially in low light conditions. The titanium build feels premium and the A17 Pro chip handles everything I throw at it effortlessly.',
                'is_verified_purchase': True
            },
            {
                'user_id': 2,
                'product_id': 1,
                'rating': 4,
                'title': 'Great phone but expensive',
                'content': 'Love the new features and the build quality is excellent. However, the price point is quite high. The battery life could be better for heavy users.',
                'is_verified_purchase': True
            },
            {
                'user_id': 3,
                'product_id': 1,
                'rating': 5,
                'title': 'Best iPhone yet',
                'content': 'Upgraded from iPhone 12 and the difference is night and day. The Action Button is incredibly useful and the camera improvements are significant.',
                'is_verified_purchase': False
            },
            # Samsung Galaxy S24 reviews
            {
                'user_id': 4,
                'product_id': 2,
                'rating': 4,
                'title': 'Solid Android flagship',
                'content': 'The Galaxy S24 is a well-rounded phone with excellent display and camera. The AI features are interesting but still need some refinement.',
                'is_verified_purchase': True
            },
            {
                'user_id': 5,
                'product_id': 2,
                'rating': 5,
                'title': 'Love the AI features',
                'content': 'The Galaxy AI features are game-changing. Photo editing is so much easier now, and the translation features work surprisingly well.',
                'is_verified_purchase': True
            },
            # MacBook Pro reviews
            {
                'user_id': 1,
                'product_id': 3,
                'rating': 5,
                'title': 'Perfect for professional work',
                'content': 'As a video editor, this MacBook Pro handles 4K editing like a breeze. The M3 chip is incredibly powerful and the battery life is impressive.',
                'is_verified_purchase': True
            },
            {
                'user_id': 3,
                'product_id': 3,
                'rating': 4,
                'title': 'Great laptop, steep price',
                'content': 'Excellent build quality and performance, but the price is quite high especially with upgrades. The display is gorgeous though.',
                'is_verified_purchase': False
            },
            # Sony headphones reviews
            {
                'user_id': 2,
                'product_id': 4,
                'rating': 5,
                'title': 'Best noise canceling headphones',
                'content': 'These headphones are incredible for travel and work. The noise canceling is industry-leading and the sound quality is exceptional.',
                'is_verified_purchase': True
            },
            {
                'user_id': 4,
                'product_id': 4,
                'rating': 4,
                'title': 'Great sound, comfortable fit',
                'content': 'Very comfortable for long listening sessions. Sound quality is excellent and the touch controls work well once you get used to them.',
                'is_verified_purchase': True
            },
            # Toyota RAV4 reviews
            {
                'user_id': 5,
                'product_id': 5,
                'rating': 4,
                'title': 'Reliable family SUV',
                'content': 'Perfect family car with great fuel economy and safety features. Interior could be more premium for the price point.',
                'is_verified_purchase': True
            },
            {
                'user_id': 1,
                'product_id': 5,
                'rating': 5,
                'title': 'Outstanding reliability',
                'content': 'Had this car for 2 years now and zero issues. Great in all weather conditions and the resale value is excellent.',
                'is_verified_purchase': True
            },
            # Tesla Model 3 reviews
            {
                'user_id': 2,
                'product_id': 6,
                'rating': 5,
                'title': 'Future of driving',
                'content': 'The driving experience is unlike anything else. Autopilot works great on highways and the over-the-air updates keep improving the car.',
                'is_verified_purchase': True
            },
            {
                'user_id': 3,
                'product_id': 6,
                'rating': 3,
                'title': 'Good car, charging concerns',
                'content': 'Love the performance and tech features, but charging infrastructure is still a concern for long trips. Build quality has some issues.',
                'is_verified_purchase': False
            }
        ]
        
        review_objects = []
        for review_data in sample_reviews:
            # Add some random time variation
            days_ago = random.randint(1, 90)
            created_at = datetime.utcnow() - timedelta(days=days_ago)
            
            review = Review(
                user_id=review_data['user_id'],
                product_id=review_data['product_id'],
                rating=review_data['rating'],
                title=review_data['title'],
                content=review_data['content'],
                is_verified_purchase=review_data['is_verified_purchase'],
                created_at=created_at,
                updated_at=created_at
            )
            db.session.add(review)
            review_objects.append(review)
        
        db.session.commit()
        
        # Create sample review votes
        print("Creating sample review votes...")
        for review in review_objects:
            # Randomly assign votes from different users
            num_votes = random.randint(0, 8)
            voted_users = set()
            
            for _ in range(num_votes):
                # Pick a random user who hasn't voted on this review and isn't the review author
                available_users = [u for u in user_objects if u.id != review.user_id and u.id not in voted_users]
                if not available_users:
                    break
                
                voter = random.choice(available_users)
                voted_users.add(voter.id)
                
                vote = ReviewVote(
                    user_id=voter.id,
                    review_id=review.id,
                    is_helpful=random.choice([True, True, True, False])  # 75% helpful votes
                )
                db.session.add(vote)
        
        db.session.commit()
        
        print("Seed data created successfully!")
        print(f"Created {len(category_objects)} categories")
        print(f"Created {len(product_objects)} products")
        print(f"Created {len(user_objects)} users")
        print(f"Created {len(review_objects)} reviews")
        print("\nSample login credentials:")
        print("Username: john_doe, Password: password123")
        print("Username: jane_smith, Password: password123")
        print("Username: mike_wilson, Password: password123")

if __name__ == '__main__':
    create_seed_data()

