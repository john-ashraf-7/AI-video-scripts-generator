#!/usr/bin/env python3
"""
Selenium-based scraper for AUC Digital Collections (First Page Only)
Handles JavaScript-rendered content, scrapes only the first page
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
OUTFILE = pathlib.Path("auc_digital_selenium_firstpage.jsonl")

class AUCDigitalCollectionsSeleniumScraperFirstPage:
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
            page_url = f"{self.search_url}?page={page_num}"
            print(f"Loading page {page_num}: {page_url}")
            self.driver.get(page_url)
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
                    if record:
                        return record
            try:
                metadata_elements = self.driver.find_elements(By.CSS_SELECTOR, "[class*='metadata'], [class*='description'], [class*='item-details']")
                record = {}
                for element in metadata_elements:
                    key_elements = element.find_elements(By.CSS_SELECTOR, "dt, th, strong, b, [class*='label']")
                    for key_element in key_elements:
                        key = key_element.text.strip()
                        if key:
                            try:
                                value_element = key_element.find_element(By.XPATH, "following-sibling::*[1]")
                                value = value_element.text.strip()
                                if value and value != key:
                                    record[key] = value
                            except NoSuchElementException:
                                continue
                return record
            except Exception as e:
                print(f"Error extracting fallback content: {e}")
                return {}
        except Exception as e:
            print(f"Error extracting data from {entry_url}: {e}")
            return {}

    def scrape_first_page(self):
        try:
            print("Starting to scrape ONLY the first page of AUC Digital Collections with Selenium...")
            entries_processed = 0
            page_num = 1
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

    def save_to_json(self, filename='auc_digital_selenium_firstpage.jsonl'):
        try:
            with open(filename, 'w', encoding='utf-8') as f:
                for entry in self.all_data:
                    f.write(json.dumps(entry, ensure_ascii=False) + "\n")
            print(f"Data saved to {filename}")
        except Exception as e:
            print(f"Error saving data to {filename}: {e}")

def main():
    scraper = AUCDigitalCollectionsSeleniumScraperFirstPage(headless=True)
    scraper.scrape_first_page()
    scraper.save_to_json()

if __name__ == "__main__":
    main() 