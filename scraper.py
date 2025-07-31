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

class AUCDigitalCollectionsSeleniumScraper:
    def __init__(self, headless=True):
        self.base_url = BASE_URL
        self.search_url = SEARCH_URL
        self.all_data = []
        
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
                    
                    if record:
                        return record
            try:
                # Fallback method: try to extract metadata from DOM elements
                print(f"Using fallback DOM extraction method for {entry_url}")
                record = {}
                
                # First, try to extract all visible text content and parse it
                try:
                    # Look for common metadata containers
                    metadata_containers = self.driver.find_elements(By.CSS_SELECTOR, 
                        "[class*='metadata'], [class*='description'], [class*='item-details'], " +
                        "[class*='item-info'], [class*='record'], [class*='details'], " +
                        "[id*='metadata'], [id*='details'], .content, .main-content")
                    
                    # Also try to find all text elements that might contain metadata
                    all_text_elements = self.driver.find_elements(By.XPATH, "//*[text()]")
                    
                    # Combine all potential sources
                    all_elements = metadata_containers + all_text_elements
                    
                    # Extract all text content to analyze
                    page_text = []
                    for element in all_elements:
                        try:
                            text = element.text.strip()
                            if text and len(text) > 2:
                                page_text.append(text)
                        except:
                            continue
                    
                    # Join all text and split into lines for analysis
                    full_text = "\n".join(page_text)
                    lines = [line.strip() for line in full_text.split('\n') if line.strip()]
                    
                    # Look for metadata patterns in the text
                    metadata_patterns = {
                        'Title': ['Title', 'title', 'TITLE'],
                        'Creator': ['Creator', 'creator', 'CREATOR', 'Author', 'author'],
                        'Date': ['Date', 'date', 'DATE', 'Year', 'year'],
                        'Subject': ['Subject', 'subject', 'SUBJECT', 'Topic', 'topic'],
                        'Type': ['Type', 'type', 'TYPE', 'Format', 'format'],
                        'Language': ['Language', 'language', 'LANGUAGE'],
                        'Publisher': ['Publisher', 'publisher', 'PUBLISHER'],
                        'Source': ['Source', 'source', 'SOURCE'],
                        'Collection': ['Collection', 'collection', 'COLLECTION'],
                        'Rights': ['Rights', 'rights', 'RIGHTS', 'Copyright', 'copyright'],
                        'Call number': ['Call number', 'call number', 'CALL NUMBER', 'Identifier', 'identifier'],
                        'Link to catalogue': ['Link to catalogue', 'link to catalogue', 'Catalogue', 'catalogue']
                    }
                    
                    # Try to find Object Description first, then Item Description
                    description_found = False
                    description_patterns = [
                        'Object Description',
                        'Item Description', 
                        'object description',
                        'item description',
                        'Description',
                        'description',
                        'DESCRIPTION'
                    ]
                    
                    for i, line in enumerate(lines):
                        for desc_pattern in description_patterns:
                            if desc_pattern in line and not description_found:
                                # Look for the next non-empty line as the description content
                                for j in range(i + 1, min(i + 5, len(lines))):
                                    if j < len(lines):
                                        potential_desc = lines[j].strip()
                                        # Skip if it's another metadata label
                                        if potential_desc and len(potential_desc) > 10 and not any(
                                            potential_desc.endswith(':') or 
                                            any(pattern in potential_desc for patterns in metadata_patterns.values() for pattern in patterns)
                                            for patterns in metadata_patterns.values()
                                        ):
                                            record['Description'] = potential_desc
                                            description_found = True
                                            print(f"Found description using pattern '{desc_pattern}': {potential_desc[:50]}...")
                                            break
                                if description_found:
                                    break
                        if description_found:
                            break
                    
                    # Extract other metadata using pattern matching
                    for i, line in enumerate(lines):
                        for field_name, patterns in metadata_patterns.items():
                            if field_name not in record:  # Don't overwrite existing data
                                for pattern in patterns:
                                    if pattern in line and (line.endswith(':') or pattern + ':' in line):
                                        # Look for the next non-empty line as the value
                                        for j in range(i + 1, min(i + 3, len(lines))):
                                            if j < len(lines):
                                                potential_value = lines[j].strip()
                                                if potential_value and len(potential_value) > 1:
                                                    # Skip if it looks like another metadata label
                                                    if not (potential_value.endswith(':') or 
                                                           any(p in potential_value for patterns in metadata_patterns.values() for p in patterns)):
                                                        record[field_name] = potential_value
                                                        print(f"Found {field_name}: {potential_value}")
                                                        break
                                        break
                
                except Exception as e:
                    print(f"Error in text-based extraction: {e}")
                    
                # If we still don't have much data, try the original DOM-based approach
                if len(record) < 3:
                    try:
                        # Look for definition lists, tables, or other structured metadata
                        structured_elements = self.driver.find_elements(By.CSS_SELECTOR, 
                            "dl, table, .metadata-table, [class*='field'], [class*='row']")
                        
                        for element in structured_elements:
                            try:
                                # Look for key-value pairs
                                keys = element.find_elements(By.CSS_SELECTOR, "dt, th, .label, .key, strong, b")
                                for key_elem in keys:
                                    key_text = key_elem.text.strip()
                                    if key_text:
                                        try:
                                            # Try different ways to find the corresponding value
                                            value_elem = None
                                            try:
                                                value_elem = key_elem.find_element(By.XPATH, "following-sibling::dd[1]")
                                            except:
                                                try:
                                                    value_elem = key_elem.find_element(By.XPATH, "following-sibling::td[1]")
                                                except:
                                                    try:
                                                        value_elem = key_elem.find_element(By.XPATH, "following-sibling::*[1]")
                                                    except:
                                                        pass
                                            
                                            if value_elem:
                                                value_text = value_elem.text.strip()
                                                if value_text and value_text != key_text:
                                                    record[key_text] = value_text
                                        except:
                                            continue
                            except:
                                continue
                    except Exception as e:
                        print(f"Error in structured extraction: {e}")
                
                # Extract image URL
                image_url = self.extract_image_url()
                if image_url:
                    record['Image URL'] = image_url
                
                print(f"Fallback extraction completed. Found {len(record)} fields for {entry_url}")
                if record:
                    print(f"Extracted fields: {list(record.keys())}")
                
                return record
            except Exception as e:
                print(f"Error extracting fallback content: {e}")
                return {}
        except Exception as e:
            print(f"Error extracting data from {entry_url}: {e}")
            return {}

    def scrape_page(self):
        try:
            print(f"Starting to scrape page {PAGE_TO_SCRAPE} of AUC Digital Collections with Selenium...")
            entries_processed = 0
            page_num = PAGE_TO_SCRAPE
            entry_urls = self.get_entries_from_page(page_num)
            print(f"Found {len(entry_urls)} entries on page {page_num}")
            for i, entry_url in enumerate(entry_urls):
                print(f"Scraping entry {i+1}/{len(entry_urls)} on page {page_num}: {entry_url}")
                entry_data = self.extract_description_data(entry_url)
                if entry_data:
                    self.all_data.append(entry_data)
                    entries_processed += 1
                    title = entry_data.get('Title', 'No title')
                    print(f"Successfully scraped entry {entries_processed}: {title}")
                else:
                    print(f"Failed to scrape entry: {entry_url}")
                time.sleep(1)
            print(f"Scraping completed. Total entries scraped: {len(self.all_data)}")
        except Exception as e:
            print(f"Error during scraping: {e}")
        finally:
            self.driver.quit()

    def save_to_json(self, filename=f'auc_digital_collection_page_{PAGE_TO_SCRAPE}.json'):
        try:
            with open(filename, 'w', encoding='utf-8') as f:
                json.dump(self.all_data, f, ensure_ascii=False, indent=2)
            print(f"Data saved to {filename}")
        except Exception as e:
            print(f"Error saving data to {filename}: {e}")

def main():
    scraper = AUCDigitalCollectionsSeleniumScraper(headless=True)
    scraper.scrape_page()
    scraper.save_to_json()

if __name__ == "__main__":
    main() 