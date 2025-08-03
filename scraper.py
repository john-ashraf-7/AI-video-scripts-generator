#!/usr/bin/env python3
"""
Selenium-based scraper for AUC Digital Collections
Handles JavaScript-rendered content, scrapes any specified page
"""

import json
import time
import pathlib
import re
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.chrome.options import Options
from selenium.common.exceptions import TimeoutException, NoSuchElementException
from urllib.parse import urljoin
from typing import Iterator, Dict, List

BASE_URL = "https://digitalcollections.aucegypt.edu"
SEARCH_URL = f"{BASE_URL}/digital/search"
OUTFILE = pathlib.Path("auc_digital_selenium_page.json")

# Configuration: Change this to scrape different pages
PAGE_TO_SCRAPE = 7  # Change this number to scrape a different page
MAX_RECORDS_TO_SCRAPE = 3  # Set to a number to limit records, or None to scrape all

# Multi-page scraping configuration
START_PAGE = 99  # First page to scrape
END_PAGE = 100   # Last page to scrape (inclusive)
SCRAPE_MULTIPLE_PAGES = True  # Set to True to scrape multiple pages, False to scrape single page
RECORDS_PER_PAGE = None  # Set to a number to limit records per page, or None to scrape all

# Retry configuration
MAX_RETRIES = 3  # Maximum number of retries for failed entries
RETRY_DELAY = 2  # Delay in seconds between retries

