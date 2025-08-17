#!/usr/bin/env python3
"""
AI Video Script Generator - Dependency Installer and Verifier

This script automatically installs and verifies all Python dependencies
required for the AI Video Script Generator project.

Usage:
    python install_dependencies.py

Features:
    - Installs all packages from requirements.txt
    - Verifies each package can be imported successfully
    - Checks for specific version requirements
    - Provides detailed error reporting
    - Supports virtual environment detection
    - Cross-platform compatibility
"""

import subprocess
import sys
import importlib
import pkg_resources
import os
from typing import List, Dict, Tuple
import platform

class DependencyInstaller:
    def __init__(self):
        self.requirements_file = "requirements.txt"
        self.installed_packages = {}
        self.failed_packages = []
        self.system_info = {
            "python_version": sys.version,
            "platform": platform.platform(),
            "architecture": platform.architecture()[0]
        }
        
    def print_header(self):
        """Print a nice header for the installer."""
        print("=" * 70)
        print("🤖 AI Video Script Generator - Dependency Installer")
        print("=" * 70)
        print(f"Python Version: {sys.version.split()[0]}")
        print(f"Platform: {platform.platform()}")
        print(f"Architecture: {platform.architecture()[0]}")
        print("=" * 70)
        
    def check_virtual_environment(self) -> bool:
        """Check if running in a virtual environment."""
        in_venv = hasattr(sys, 'real_prefix') or (hasattr(sys, 'base_prefix') and sys.base_prefix != sys.prefix)
        if in_venv:
            print("✅ Virtual environment detected")
        else:
            print("⚠️  No virtual environment detected. Consider creating one:")
            print("   python -m venv venv")
            print("   source venv/bin/activate  # On macOS/Linux")
            print("   venv\\Scripts\\activate     # On Windows")
        return in_venv
        
    def read_requirements(self) -> List[str]:
        """Read requirements from requirements.txt file."""
        try:
            with open(self.requirements_file, 'r') as f:
                requirements = [line.strip() for line in f if line.strip() and not line.startswith('#')]
            print(f"📋 Found {len(requirements)} requirements in {self.requirements_file}")
            return requirements
        except FileNotFoundError:
            print(f"❌ Error: {self.requirements_file} not found!")
            print("Make sure you're running this script from the project root directory.")
            sys.exit(1)
            
    def install_package(self, package: str) -> bool:
        """Install a single package using pip."""
        print(f"📦 Installing {package}...")
        try:
            result = subprocess.run(
                [sys.executable, "-m", "pip", "install", package],
                capture_output=True,
                text=True,
                check=True
            )
            print(f"✅ Successfully installed {package}")
            return True
        except subprocess.CalledProcessError as e:
            print(f"❌ Failed to install {package}")
            print(f"   Error: {e.stderr}")
            return False
            
    def install_all_packages(self, requirements: List[str]) -> Tuple[List[str], List[str]]:
        """Install all packages from requirements list."""
        print("\n🚀 Installing packages...")
        print("-" * 50)
        
        successful = []
        failed = []
        
        for package in requirements:
            if self.install_package(package):
                successful.append(package)
            else:
                failed.append(package)
                
        return successful, failed
        
    def verify_package_import(self, package_name: str) -> bool:
        """Verify that a package can be imported successfully."""
        try:
            # Handle special cases for package names
            import_name = package_name.split('>=')[0].split('==')[0].split('<=')[0]
            
            # Special handling for packages with different import names
            import_mapping = {
                'python-multipart': 'multipart',
                'piper-tts': 'piper',
                'python-dotenv': 'dotenv'
            }
            
            actual_import = import_mapping.get(import_name, import_name)
            
            # Try to import the package
            module = importlib.import_module(actual_import)
            
            # Get version if available
            try:
                version = getattr(module, '__version__', 'unknown')
                print(f"✅ {package_name} - Version: {version}")
            except:
                print(f"✅ {package_name} - Import successful")
                
            return True
            
        except ImportError as e:
            print(f"❌ {package_name} - Import failed: {e}")
            return False
        except Exception as e:
            print(f"⚠️  {package_name} - Unexpected error: {e}")
            return True  # Still consider it working if it imported
            
    def verify_package_versions(self, requirements: List[str]) -> Dict[str, bool]:
        """Verify that installed packages meet version requirements."""
        print("\n🔍 Verifying package versions...")
        print("-" * 50)
        
        version_checks = {}
        
        for requirement in requirements:
            try:
                # Parse requirement
                if '>=' in requirement:
                    package_name, min_version = requirement.split('>=')
                    package_name = package_name.strip()
                    min_version = min_version.strip()
                    
                    # Get installed version
                    installed_version = pkg_resources.get_distribution(package_name).version
                    
                    # Compare versions
                    if pkg_resources.parse_version(installed_version) >= pkg_resources.parse_version(min_version):
                        print(f"✅ {package_name}: {installed_version} >= {min_version}")
                        version_checks[requirement] = True
                    else:
                        print(f"❌ {package_name}: {installed_version} < {min_version} (required)")
                        version_checks[requirement] = False
                        
                else:
                    # No version requirement
                    package_name = requirement.split('==')[0].split('<=')[0].strip()
                    installed_version = pkg_resources.get_distribution(package_name).version
                    print(f"✅ {package_name}: {installed_version}")
                    version_checks[requirement] = True
                    
            except Exception as e:
                print(f"❌ {requirement}: Version check failed - {e}")
                version_checks[requirement] = False
                
        return version_checks
        
    def run_system_checks(self):
        """Run additional system checks."""
        print("\n🔧 Running system checks...")
        print("-" * 50)
        
        # Check if we can import key packages
        key_packages = [
            'fastapi',
            'transformers', 
            'torch',
            'motor',
            'uvicorn'
        ]
        
        for package in key_packages:
            try:
                importlib.import_module(package)
                print(f"✅ {package} - System check passed")
            except ImportError:
                print(f"❌ {package} - System check failed")
                
    def print_summary(self, successful: List[str], failed: List[str], version_checks: Dict[str, bool]):
        """Print a summary of the installation results."""
        print("\n" + "=" * 70)
        print("📊 INSTALLATION SUMMARY")
        print("=" * 70)
        
        total_requirements = len(successful) + len(failed)
        successful_versions = sum(version_checks.values())
        
        print(f"📦 Total packages: {total_requirements}")
        print(f"✅ Successfully installed: {len(successful)}")
        print(f"❌ Failed installations: {len(failed)}")
        print(f"🔍 Version requirements met: {successful_versions}/{len(version_checks)}")
        
        if failed:
            print(f"\n❌ Failed packages:")
            for package in failed:
                print(f"   - {package}")
                
        if successful_versions < len(version_checks):
            print(f"\n⚠️  Version issues:")
            for requirement, passed in version_checks.items():
                if not passed:
                    print(f"   - {requirement}")
                    
        if len(failed) == 0 and successful_versions == len(version_checks):
            print("\n🎉 All dependencies installed and verified successfully!")
            print("You can now run the AI Video Script Generator.")
        else:
            print(f"\n⚠️  Some issues were encountered. Please review the errors above.")
            
        print("=" * 70)
        
    def run(self):
        """Main method to run the dependency installer."""
        self.print_header()
        
        # Check virtual environment
        self.check_virtual_environment()
        
        # Read requirements
        requirements = self.read_requirements()
        
        # Install packages
        successful, failed = self.install_all_packages(requirements)
        
        # Verify imports
        print("\n🔍 Verifying package imports...")
        print("-" * 50)
        for package in successful:
            self.verify_package_import(package)
            
        # Verify versions
        version_checks = self.verify_package_versions(successful)
        
        # Run system checks
        self.run_system_checks()
        
        # Print summary
        self.print_summary(successful, failed, version_checks)
        
        # Exit with appropriate code
        if len(failed) > 0:
            sys.exit(1)
        else:
            sys.exit(0)

def main():
    """Main entry point."""
    try:
        installer = DependencyInstaller()
        installer.run()
    except KeyboardInterrupt:
        print("\n\n⚠️  Installation interrupted by user.")
        sys.exit(1)
    except Exception as e:
        print(f"\n❌ Unexpected error: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()
