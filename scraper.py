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
                
                # Method 1: Look for specific "Object Description" and "Item Description" labels first
                description_found = False
                try:
                    # Try to find Object Description or Item Description using more specific XPath
                    description_xpath_patterns = [
                        "//*[contains(text(), 'Object Description')]/following-sibling::*[1]",
                        "//*[contains(text(), 'Object Description')]/../following-sibling::*[1]",
                        "//*[contains(text(), 'Item Description')]/following-sibling::*[1]", 
                        "//*[contains(text(), 'Item Description')]/../following-sibling::*[1]",
                        "//*[text()='Object Description']/following-sibling::*[1]",
                        "//*[text()='Item Description']/following-sibling::*[1]"
                    ]
                    
                    for xpath_pattern in description_xpath_patterns:
                        try:
                            desc_elements = self.driver.find_elements(By.XPATH, xpath_pattern)
                            for desc_element in desc_elements:
                                desc_text = desc_element.text.strip()
                                if desc_text and len(desc_text) > 10:
                                    record['Description'] = desc_text
                                    description_found = True
                                    print(f"Found description using XPath pattern: {desc_text[:50]}...")
                                    break
                            if description_found:
                                break
                        except Exception as e:
                            continue
                    
                    # If XPath didn't work, try CSS selectors with text search
                    if not description_found:
                        all_elements = self.driver.find_elements(By.XPATH, "//*[text()]")
                        for i, element in enumerate(all_elements):
                            try:
                                text = element.text.strip()
                                if text in ['Object Description', 'Item Description']:
                                    # Look for the next meaningful sibling or parent sibling
                                    candidates = []
                                    try:
                                        candidates.append(element.find_element(By.XPATH, "following-sibling::*[1]"))
                                    except:
                                        pass
                                    try:
                                        candidates.append(element.find_element(By.XPATH, "../following-sibling::*[1]"))
                                    except:
                                        pass
                                    try:
                                        parent = element.find_element(By.XPATH, "..")
                                        candidates.append(parent.find_element(By.XPATH, "following-sibling::*[1]"))
                                    except:
                                        pass
                                    
                                    for candidate in candidates:
                                        candidate_text = candidate.text.strip()
                                        if candidate_text and len(candidate_text) > 10:
                                            record['Description'] = candidate_text
                                            description_found = True
                                            print(f"Found description using element search for '{text}': {candidate_text[:50]}...")
                                            break
                                    if description_found:
                                        break
                            except Exception as e:
                                continue
                
                except Exception as e:
                    print(f"Error in description extraction: {e}")
                
                # Method 2: Extract other metadata using simple text patterns
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
                                                    print(f"Found {field_name}: {potential_value}")
                                                    break
                                        break
                
                except Exception as e:
                    print(f"Error in text-based metadata extraction: {e}")
                
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
                                                    print(f"Found structured {key}: {value}")
                                        except Exception as e:
                                            continue
                            except Exception as e:
                                continue
                    except Exception as e:
                        print(f"Error in structured extraction: {e}")
                
                # Always try to extract image URL
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
            
            # Limit the number of records if MAX_RECORDS_TO_SCRAPE is set
            if MAX_RECORDS_TO_SCRAPE is not None and MAX_RECORDS_TO_SCRAPE > 0:
                entry_urls = entry_urls[:MAX_RECORDS_TO_SCRAPE]
                print(f"Limited to scraping {len(entry_urls)} entries (MAX_RECORDS_TO_SCRAPE = {MAX_RECORDS_TO_SCRAPE})")
            
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