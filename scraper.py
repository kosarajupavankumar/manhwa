import os
import requests
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry
from bs4 import BeautifulSoup
import time
import concurrent.futures

HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
    'Referer': 'https://www.webtoons.com/'
}

def get_chapter_urls(series_url, limit=None):
    """
    Fetches chapter URLs and their names from a series page.
    Returns: series_name, list of (episode_name, episode_url)
    """
    try:
        response = requests.get(series_url, headers=HEADERS)
        response.raise_for_status()
    except requests.exceptions.HTTPError as e:
        if e.response.status_code in (500, 404):
            # The user might have provided a generic URL like /en/graphic-novel/avengers/
            # Let's try to search the keyword and find the actual list URL automatically.
            keyword = series_url.strip('/').split('/')[-1]
            print(f"\n[!] Webtoons Server Error (500/404) for {series_url}.")
            print(f"[*] Attempting to auto-resolve by searching for keyword: '{keyword}'...")
            
            search_url = f'https://www.webtoons.com/search?keyword={keyword}'
            search_resp = requests.get(search_url, headers=HEADERS)
            if search_resp.status_code == 200:
                s_soup = BeautifulSoup(search_resp.text, 'html.parser')
                # Find the first link that contains title_no
                for a in s_soup.find_all('a'):
                    href = a.get('href', '')
                    if 'title_no=' in href and keyword in href.lower():
                        print(f"[*] Found replacement URL automatically: {href}")
                        return get_chapter_urls(href, limit)
            print("[!] Could not auto-resolve the URL. Please provide the exact 'List' URL containing 'title_no'.")
            return None, []
        raise e
    soup = BeautifulSoup(response.text, 'html.parser')

    # Get series name
    series_name = "Unknown_Series"
    title_elem = soup.find('h1', class_='subj')
    if title_elem:
        series_name = title_elem.text.strip().replace('/', '-').replace('\\', '-').replace(' ', '_')
    else:
        # Try other selectors
        title_elem = soup.find('meta', property='og:title')
        if title_elem:
            series_name = title_elem.get('content', 'Unknown_Series').split(' - ')[0].replace('/', '-').replace('\\', '-').replace(' ', '_')

    chapters = []
    
    # Try finding the listUl which contains episodes
    list_ul = soup.find('ul', id='_listUl')
    if list_ul:
        for li in list_ul.find_all('li'):
            link = li.find('a')
            subj = li.find('span', class_='subj')
            if link and 'href' in link.attrs and subj:
                ep_name = subj.text.strip().replace('/', '-').replace('\\', '-')
                chapters.append((ep_name, link['href']))
                if limit and len(chapters) >= limit:
                    break

    # If the provided URL is already a viewer page, try to find its title
    if not chapters and 'viewer' in series_url:
        ep_name = "Episode_Unknown"
        subj = soup.find('h1', class_='subj_episode')
        if subj:
            ep_name = subj.text.strip().replace('/', '-').replace('\\', '-')
        chapters = [(ep_name, series_url)]
        
    import re
    def natural_sort_key(chap):
        s = chap[0]
        return [int(text) if text.isdigit() else text.lower() for text in re.split(r'(\d+)', s)]
        
    chapters.sort(key=natural_sort_key)
    return series_name, chapters

def download_images_from_chapter(chapter_url, output_dir):
    """
    Downloads all images from a specific Webtoon chapter.
    """
    os.makedirs(output_dir, exist_ok=True)
    
    # Configure session with robust retry logic to prevent ConnectionReset errors
    session = requests.Session()
    retry = Retry(total=5, backoff_factor=1, status_forcelist=[ 500, 502, 503, 504 ])
    adapter = HTTPAdapter(max_retries=retry)
    session.mount('http://', adapter)
    session.mount('https://', adapter)
    
    response = session.get(chapter_url, headers=HEADERS, timeout=15)
    response.raise_for_status()
    soup = BeautifulSoup(response.text, 'html.parser')
    
    images = soup.select('.viewer_img img')
    image_paths = []
    
    for i, img in enumerate(images):
        img_url = img.get('data-url')
        if not img_url:
            continue
            
        file_ext = img_url.split('.')[-1].split('?')[0]
        if not file_ext or len(file_ext) > 4:
            file_ext = 'jpg'
            
        filename = f"image_{i:03d}.{file_ext}"
        filepath = os.path.join(output_dir, filename)
        image_paths.append(filepath)
        
        # Skip if already downloaded fully to save time and bandwidth
        if os.path.exists(filepath) and os.path.getsize(filepath) > 0:
            print(f"  Skipping image {i+1}/{len(images)} (Already downloaded)")
            continue
            
        print(f"  Downloading image {i+1}/{len(images)}...")
        try:
            img_resp = session.get(img_url, headers=HEADERS, stream=True, timeout=15)
            img_resp.raise_for_status()
            
            with open(filepath, 'wb') as f:
                for chunk in img_resp.iter_content(chunk_size=8192):
                    f.write(chunk)
            time.sleep(0.5) # gentle rate limiting
        except requests.exceptions.RequestException as e:
            print(f"  [!] Failed to download image {i+1}: {e}")
            
    return image_paths

def scrape_webtoon(url, limit=None):
    print(f"Scraping Webtoon from: {url}")
    series_name, chapters = get_chapter_urls(url, limit=limit)
    
    if series_name is None:
        return None, {}
    
    results = {}
    
    def process_chapter(chapter_info):
        ep_name, chapter_url = chapter_info
        print(f"[Thread] Starting chapter: {ep_name}")
        chapter_dir = os.path.join('assets', series_name, 'images', ep_name)
        paths = download_images_from_chapter(chapter_url, chapter_dir)
        print(f"[Thread] Finished {ep_name} (Downloaded {len(paths)} images).")
        return ep_name, paths

    print(f"Starting parallel downloads for {len(chapters)} episodes...")
    
    # Process up to 5 episodes in parallel to prevent overwhelming the Webtoons server
    with concurrent.futures.ThreadPoolExecutor(max_workers=5) as executor:
        # submit all tasks to the executor
        future_to_ep = {executor.submit(process_chapter, chapter): chapter for chapter in chapters}
        
        for future in concurrent.futures.as_completed(future_to_ep):
            ep_info = future_to_ep[future]
            try:
                ep_name, paths = future.result()
                results[ep_name] = paths
            except Exception as exc:
                print(f"[!] Episode {ep_info[0]} generated an exception: {exc}")
                
    return series_name, results

if __name__ == "__main__":
    import sys
    if len(sys.argv) > 1:
        # Default test behavior
        scrape_webtoon(sys.argv[1], limit=1)
    else:
        print("Usage: python scraper.py <webtoon_url>")
