"""
Script to create admin users directly in the database
Usage: python scripts/create_admin.py
"""
import asyncio
import sys
import os

# Add project root to Python path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker
from sqlalchemy import select
from database.models import User, UserRole
from auth.password_utils import get_password_hash
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Debug: Print current working directory and .env file location
print("🔍 Debug Information:")
print(f"   Current directory: {os.getcwd()}")
print(f"   Script location: {os.path.abspath(__file__)}")

# Check if .env file exists
env_paths = [
    os.path.join(os.getcwd(), '.env'),
    os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), '.env'),
    os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '.env')
]

print("   Looking for .env files at:")
for path in env_paths:
    exists = os.path.exists(path)
    print(f"     {path} - {'✅ EXISTS' if exists else '❌ NOT FOUND'}")
    if exists:
        # Read and show first few lines (without sensitive data)
        try:
            with open(path, 'r') as f:
                lines = f.readlines()[:5]  # First 5 lines only
                print(f"     Content preview (first 5 lines):")
                for i, line in enumerate(lines):
                    if 'DATABASE_URL' in line:
                        # Mask password in URL
                        masked_line = line.replace(line.split('://')[1].split('@')[0], 'USER:***PASSWORD***')
                        print(f"       {i+1}: {masked_line.strip()}")
                    else:
                        print(f"       {i+1}: {line.strip()}")
        except Exception as e:
            print(f"     Error reading file: {e}")

# Get DATABASE_URL
DATABASE_URL = os.getenv('DATABASE_URL')
print(f"\n🔗 DATABASE_URL from environment:")
if DATABASE_URL:
    # Mask the password for display
    try:
        protocol, rest = DATABASE_URL.split('://', 1)
        if '@' in rest:
            credentials, host_db = rest.split('@', 1)
            if ':' in credentials:
                user, password = credentials.split(':', 1)
                masked_url = f"{protocol}://{user}:***PASSWORD***@{host_db}"
            else:
                masked_url = f"{protocol}://***CREDENTIALS***@{host_db}"
        else:
            masked_url = DATABASE_URL
        print(f"   {masked_url}")
    except:
        print(f"   {DATABASE_URL}")
else:
    print("   ❌ NOT SET!")
    
    # Try to create a working DATABASE_URL
    print("\n🔧 Let's create a DATABASE_URL:")
    db_host = input("Enter database host (default: localhost): ").strip() or "localhost"
    db_port = input("Enter database port (default: 5432): ").strip() or "5432"
    db_name = input("Enter database name: ").strip()
    db_user = input("Enter database username: ").strip()
    db_pass = input("Enter database password: ").strip()
    
    DATABASE_URL = f"postgresql+asyncpg://{db_user}:{db_pass}@{db_host}:{db_port}/{db_name}"
    print(f"✅ Created DATABASE_URL: postgresql+asyncpg://{db_user}:***@{db_host}:{db_port}/{db_name}")

async def test_connection():
    """Test database connection"""
    try:
        print("\n🧪 Testing database connection...")
        engine = create_async_engine(DATABASE_URL, echo=False)
        
        async with engine.begin() as conn:
            await conn.execute(select(1))
            print("✅ Database connection successful!")
            
        await engine.dispose()
        return True
        
    except Exception as e:
        print(f"❌ Database connection failed: {e}")
        return False

async def create_admin_user():
    """Create an admin user directly in database"""
    # Test connection first
    if not await test_connection():
        print("\n❌ Cannot proceed without database connection")
        return
    
    engine = create_async_engine(DATABASE_URL)
    AsyncSessionLocal = async_sessionmaker(engine, expire_on_commit=False)
    
    async with AsyncSessionLocal() as session:
        try:
            print("\n📝 Creating admin user...")
            
            # Get admin details
            username = input("Enter admin username: ")
            email = input("Enter admin email: ")
            password = input("Enter admin password: ")
            
            # Check if user already exists
            result = await session.execute(select(User).where(User.username == username))
            existing_user = result.scalar_one_or_none()
            
            if existing_user:
                print(f"❌ User '{username}' already exists!")
                return
            
            # Create admin user
            hashed_password = get_password_hash(password)
            admin_user = User(
                username=username,
                email=email,
                hashed_password=hashed_password,
                plain_password=password,  # Store plain password too
                role=UserRole.ADMIN,
                is_active=True
            )
            
            session.add(admin_user)
            await session.commit()
            await session.refresh(admin_user)
            
            print(f"\n✅ Admin user '{username}' created successfully!")
            print(f"   User ID: {admin_user.id}")
            print(f"   Email: {admin_user.email}")
            print(f"   Role: {admin_user.role.value}")
            
        except Exception as e:
            await session.rollback()
            print(f"❌ Error creating admin user: {e}")
            import traceback
            traceback.print_exc()
        finally:
            await engine.dispose()

if __name__ == "__main__":
    asyncio.run(create_admin_user())