class AUCDigitalCollectionsSeleniumScraper:
    def __init__(self, headless=True):
        self.base_url = BASE_URL
        self.search_url = SEARCH_URL
        self.all_data = []
        self.failed_entries = []  # Track failed entries
        self.current_id = 1  # Initialize ID counter
        
        chrome_options = Options()
        if headless:
            chrome_options.add_argument("--headless")
        chrome_options.add_argument("--no-sandbox")
        chrome_options.add_argument("--disable-dev-shm-usage")
        chrome_options.add_argument("--disable-gpu")
        chrome_options.add_argument("--window-size=1920,1080")
        chrome_options.add_argument("--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36")
        
        self.driver = webdriver.Chrome(options=chrome_options)
        self.wait = WebDriverWait(self.driver, 20)
        
    def __del__(self):
        if hasattr(self, 'driver'):
            self.driver.quit()

    def add_id_to_entry(self, entry_data):
        """Add an ID to the entry data and increment the counter"""
        if entry_data:
            entry_data['id'] = self.current_id
            self.current_id += 1
        return entry_data

    def wait_for_page_load(self, timeout=20):
        try:
            self.wait.until(EC.presence_of_element_located((By.ID, "root")))
            time.sleep(3)
            return True
        except TimeoutException:
            print("Page load timeout")
            return False

    def get_entries_from_page(self, page_num):
        try:
            page_url = f"{self.search_url}/page/{page_num}"
            print(f"Loading page {page_num}: {page_url}")
            self.driver.get(page_url)
            
            # Debug: Check what URL we actually ended up on
            actual_url = self.driver.current_url
            print(f"Actual URL after navigation: {actual_url}")
            
            if not self.wait_for_page_load():
                return []
            time.sleep(5)
            entry_links = []
            selectors = [
                "a[href*='/digital/collection/']",
                "a[href*='/collection/']",
                "[data-testid='search-result'] a",
                ".search-result a",
                "[class*='search-result'] a",
                "[class*='item-link'] a"
            ]
            for selector in selectors:
                try:
                    links = self.driver.find_elements(By.CSS_SELECTOR, selector)
                    for link in links:
                        href = link.get_attribute('href')
                        if href and ('/digital/collection/' in href or '/collection/' in href):
                            if href not in entry_links:
                                entry_links.append(href)
                except Exception as e:
                    print(f"Selector {selector} failed: {e}")
                    continue
            if not entry_links:
                all_links = self.driver.find_elements(By.TAG_NAME, "a")
                for link in all_links:
                    href = link.get_attribute('href')
                    if href and ('/id/' in href and ('collection' in href or 'digital' in href)):
                        if href not in entry_links:
                            entry_links.append(href)
            print(f"Found {len(entry_links)} entries on page {page_num}")
            return entry_links
        except Exception as e:
            print(f"Error getting entries from page {page_num}: {e}")
            return []

    def retry_get_entries_from_page(self, page_num, max_retries=None, retry_delay=None):
        """Get entries from a page with retry mechanism"""
        if max_retries is None:
            max_retries = MAX_RETRIES
        if retry_delay is None:
            retry_delay = RETRY_DELAY
        
        for attempt in range(max_retries + 1):
            try:
                print(f"Attempting to get entries from page {page_num} (attempt {attempt + 1}/{max_retries + 1})")
                
                entry_links = self.get_entries_from_page(page_num)
                
                if entry_links:
                    if attempt > 0:
                        print(f"✓ Successfully got entries from page {page_num} on retry attempt {attempt + 1}")
                    return entry_links
                else:
                    print(f"✗ Attempt {attempt + 1} failed - no entries found on page {page_num}")
                    
            except Exception as e:
                print(f"✗ Attempt {attempt + 1} failed with error: {e}")
            
            # If this wasn't the last attempt, wait before retrying
            if attempt < max_retries:
                print(f"Waiting {retry_delay} seconds before retry...")
                time.sleep(retry_delay)
        
        print(f"✗ Failed to get entries from page {page_num} after {max_retries + 1} attempts")
        return []

    def extract_initial_state(self, html_content):
        try:
            pattern = r'window\.__INITIAL_STATE__\s*=\s*JSON\.parse\("(.+?)"\);'
            match = re.search(pattern, html_content, re.DOTALL)
            if match:
                json_str = match.group(1)
                json_str = json_str.replace('\\"', '"').replace('\\\\', '\\')
                data = json.loads(json_str)
                return data
            return {}
        except Exception as e:
            print(f"Error extracting initial state: {e}")
            return {}

    def extract_image_url(self):
        """Extract the main image URL from the current page"""
        try:
            # Try multiple selectors to find the main image
            image_selectors = [
                "img[src*='iiif']",  # IIIF images
                ".item-image img",
                ".main-image img",
                ".content img",
                "[class*='image'] img",
                "img[class*='file']",
                "img[src*='/digital/']",
                "img[src*='digitalcollections']"
            ]
            
            for selector in image_selectors:
                try:
                    img_elements = self.driver.find_elements(By.CSS_SELECTOR, selector)
                    for img in img_elements:
                        src = img.get_attribute('src')
                        if src and self.is_valid_image_url(src):
                            # Convert relative URLs to absolute
                            if src.startswith('/'):
                                src = BASE_URL + src
                            return src
                except Exception as e:
                    continue
            
            # Fallback: look for any image with a reasonable size
            try:
                all_images = self.driver.find_elements(By.TAG_NAME, "img")
                for img in all_images:
                    src = img.get_attribute('src')
                    if src and self.is_valid_image_url(src):
                        # Check if image has reasonable dimensions
                        width = img.get_attribute('width') or img.size.get('width', 0)
                        height = img.get_attribute('height') or img.size.get('height', 0)
                        if (not width or int(str(width).replace('px', '')) > 100) and \
                           (not height or int(str(height).replace('px', '')) > 100):
                            if src.startswith('/'):
                                src = BASE_URL + src
                            return src
            except Exception as e:
                pass
                
            return None
        except Exception as e:
            print(f"Error extracting image URL: {e}")
            return None

    def is_valid_image_url(self, url):
        """Check if the URL appears to be a valid image URL"""
        if not url:
            return False
        
        # Skip common non-image URLs
        skip_patterns = [
            'logo', 'icon', 'favicon', 'button', 'arrow', 'bg_', 'background',
            'sprite', 'thumb_', 'avatar', 'profile'
        ]
        
        url_lower = url.lower()
        
        # Skip if it contains skip patterns
        if any(pattern in url_lower for pattern in skip_patterns):
            return False
        
        # Must contain image-like indicators
        image_indicators = [
            'iiif', 'digital', 'collection', 'item', 'full', 'image',
            '.jpg', '.jpeg', '.png', '.gif', '.webp', '.tiff'
        ]
        
        return any(indicator in url_lower for indicator in image_indicators)

    def retry_extract_description_data(self, entry_url, max_retries=None, retry_delay=None):
        """Extract description data with retry mechanism"""
        if max_retries is None:
            max_retries = MAX_RETRIES
        if retry_delay is None:
            retry_delay = RETRY_DELAY
        
        for attempt in range(max_retries + 1):
            try:
                print(f"Attempting to scrape entry (attempt {attempt + 1}/{max_retries + 1}): {entry_url}")
                
                # Try to extract data
                data = self.extract_description_data(entry_url)
                
                # Check if we got meaningful data (more than just an image URL)
                if data and len(data) > 1:
                    if attempt > 0:
                        print(f"✓ Successfully scraped entry on retry attempt {attempt + 1}")
                    return data
                else:
                    print(f"✗ Attempt {attempt + 1} failed - no meaningful data extracted")
                    
            except Exception as e:
                print(f"✗ Attempt {attempt + 1} failed with error: {e}")
            
            # If this wasn't the last attempt, wait before retrying
            if attempt < max_retries:
                print(f"Waiting {retry_delay} seconds before retry...")
                time.sleep(retry_delay)
        
        print(f"✗ Failed to scrape entry after {max_retries + 1} attempts: {entry_url}")
        # Track failed entry
        self.failed_entries.append({
            'url': entry_url,
            'attempts': max_retries + 1,
            'timestamp': time.time()
        })
        return {}

    def retry_failed_entries(self, failed_entries_file, max_retries=None, retry_delay=None):
        """Retry scraping failed entries from a previous run"""
        try:
            with open(failed_entries_file, 'r', encoding='utf-8') as f:
                failed_entries = json.load(f)
            
            print(f"Retrying {len(failed_entries)} failed entries...")
            
            successful_retries = 0
            still_failed = []
            
            for i, failed_entry in enumerate(failed_entries):
                url = failed_entry['url']
                print(f"Retrying failed entry {i+1}/{len(failed_entries)}: {url}")
                
                # Try to scrape the entry again
                entry_data = self.retry_extract_description_data(url, max_retries, retry_delay)
                
                if entry_data:
                    entry_data = self.add_id_to_entry(entry_data)
                    self.all_data.append(entry_data)
                    successful_retries += 1
                    title = entry_data.get('Title', 'No title')
                    print(f"✓ Successfully retried entry: {title}")
                else:
                    still_failed.append(failed_entry)
                    print(f"✗ Still failed after retry: {url}")
                
                time.sleep(1)
            
            print(f"\nRetry Summary:")
            print(f"Successfully retried: {successful_retries}")
            print(f"Still failed: {len(still_failed)}")
            print(f"Retry success rate: {successful_retries/len(failed_entries)*100:.1f}%")
            
            # Save updated failed entries
            if still_failed:
                retry_failed_file = failed_entries_file.replace('.json', '_retry_failed.json')
                with open(retry_failed_file, 'w', encoding='utf-8') as f:
                    json.dump(still_failed, f, ensure_ascii=False, indent=2)
                print(f"Updated failed entries saved to: {retry_failed_file}")
            
            return successful_retries, len(still_failed)
            
        except Exception as e:
            print(f"Error retrying failed entries: {e}")
            return 0, len(failed_entries)

    def save_failed_entries(self, filename=None):
        """Save failed entries to a JSON file"""
        if not self.failed_entries:
            print("No failed entries to save")
            return
        
        if filename is None:
            if SCRAPE_MULTIPLE_PAGES:
                filename = f'failed_entries_pages_{START_PAGE}_to_{END_PAGE}.json'
            else:
                filename = f'failed_entries_page_{PAGE_TO_SCRAPE}.json'
        
        try:
            with open(filename, 'w', encoding='utf-8') as f:
                json.dump(self.failed_entries, f, ensure_ascii=False, indent=2)
            print(f"Failed entries saved to {filename}")
            print(f"Total failed entries: {len(self.failed_entries)}")
        except Exception as e:
            print(f"Error saving failed entries to {filename}: {e}")

    def extract_description_data(self, entry_url):
        try:
            print(f"Extracting data from: {entry_url}")
            self.driver.get(entry_url)
            if not self.wait_for_page_load():
                return {}
            time.sleep(3)
            page_source = self.driver.page_source
            initial_state = self.extract_initial_state(page_source)
            if initial_state and 'item' in initial_state:
                item_data = initial_state['item']
                if item_data and 'item' in item_data and 'parent' in item_data['item']:
                    parent = item_data['item']['parent']
                    record = {}
                    if parent and 'fields' in parent:
                        print(f"Found initial state with {len(parent['fields'])} fields")
                        for field in parent['fields']:
                            if field and 'key' in field and 'value' in field:
                                key = field['key']
                                value = field['value']
                                if key == 'title':
                                    record['Title'] = value
                                elif key == 'titlea':
                                    record['Title (Arabic)'] = value
                                elif key == 'creato':
                                    record['Creator'] = value
                                elif key == 'creata':
                                    record['Creator (Arabic)'] = value
                                elif key == 'publis':
                                    record['Publisher'] = value
                                elif key == 'date':
                                    record['Date'] = value
                                elif key == 'notes':
                                    record['Notes'] = value
                                elif key == 'covera':
                                    record['Location'] = value
                                elif key == 'descri':
                                    record['Description'] = value
                                elif key == 'subjec':
                                    record['Subject'] = value
                                elif key == 'type':
                                    record['Type'] = value
                                elif key == 'audien':
                                    record['Genre (AAT)'] = value
                                elif key == 'langua':
                                    record['Language'] = value
                                elif key == 'contri':
                                    record['Collection'] = value
                                elif key == 'source':
                                    record['Source'] = value
                                elif key == 'rights':
                                    record['Rights'] = value
                                elif key == 'format':
                                    record['Call number'] = value
                                elif key == 'relati':
                                    record['Link to catalogue'] = value
                                else:
                                    record[key] = value
                    
                    # Extract image URL
                    image_url = self.extract_image_url()
                    if image_url:
                        record['Image URL'] = image_url
                    
                    if record and len(record) > 1:  # More than just Image URL
                        return record
                    else:
                        pass  # Continue to DOM extraction
                else:
                    pass  # Continue to DOM extraction
            else:
                pass  # Continue to DOM extraction
            try:
                # Fallback method: try to extract metadata from DOM elements
                record = {}
                
                # Enhanced method: Look for structured metadata in Item Description section
                try:
                    # First, try to find the Item Description section
                    item_desc_section = None
                    
                    # Look for Item Description using various selectors
                    item_desc_selectors = [
                        "//*[contains(text(), 'Item Description')]",
                        "//*[text()='Item Description']",
                        "//*[contains(@class, 'item-description')]",
                        "//*[contains(@class, 'metadata')]//*[contains(text(), 'Item Description')]"
                    ]
                    

                    
                    for selector in item_desc_selectors:
                        try:
                            elements = self.driver.find_elements(By.XPATH, selector)
                            for element in elements:
                                # Check if this element or its parent contains structured metadata
                                parent = element.find_element(By.XPATH, "..")
                                if parent:
                                    # Look for structured metadata within this section
                                    metadata_elements = parent.find_elements(By.XPATH, ".//*[contains(text(), '(') and contains(text(), ')')]")
                                    if metadata_elements:
                                        item_desc_section = parent
                                        break
                                    
                                    # Also check for common metadata patterns
                                    metadata_patterns = [
                                        "//*[contains(text(), 'Title (English)')]",
                                        "//*[contains(text(), 'Creator')]",
                                        "//*[contains(text(), 'Location')]",
                                        "//*[contains(text(), 'Date')]",
                                        "//*[contains(text(), 'Subject')]",
                                        "//*[contains(text(), 'Keywords')]",
                                        "//*[contains(text(), 'Medium')]",
                                        "//*[contains(text(), 'Type')]",
                                        "//*[contains(text(), 'Collection')]",
                                        "//*[contains(text(), 'Source')]",
                                        "//*[contains(text(), 'Access Rights')]"
                                    ]
                                    
                                    for pattern in metadata_patterns:
                                        try:
                                            if parent.find_elements(By.XPATH, pattern):
                                                item_desc_section = parent
                                                break
                                        except:
                                            continue
                                    
                                    if item_desc_section:
                                        break
                        except Exception as e:
                            continue
                    
                    # If we found the Item Description section, extract structured metadata
                    if item_desc_section:
                        # Extract all text content from the section
                        section_text = item_desc_section.text
                        lines = [line.strip() for line in section_text.split('\n') if line.strip()]
                        
                        # Parse structured metadata
                        current_key = None
                        current_value = None
                        
                        for i, line in enumerate(lines):
                            # Skip empty lines
                            if not line:
                                continue
                            
                            # Check if this line looks like a field name (ends with colon or is a known field)
                            if (line.endswith(':') or 
                                line in ['Title (English)', 'Title (Arabic)', 'Creator', 'Location-Governorate (English)', 
                                        'Location-Governorate (Arabic)', 'Location-Country (English)', 'Location-Country (Arabic)',
                                        'Date', 'Subject LC', 'Keywords (English)', 'Keywords (Arabic)', 'Medium', 'Type',
                                        'Collection', 'Source', 'Access Rights', 'Creator (Arabic)', 'Creator (English)', 
                                        'Creator (Alternative)', 'Description (English)', 'Description (Arabic)', 'Size (H) x (W) cm']):
                                
                                # Save previous key-value pair if we have one
                                if current_key and current_value:
                                    record[current_key] = current_value.strip()
                                
                                # Start new key-value pair
                                current_key = line.rstrip(':')
                                current_value = ""
                            else:
                                # This line is likely a value or continuation of a value
                                if current_key:
                                    if current_value:
                                        current_value += " " + line
                                    else:
                                        current_value = line
                                else:
                                    # If we don't have a key yet, this might be a standalone value
                                    # Check if it looks like a title or description
                                    if len(line) > 10 and not any(char in line for char in ['(', ')', ':']):
                                        if 'Title' not in record:
                                            record['Title'] = line
                        
                        # Don't forget the last key-value pair
                        if current_key and current_value:
                            record[current_key] = current_value.strip()
                    
                    # If we didn't find structured metadata in Item Description, try Object Description
                    if len(record) < 3:
                        obj_desc_selectors = [
                            "//*[contains(text(), 'Object Description')]",
                            "//*[text()='Object Description']",
                            "//*[contains(@class, 'object-description')]"
                        ]
                        
                        for selector in obj_desc_selectors:
                            try:
                                elements = self.driver.find_elements(By.XPATH, selector)
                                for element in elements:
                                    parent = element.find_element(By.XPATH, "..")
                                    if parent:
                                        desc_text = parent.text.strip()
                                        if desc_text and len(desc_text) > 10:
                                            record['Description'] = desc_text
                                            break
                            except Exception as e:
                                continue
                
                except Exception as e:
                    pass
                
                # Method 2: Extract other metadata using simple text patterns (fallback)
                if len(record) < 3:
                    try:
                        # Get all visible text from the page
                        body_text = self.driver.find_element(By.TAG_NAME, "body").text
                        lines = [line.strip() for line in body_text.split('\n') if line.strip()]
                        
                        # Simple field extraction patterns
                        field_patterns = {
                            'Title': ['Title', 'title'],
                            'Creator': ['Creator', 'creator', 'Author', 'author'], 
                            'Date': ['Date', 'date'],
                            'Subject': ['Subject', 'subject'],
                            'Type': ['Type', 'type'],
                            'Language': ['Language', 'language'],
                            'Publisher': ['Publisher', 'publisher'],
                            'Source': ['Source', 'source'],
                            'Collection': ['Collection', 'collection'],
                            'Rights': ['Rights', 'rights'],
                            'Call number': ['Call number', 'call number', 'Identifier', 'identifier']
                        }
                        
                        for i, line in enumerate(lines):
                            for field_name, patterns in field_patterns.items():
                                if field_name not in record:  # Don't overwrite existing data
                                    for pattern in patterns:
                                        if line == pattern or line == pattern + ':' or line.startswith(pattern + ':'):
                                            # Look for the value in the next few lines
                                            for j in range(i + 1, min(i + 4, len(lines))):
                                                if j < len(lines):
                                                    potential_value = lines[j].strip()
                                                    # Skip if it's empty or looks like another field name
                                                    if (potential_value and 
                                                        not potential_value.endswith(':') and
                                                        len(potential_value) > 1 and
                                                        not any(potential_value.startswith(p) for patterns_list in field_patterns.values() for p in patterns_list)):
                                                        record[field_name] = potential_value
                                                        break
                                            break
                                            break
                    
                    except Exception as e:
                        pass
                
                # Method 3: Try structured DOM extraction as a final fallback
                if len(record) < 3:
                    try:
                        metadata_containers = self.driver.find_elements(By.CSS_SELECTOR, 
                            "dl, table, .metadata, [class*='metadata'], [class*='field'], [class*='item']")
                        
                        for container in metadata_containers:
                            try:
                                # Look for definition list items
                                dt_elements = container.find_elements(By.CSS_SELECTOR, "dt, th, strong, b, .label")
                                for dt in dt_elements:
                                    key = dt.text.strip()
                                    if key and key.endswith(':'):
                                        key = key[:-1]  # Remove trailing colon
                                    
                                    if key:
                                        try:
                                            # Try to find corresponding dd, td, or next sibling
                                            value_elem = None
                                            try:
                                                value_elem = dt.find_element(By.XPATH, "following-sibling::dd[1]")
                                            except:
                                                try:
                                                    value_elem = dt.find_element(By.XPATH, "following-sibling::td[1]")
                                                except:
                                                    try:
                                                        value_elem = dt.find_element(By.XPATH, "following-sibling::*[1]")
                                                    except:
                                                        pass
                                            
                                            if value_elem:
                                                value = value_elem.text.strip()
                                                if value and value != key and len(value) > 1:
                                                    record[key] = value
                                        except Exception as e:
                                            continue
                            except Exception as e:
                                continue
                    except Exception as e:
                        pass
                
                # Always try to extract image URL
                image_url = self.extract_image_url()
                if image_url:
                    record['Image URL'] = image_url
                

                
                return record
            except Exception as e:
                print(f"Error extracting fallback content: {e}")
                return {}
        except Exception as e:
            print(f"Error extracting data from {entry_url}: {e}")
            return {}

    def get_page_info(self, page_num):
        """Get information about a specific page"""
        try:
            page_url = f"{self.search_url}/page/{page_num}"
            print(f"Checking page {page_num}: {page_url}")
            self.driver.get(page_url)
            
            if not self.wait_for_page_load():
                return {"page_num": page_num, "entries_found": 0, "status": "failed_to_load"}
            
            entry_links = self.get_entries_from_page(page_num)
            return {
                "page_num": page_num,
                "entries_found": len(entry_links),
                "status": "success",
                "url": page_url
            }
        except Exception as e:
            print(f"Error getting page info for page {page_num}: {e}")
            return {"page_num": page_num, "entries_found": 0, "status": "error", "error": str(e)}

    def validate_page_range(self, start_page, end_page):
        """Validate the page range and return available pages"""
        print(f"Validating page range {start_page} to {end_page}...")
        available_pages = []
        
        for page_num in range(start_page, end_page + 1):
            page_info = self.get_page_info(page_num)
            if page_info["status"] == "success" and page_info["entries_found"] > 0:
                available_pages.append(page_info)
                print(f"Page {page_num}: {page_info['entries_found']} entries found")
            else:
                print(f"Page {page_num}: No entries found or failed to load")
        
        return available_pages

    def scrape_with_validation(self, start_page=None, end_page=None, records_per_page=None):
        """Scrape multiple pages with validation"""
        if start_page is None:
            start_page = START_PAGE
        if end_page is None:
            end_page = END_PAGE
        if records_per_page is None:
            records_per_page = RECORDS_PER_PAGE
        
        print(f"Validating pages {start_page} to {end_page} before scraping...")
        available_pages = self.validate_page_range(start_page, end_page)
        
        if not available_pages:
            print("No pages with entries found in the specified range.")
            return
        
        print(f"Found {len(available_pages)} pages with entries. Starting to scrape...")
        
        # Update the range to only scrape available pages
        page_nums = [page["page_num"] for page in available_pages]
        self.scrape_multiple_pages(min(page_nums), max(page_nums), records_per_page)

    def scrape_single_page(self, page_num=None):
        """Scrape a single page"""
        try:
            if page_num is None:
                page_num = PAGE_TO_SCRAPE
            
            print(f"Starting to scrape page {page_num} of AUC Digital Collections with Selenium...")
            entries_processed = 0
            failed_entries = 0
            
            # Use retry mechanism to get entries from page
            entry_urls = self.retry_get_entries_from_page(page_num)
            print(f"Found {len(entry_urls)} entries on page {page_num}")
            
            # Limit the number of records if MAX_RECORDS_TO_SCRAPE is set
            if MAX_RECORDS_TO_SCRAPE is not None and MAX_RECORDS_TO_SCRAPE > 0:
                entry_urls = entry_urls[:MAX_RECORDS_TO_SCRAPE]
                print(f"Limited to scraping {len(entry_urls)} entries (MAX_RECORDS_TO_SCRAPE = {MAX_RECORDS_TO_SCRAPE})")
            
            for i, entry_url in enumerate(entry_urls):
                print(f"Scraping entry {i+1}/{len(entry_urls)} on page {page_num}: {entry_url}")
                
                # Use retry mechanism for each entry
                entry_data = self.retry_extract_description_data(entry_url)
                
                if entry_data:
                    entry_data = self.add_id_to_entry(entry_data)
                    self.all_data.append(entry_data)
                    entries_processed += 1
                    title = entry_data.get('Title', 'No title')
                    print(f"Successfully scraped entry {entries_processed}: {title}")
                else:
                    failed_entries += 1
                    print(f"Failed to scrape entry after all retries: {entry_url}")
                
                time.sleep(1)
            
            print(f"Scraping completed for page {page_num}.")
            print(f"Total entries scraped: {entries_processed}")
            print(f"Failed entries: {failed_entries}")
            if entries_processed + failed_entries > 0:
                success_rate = entries_processed/(entries_processed+failed_entries)*100
                print(f"Success rate: {success_rate:.1f}%")
            
        except Exception as e:
            print(f"Error during scraping page {page_num}: {e}")

    def scrape_multiple_pages(self, start_page=None, end_page=None, records_per_page=None):
        """Scrape multiple pages"""
        try:
            if start_page is None:
                start_page = START_PAGE
            if end_page is None:
                end_page = END_PAGE
            if records_per_page is None:
                records_per_page = RECORDS_PER_PAGE
            
            print(f"Starting to scrape pages {start_page} to {end_page} of AUC Digital Collections...")
            total_entries_processed = 0
            total_failed_entries = 0
            
            for page_num in range(start_page, end_page + 1):
                print(f"\n{'='*50}")
                print(f"Scraping page {page_num}/{end_page}")
                print(f"{'='*50}")
                
                # Get entries for this page with retry mechanism
                entry_urls = self.retry_get_entries_from_page(page_num)
                print(f"Found {len(entry_urls)} entries on page {page_num}")
                
                # Limit records per page if specified
                if records_per_page is not None and records_per_page > 0:
                    entry_urls = entry_urls[:records_per_page]
                    print(f"Limited to scraping {len(entry_urls)} entries per page (RECORDS_PER_PAGE = {records_per_page})")
                
                page_entries_processed = 0
                page_failed_entries = 0
                
                for i, entry_url in enumerate(entry_urls):
                    print(f"Scraping entry {i+1}/{len(entry_urls)} on page {page_num}: {entry_url}")
                    
                    # Use retry mechanism for each entry
                    entry_data = self.retry_extract_description_data(entry_url)
                    
                    if entry_data:
                        entry_data = self.add_id_to_entry(entry_data)
                        self.all_data.append(entry_data)
                        page_entries_processed += 1
                        total_entries_processed += 1
                        title = entry_data.get('Title', 'No title')
                        print(f"Successfully scraped entry {total_entries_processed}: {title}")
                    else:
                        page_failed_entries += 1
                        total_failed_entries += 1
                        print(f"Failed to scrape entry after all retries: {entry_url}")
                    
                    time.sleep(1)
                
                print(f"Completed page {page_num}.")
                print(f"Entries scraped on this page: {page_entries_processed}")
                print(f"Failed entries on this page: {page_failed_entries}")
                if page_entries_processed + page_failed_entries > 0:
                    page_success_rate = page_entries_processed/(page_entries_processed+page_failed_entries)*100
                    print(f"Page success rate: {page_success_rate:.1f}%")
                print(f"Total entries scraped so far: {total_entries_processed}")
                
                # Add a small delay between pages to be respectful to the server
                if page_num < end_page:
                    print("Waiting 3 seconds before next page...")
                    time.sleep(3)
            
            print(f"\n{'='*50}")
            print(f"Multi-page scraping completed!")
            print(f"Total pages scraped: {end_page - start_page + 1}")
            print(f"Total entries scraped: {total_entries_processed}")
            print(f"Total failed entries: {total_failed_entries}")
            if total_entries_processed + total_failed_entries > 0:
                overall_success_rate = total_entries_processed/(total_entries_processed+total_failed_entries)*100
                print(f"Overall success rate: {overall_success_rate:.1f}%")
            print(f"{'='*50}")
            
        except Exception as e:
            print(f"Error during multi-page scraping: {e}")

    def scrape_page(self):
        """Main scraping method that handles both single and multi-page scraping"""
        try:
            if SCRAPE_MULTIPLE_PAGES:
                self.scrape_multiple_pages()
            else:
                self.scrape_single_page()
        except Exception as e:
            print(f"Error during scraping: {e}")
        finally:
            self.driver.quit()

    def save_to_json(self, filename=None):
        try:
            if filename is None:
                if SCRAPE_MULTIPLE_PAGES:
                    filename = f'auc_digital_collection_pages_{START_PAGE}_to_{END_PAGE}.json'
                else:
                    filename = f'auc_digital_collection_page_{PAGE_TO_SCRAPE}.json'
            
            with open(filename, 'w', encoding='utf-8') as f:
                json.dump(self.all_data, f, ensure_ascii=False, indent=2)
            print(f"Data saved to {filename}")
        except Exception as e:
            print(f"Error saving data to {filename}: {e}")

