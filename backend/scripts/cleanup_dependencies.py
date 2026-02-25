#!/usr/bin/env python3
"""
Dependency cleanup script.

WHY: Automates removal of unused AI provider dependencies.
USAGE: python scripts/cleanup_dependencies.py
"""

import subprocess
import sys
from pathlib import Path

# Dependencies to remove
DEPENDENCIES_TO_REMOVE = [
    "anthropic",
    "google-generativeai",
    "langchain",
    "langchain-groq",
]

# Files to check for imports
FILES_TO_CHECK = [
    "app/services/claude.py",
    "app/services/gemini.py",
]


def check_imports_in_codebase():
    """
    Check if removed dependencies are still imported anywhere.
    
    WHY: Prevents breaking the app by removing dependencies still in use.
    """
    print("🔍 Checking for imports of dependencies to be removed...")
    
    issues_found = False
    
    for dep in DEPENDENCIES_TO_REMOVE:
        # Search for imports
        result = subprocess.run(
            ["grep", "-r", f"import {dep}", "app/"],
            capture_output=True,
            text=True
        )
        
        if result.stdout:
            print(f"❌ Found imports of {dep}:")
            print(result.stdout)
            issues_found = True
    
    if issues_found:
        print("\n⚠️  Cannot proceed: Dependencies still in use!")
        print("Please remove all imports first.")
        return False
    
    print("✅ No imports found. Safe to remove dependencies.")
    return True


def backup_requirements():
    """
    Backup requirements.txt before modification.
    
    WHY: Allows easy rollback if something goes wrong.
    """
    print("\n📦 Backing up requirements.txt...")
    
    requirements_path = Path("requirements.txt")
    backup_path = Path("requirements.txt.backup")
    
    if requirements_path.exists():
        requirements_path.rename(backup_path)
        print(f"✅ Backed up to {backup_path}")
        return True
    else:
        print("❌ requirements.txt not found!")
        return False


def remove_from_requirements():
    """
    Remove unused dependencies from requirements.txt.
    
    WHY: Keeps requirements.txt clean and minimal.
    """
    print("\n📝 Updating requirements.txt...")
    
    backup_path = Path("requirements.txt.backup")
    requirements_path = Path("requirements.txt")
    
    if not backup_path.exists():
        print("❌ Backup not found!")
        return False
    
    # Read backup
    with open(backup_path, 'r') as f:
        lines = f.readlines()
    
    # Filter out dependencies to remove
    new_lines = []
    removed = []
    
    for line in lines:
        line_lower = line.lower()
        should_remove = any(
            dep.lower() in line_lower
            for dep in DEPENDENCIES_TO_REMOVE
        )
        
        if should_remove:
            removed.append(line.strip())
        else:
            new_lines.append(line)
    
    # Write new requirements.txt
    with open(requirements_path, 'w') as f:
        f.writelines(new_lines)
    
    print("✅ Updated requirements.txt")
    print(f"Removed {len(removed)} dependencies:")
    for dep in removed:
        print(f"  - {dep}")
    
    return True


def uninstall_dependencies():
    """
    Uninstall dependencies from virtual environment.
    
    WHY: Frees up disk space and ensures clean environment.
    """
    print("\n🗑️  Uninstalling dependencies...")
    
    for dep in DEPENDENCIES_TO_REMOVE:
        print(f"Uninstalling {dep}...")
        result = subprocess.run(
            ["pip", "uninstall", "-y", dep],
            capture_output=True,
            text=True
        )
        
        if result.returncode == 0:
            print(f"✅ Uninstalled {dep}")
        else:
            print(f"⚠️  {dep} not installed or already removed")
    
    return True


def verify_app_still_works():
    """
    Run basic checks to ensure app still works.
    
    WHY: Catches issues before deployment.
    """
    print("\n🧪 Verifying app still works...")
    
    # Try importing main app
    try:
        import app.main
        print("✅ App imports successfully")
    except ImportError as e:
        print(f"❌ Import error: {e}")
        return False
    
    # Run tests
    print("Running tests...")
    result = subprocess.run(
        ["pytest", "tests/", "-v", "--tb=short"],
        capture_output=True,
        text=True
    )
    
    if result.returncode == 0:
        print("✅ All tests pass")
        return True
    else:
        print("❌ Some tests failed:")
        print(result.stdout)
        return False


def main():
    """
    Main cleanup workflow.
    
    FLOW:
    1. Check for imports
    2. Backup requirements.txt
    3. Remove from requirements.txt
    4. Uninstall dependencies
    5. Verify app works
    """
    print("🧹 Dependency Cleanup Script")
    print("=" * 50)
    
    # Step 1: Check imports
    if not check_imports_in_codebase():
        sys.exit(1)
    
    # Step 2: Backup
    if not backup_requirements():
        sys.exit(1)
    
    # Step 3: Update requirements.txt
    if not remove_from_requirements():
        print("❌ Failed to update requirements.txt")
        print("Restoring backup...")
        Path("requirements.txt.backup").rename("requirements.txt")
        sys.exit(1)
    
    # Step 4: Uninstall
    if not uninstall_dependencies():
        print("⚠️  Some dependencies failed to uninstall")
        print("This is usually okay - they may not have been installed")
    
    # Step 5: Verify
    print("\n🔍 Final verification...")
    if verify_app_still_works():
        print("\n✅ Cleanup complete!")
        print("\nNext steps:")
        print("1. Test the app manually")
        print("2. Run full test suite")
        print("3. Deploy to staging")
        print("4. Monitor for issues")
        print("\nBackup saved at: requirements.txt.backup")
    else:
        print("\n❌ Verification failed!")
        print("Restoring backup...")
        Path("requirements.txt.backup").rename("requirements.txt")
        print("Please fix issues and try again")
        sys.exit(1)


if __name__ == "__main__":
    main()
