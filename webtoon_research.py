import requests
from bs4 import BeautifulSoup
import json

headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
    'Referer': 'https://www.webtoons.com/'
}

url = 'https://www.webtoons.com/en/graphic-novel/avengers/'
r = requests.get(url, headers=headers)
soup = BeautifulSoup(r.text, 'html.parser')

images = soup.select('.viewer_img img')
urls = [img.get('data-url') for img in images]
print(json.dumps(urls, indent=2))
