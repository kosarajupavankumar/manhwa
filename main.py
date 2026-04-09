import os
import argparse
from dotenv import load_dotenv
load_dotenv()

from scraper import scrape_webtoon
from ocr_extractor import extract_text_from_images
from script_generator import polish_script

def main():
    parser = argparse.ArgumentParser(description="Webtoon to YouTube Automation Pipeline")
    parser.add_argument("url", nargs="?", help="URL of the Webtoon series or chapter")
    parser.add_argument("--limit", type=int, default=None, help="Number of chapters to process. None = All chapters on page")
    parser.add_argument("--skip-download", action="store_true", help="Skip downloading images, process existing folders in assets/images")
    
    args = parser.parse_args()
    
    print("="*50)
    print(" WEBTOON EXTRACTION TOOL ")
    print("="*50)
    print("Note: Video scaling/building is currently skipped per request.")
    
    url = args.url
    if not url:
        url = input("\nPlease enter the Webtoon/Manhwa URL (e.g., .../graphic-novel/avengers/): ").strip()
        
    if not url:
        print("No URL provided. Exiting.")
        return
    
    episode_data = {} # { "Episode X": ["path/to/img1", "path/to/img2"] }
    series_name = None
    
    # --- Phase 1: Downloading Episodes ---
    if args.skip_download:
        print("Skipping download step...")
        base_dir = 'assets'
        if os.path.exists(base_dir):
            for series_folder in os.listdir(base_dir):
                series_dir = os.path.join(base_dir, series_folder)
                if os.path.isdir(series_dir) and not series_folder.startswith('.'):  # Skip hidden
                    images_dir = os.path.join(series_dir, 'images')
                    if os.path.exists(images_dir):
                        series_name = series_folder
                        for ep_folder in os.listdir(images_dir):
                            ep_dir = os.path.join(images_dir, ep_folder)
                            if os.path.isdir(ep_dir):
                                images = sorted([os.path.join(ep_dir, f) for f in os.listdir(ep_dir) if f.endswith('.jpg') or f.endswith('.png')])
                                if images:
                                    episode_data[ep_folder] = images
                        break  # Assume one series
        else:
            print("No existing images found. Cannot skip download.")
            return
    else:
        print("\n--- Phase 1: Downloading Episodes ---")
        series_name, episode_data = scrape_webtoon(url, limit=args.limit)
    
    if not episode_data:
        print("Pipeline aborted: No episodes/images found.")
        return
        
    # --- Phase 2: OCR Text Extraction (Per Episode & Combined) ---
    print("\n--- Phase 2: OCR Text Extraction ---")
    
    combined_text_path = f'assets/{series_name}/all_episodes_combined_text.txt'
    # Clear combined text file if it exists prior to starting
    if os.path.exists(combined_text_path):
        os.remove(combined_text_path)
        
    text_dir = os.path.join('assets', series_name, 'text')
    os.makedirs(text_dir, exist_ok=True)
    
    import re
    def natural_sort_key(s):
        return [int(text) if text.isdigit() else text.lower() for text in re.split(r'(\d+)', s)]
        
    sorted_episodes = sorted(episode_data.keys(), key=natural_sort_key)
        
    for ep_name in sorted_episodes:
        image_paths = episode_data[ep_name]
        print(f"\nProcessing Text for: {ep_name} ({len(image_paths)} images)")
        ep_text_dir = os.path.join(text_dir, ep_name)
        os.makedirs(ep_text_dir, exist_ok=True)
        ep_text_path = os.path.join(ep_text_dir, f'{ep_name}_extracted.txt')
        
        # Extract for individual episode
        extract_text_from_images(image_paths, output_file=ep_text_path)
        
        # Append to combined file
        if os.path.exists(ep_text_path):
            with open(ep_text_path, 'r', encoding='utf-8') as ep_file:
                ep_text = ep_file.read()
                
            with open(combined_text_path, 'a', encoding='utf-8') as combined_file:
                combined_file.write(f"\n{'='*40}\n")
                combined_file.write(f"--- {ep_name} ---\n")
                combined_file.write(f"{'='*40}\n\n")
                combined_file.write(ep_text)
                combined_file.write("\n")
                
    # --- Phase 3: AI Script Generation ---
    print("\n--- Phase 3: AI Script Generation ---")
    script_output_path = f'assets/{series_name}/youtube_script_gemini_pro.md'
    final_script = polish_script(combined_text_path, script_output_path)
                
    print("\n" + "="*50)
    print(" EXTRACTION COMPLETE! ")
    print(f" Images downloaded into: assets/{series_name}/images/<Episode Name>/")
    print(f" Individual Episode Texts saved in: assets/{series_name}/text/<Episode Name>/")
    print(f" Master Combined Text: assets/{series_name}/{os.path.basename(combined_text_path)}")
    print(f" Gemini Pro YouTube Script: {final_script}")
    print("="*50)

if __name__ == "__main__":
    main()