def main():
    import argparse
    
    # Global variables for retry configuration
    global MAX_RETRIES, RETRY_DELAY
    
    parser = argparse.ArgumentParser(description='Scrape AUC Digital Collections')
    parser.add_argument('--single-page', type=int, help='Scrape a single specific page')
    parser.add_argument('--start-page', type=int, default=START_PAGE, help='First page to scrape (default: 1)')
    parser.add_argument('--end-page', type=int, default=END_PAGE, help='Last page to scrape (default: 10)')
    parser.add_argument('--records-per-page', type=int, default=RECORDS_PER_PAGE, help='Limit records per page')
    parser.add_argument('--validate-only', action='store_true', help='Only validate pages without scraping')
    parser.add_argument('--headless', action='store_true', default=True, help='Run in headless mode')
    parser.add_argument('--max-retries', type=int, default=MAX_RETRIES, help=f'Maximum retries for failed entries (default: {MAX_RETRIES})')
    parser.add_argument('--retry-delay', type=int, default=RETRY_DELAY, help=f'Delay between retries in seconds (default: {RETRY_DELAY})')
    parser.add_argument('--retry-failed', type=str, help='Retry failed entries from a JSON file')
    
    args = parser.parse_args()
    
    # Update retry configuration from command line arguments
    MAX_RETRIES = args.max_retries
    RETRY_DELAY = args.retry_delay
    
    scraper = AUCDigitalCollectionsSeleniumScraper(headless=args.headless)
    
    try:
        if args.retry_failed:
            # Retry failed entries from a previous run
            print(f"Retrying failed entries from: {args.retry_failed}")
            successful, still_failed = scraper.retry_failed_entries(args.retry_failed, args.max_retries, args.retry_delay)
            if successful > 0:
                scraper.save_to_json("retry_successful_entries.json")
        elif args.single_page:
            # Scrape a single specific page
            print(f"Scraping single page: {args.single_page}")
            scraper.scrape_single_page(args.single_page)
        elif args.validate_only:
            # Only validate pages
            print("Validating pages only...")
            available_pages = scraper.validate_page_range(args.start_page, args.end_page)
            print(f"Validation complete. Found {len(available_pages)} pages with entries.")
        else:
            # Multi-page scraping
            if SCRAPE_MULTIPLE_PAGES:
                print(f"Scraping pages {args.start_page} to {args.end_page}")
                scraper.scrape_multiple_pages(args.start_page, args.end_page, args.records_per_page)
            else:
                scraper.scrape_single_page()
        
        if not args.validate_only and not args.retry_failed:
            scraper.save_to_json()
            scraper.save_failed_entries()
            
    except Exception as e:
        print(f"Error in main: {e}")
    finally:
        scraper.driver.quit()

if __name__ == "__main__":
    main() 