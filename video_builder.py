import os
from moviepy import ImageClip, concatenate_videoclips, CompositeVideoClip, ColorClip
from PIL import Image

def resize_and_pad(image_path, target_size=(1080, 1920)):
    """
    Since Webtoons are very long vertically, we animate a scrolling effect
    rather than just resizing to fit the screen statically.
    """
    img = Image.open(image_path).convert('RGB')
    return img

def create_scrolling_clip(image_path, target_width=1080, scroll_speed=150):
    """
    Resizes image to target_width and creates a clip that pans down (scrolls) 
    at `scroll_speed` pixels per second.
    """
    img = Image.open(image_path).convert('RGB')
    original_w, original_h = img.size
    
    # Scale exactly to the width we want for the video
    ratio = target_width / original_w
    new_w = target_width
    new_h = int(original_h * ratio)
    
    img = img.resize((new_w, new_h), Image.Resampling.LANCZOS)
    
    # Save a temporary processed image
    temp_path = image_path.replace(".jpg", "_scaled.jpg").replace(".png", "_scaled.png")
    img.save(temp_path)
    
    clip = ImageClip(temp_path)
    
    # The height of our window (e.g. 1920)
    window_h = 1920
    
    if new_h <= window_h:
        # If it's shorter than screen, just center it for 3 seconds
        clip = clip.set_duration(3).margin(top=(window_h - new_h)//2, opacity=0)
        return clip
        
    # How far we have to scroll
    scroll_distance = new_h - window_h
    duration = scroll_distance / scroll_speed
    # minimum duration of 2 seconds
    duration = max(min(duration, 15), 2)  # Cap at 15 seconds per panel to not bore the viewer
    
    # Animation function: Move the clip up over time
    def fl(gf, t):
        # We return the frame, cropped.
        # But imageclip doesn't have crop animated easily, so we use set_position
        pass

    # moviepy's way to do camera pan on an image is to set position as a function of time
    clip = clip.set_duration(duration)
    
    # The clip starts at Y=0 and ends at Y=-scroll_distance
    clip = clip.set_position(lambda t: ('center', -int((t/duration) * scroll_distance)))
    
    # We composite it over a black background of size 1080x1920
    background = ColorClip(size=(target_width, window_h), color=(0, 0, 0)).set_duration(duration)
    
    final_clip = CompositeVideoClip([background, clip])
    return final_clip

def build_video(image_paths, output_file='assets/final_video.mp4'):
    """
    Compiles sequential images into a single video file showing webtoon panels nicely.
    """
    if not image_paths:
        print("No images provided for video builder.")
        return None
        
    os.makedirs(os.path.dirname(output_file), exist_ok=True)
    
    print(f"Building video from {len(image_paths)} images...")
    clips = []
    
    for path in image_paths:
        try:
            print(f"Processing clip for {path}...")
            clip = create_scrolling_clip(path)
            clips.append(clip)
        except Exception as e:
            print(f"Skipping {path} due to error: {e}")
            
    if not clips:
        print("Failed to create any clips.")
        return None
        
    print("Concatenating clips...")
    # method='compose' avoids weird dimension issues
    final_video = concatenate_videoclips(clips, method='compose')
    
    # Add a fade in / fade out to make it beautiful
    try:
        final_video = final_video.fadein(1).fadeout(1)
        print(f"Writing to {output_file}...")
        final_video.write_videofile(output_file, fps=24, codec='libx264', audio_codec='aac')
        print(f"Video generated successfully at {output_file}")
    except Exception as e:
        print("Skipping video building because moviepy could not write video. Ensure ffmpeg is installed.")
        print(f"Skipping video build error: {e}")
        return None
    
    return output_file

if __name__ == "__main__":
    import sys
    if len(sys.argv) > 1:
        folder = sys.argv[1]
        imgs = [os.path.join(folder, f) for f in os.listdir(folder) if f.endswith('.jpg') or f.endswith('.png')]
        build_video(sorted(imgs))
    else:
        print("Usage: python video_builder.py <folder_of_images>")
