import os
import re
import time
from typing import List, Dict, Optional, Tuple
from moviepy import ImageClip, concatenate_videoclips, CompositeVideoClip, ColorClip, AudioFileClip, TextClip, VideoFileClip
from moviepy.audio.AudioClip import AudioArrayClip
from PIL import Image
import requests
from dotenv import load_dotenv
import json

load_dotenv()

# AI Service APIs
RUNWAYML_API_KEY = os.getenv('RUNWAYML_API_KEY')
OPENAI_API_KEY = os.getenv('OPENAI_API_KEY')
ELEVENLABS_API_KEY = os.getenv('ELEVENLABS_API_KEY')

class AIVideoBuilder:
    def __init__(self):
        self.runway_headers = {'Authorization': f'Bearer {RUNWAYML_API_KEY}'} if RUNWAYML_API_KEY else None
        self.openai_headers = {'Authorization': f'Bearer {OPENAI_API_KEY}'} if OPENAI_API_KEY else None

    def generate_ai_video(self, prompt: str, duration: int = 5) -> Optional[str]:
        """Generate video using AI services (RunwayML, etc.)"""
        if not self.runway_headers:
            print("No RunwayML API key found. Skipping AI video generation.")
            return None

        try:
            # RunwayML Gen-2 API
            url = "https://api.runwayml.com/v1/image_to_video"
            data = {
                "model": "gen-2",
                "prompt": prompt,
                "duration": duration,
                "ratio": "16:9"
            }

            response = requests.post(url, headers=self.runway_headers, json=data)
            if response.status_code == 201:
                task_id = response.json()['id']
                return self._poll_runway_task(task_id)
            else:
                print(f"RunwayML API error: {response.text}")
                return None
        except Exception as e:
            print(f"AI video generation failed: {e}")
            return None

    def _poll_runway_task(self, task_id: str) -> Optional[str]:
        """Poll RunwayML task until completion"""
        url = f"https://api.runwayml.com/v1/tasks/{task_id}"

        for _ in range(60):  # Poll for up to 5 minutes
            response = requests.get(url, headers=self.runway_headers)
            if response.status_code == 200:
                data = response.json()
                if data['status'] == 'SUCCEEDED':
                    return data['output'][0]  # Video URL
                elif data['status'] == 'FAILED':
                    print(f"RunwayML task failed: {data.get('failure_reason', 'Unknown error')}")
                    return None
            time.sleep(5)

        print("RunwayML task timed out")
        return None

    def generate_tts_audio(self, text: str, voice: str = "alloy") -> Optional[str]:
        """Generate text-to-speech audio using OpenAI or ElevenLabs"""
        if self.openai_headers:
            return self._openai_tts(text, voice)
        elif ELEVENLABS_API_KEY:
            return self._elevenlabs_tts(text, voice)
        else:
            print("No TTS API key found. Skipping audio generation.")
            return None

    def _openai_tts(self, text: str, voice: str) -> Optional[str]:
        """OpenAI Text-to-Speech"""
        try:
            url = "https://api.openai.com/v1/audio/speech"
            data = {
                "model": "tts-1",
                "input": text,
                "voice": voice,
                "response_format": "mp3"
            }

            response = requests.post(url, headers=self.openai_headers, json=data)
            if response.status_code == 200:
                output_file = f"temp_tts_{int(time.time())}.mp3"
                with open(output_file, 'wb') as f:
                    f.write(response.content)
                return output_file
            else:
                print(f"OpenAI TTS error: {response.text}")
                return None
        except Exception as e:
            print(f"OpenAI TTS failed: {e}")
            return None

    def _elevenlabs_tts(self, text: str, voice: str) -> Optional[str]:
        """ElevenLabs Text-to-Speech"""
        try:
            url = f"https://api.elevenlabs.io/v1/text-to-speech/{voice}"
            headers = {
                'Accept': 'audio/mpeg',
                'Content-Type': 'application/json',
                'xi-api-key': ELEVENLABS_API_KEY
            }
            data = {
                "text": text,
                "model_id": "eleven_monolingual_v1",
                "voice_settings": {
                    "stability": 0.5,
                    "similarity_boost": 0.5
                }
            }

            response = requests.post(url, headers=headers, json=data)
            if response.status_code == 200:
                output_file = f"temp_tts_{int(time.time())}.mp3"
                with open(output_file, 'wb') as f:
                    f.write(response.content)
                return output_file
            else:
                print(f"ElevenLabs TTS error: {response.text}")
                return None
        except Exception as e:
            print(f"ElevenLabs TTS failed: {e}")
            return None

def parse_script_for_scenes(script_text: str) -> List[Dict]:
    """Parse YouTube script into scenes with timing and descriptions"""
    scenes = []
    lines = script_text.split('\n')

    current_scene = None
    for line in lines:
        line = line.strip()
        if not line:
            continue

        # Look for scene markers or dialogue
        if re.match(r'^\[.*\]$', line):  # [Scene description]
            if current_scene:
                scenes.append(current_scene)
            current_scene = {
                'description': line[1:-1],
                'dialogue': [],
                'duration': 5  # Default 5 seconds
            }
        elif current_scene and line:
            current_scene['dialogue'].append(line)

    if current_scene:
        scenes.append(current_scene)

    return scenes

def create_scene_video(scene: Dict, ai_builder: AIVideoBuilder, size: Tuple[int, int] = (1920, 1080)) -> Optional[CompositeVideoClip]:
    """Create video for a single scene using AI or fallback"""
    try:
        # Generate AI video prompt from scene description
        prompt = f"Create a cinematic scene: {scene['description']}. High quality, detailed, dramatic lighting."

        # Try AI video generation first
        video_url = ai_builder.generate_ai_video(prompt, duration=scene.get('duration', 5))

        if video_url:
            # Download and use AI-generated video
            video_response = requests.get(video_url)
            temp_video = f"temp_scene_{int(time.time())}.mp4"
            with open(temp_video, 'wb') as f:
                f.write(video_response.content)
            clip = VideoFileClip(temp_video)
        else:
            # Fallback: Create text-based scene
            background = ColorClip(size=size, color=(0, 0, 0)).set_duration(scene.get('duration', 5))

            # Add scene description as text
            txt_clip = TextClip(scene['description'],
                              fontsize=50,
                              color='white',
                              bg_color='black',
                              size=(size[0]-100, 100)).set_position('center').set_duration(scene.get('duration', 5))

            clip = CompositeVideoClip([background, txt_clip])

        return clip
    except Exception as e:
        print(f"Failed to create scene video: {e}")
        return None

def build_youtube_video(script_file: str, output_file: str = 'assets/youtube_video.mp4',
                       is_shorts: bool = False) -> Optional[str]:
    """Build complete YouTube video or Shorts with AI-generated content and synchronized audio"""

    if not os.path.exists(script_file):
        print(f"Script file not found: {script_file}")
        return None

    with open(script_file, 'r', encoding='utf-8') as f:
        script_text = f.read()

    ai_builder = AIVideoBuilder()
    scenes = parse_script_for_scenes(script_text)

    if not scenes:
        print("No scenes found in script")
        return None

    print(f"Creating {'YouTube Shorts' if is_shorts else 'YouTube video'} with {len(scenes)} scenes...")

    video_clips = []
    audio_clips = []

    for i, scene in enumerate(scenes):
        print(f"Processing scene {i+1}/{len(scenes)}: {scene['description']}")

        # Create video for scene
        video_clip = create_scene_video(scene, ai_builder,
                                      size=(1080, 1920) if is_shorts else (1920, 1080))
        if video_clip:
            video_clips.append(video_clip)

            # Generate audio for scene dialogue
            dialogue_text = ' '.join(scene['dialogue'])
            if dialogue_text:
                audio_file = ai_builder.generate_tts_audio(dialogue_text)
                if audio_file:
                    audio_clip = AudioFileClip(audio_file).set_duration(video_clip.duration)
                    audio_clips.append(audio_clip)

    if not video_clips:
        print("No video clips created")
        return None

    # Concatenate video clips
    final_video = concatenate_videoclips(video_clips, method='compose')

    # Add audio if available
    if audio_clips:
        final_audio = concatenate_videoclips(audio_clips, method='compose')
        final_video = final_video.set_audio(final_audio)

    # Add fade effects
    final_video = final_video.fadein(1).fadeout(1)

    # Ensure output directory exists
    os.makedirs(os.path.dirname(output_file), exist_ok=True)

    # Export video
    print(f"Exporting {'Shorts' if is_shorts else 'video'} to {output_file}...")
    final_video.write_videofile(output_file,
                              fps=30,
                              codec='libx264',
                              audio_codec='aac',
                              bitrate='8000k')

    print(f"{'YouTube Shorts' if is_shorts else 'YouTube video'} created successfully: {output_file}")
    return output_file

def build_traditional_video(image_paths: List[str], output_file: str = 'assets/traditional_video.mp4') -> Optional[str]:
    """Build traditional scrolling video from webtoon images (fallback method)"""
    if not image_paths:
        print("No images provided for video builder.")
        return None

    os.makedirs(os.path.dirname(output_file), exist_ok=True)

    print(f"Building traditional video from {len(image_paths)} images...")
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
    final_video = concatenate_videoclips(clips, method='compose')
    final_video = final_video.fadein(1).fadeout(1)

    print(f"Writing to {output_file}...")
    final_video.write_videofile(output_file, fps=24, codec='libx264', audio_codec='aac')
    print(f"Traditional video generated successfully at {output_file}")
    return output_file

def resize_and_pad(image_path, target_size=(1080, 1920)):
    """Resize and pad image to target size"""
    img = Image.open(image_path).convert('RGB')
    return img

def create_scrolling_clip(image_path, target_width=1080, scroll_speed=150):
    """Create scrolling clip from webtoon image"""
    img = Image.open(image_path).convert('RGB')
    original_w, original_h = img.size

    ratio = target_width / original_w
    new_w = target_width
    new_h = int(original_h * ratio)

    img = img.resize((new_w, new_h), Image.Resampling.LANCZOS)

    temp_path = image_path.replace(".jpg", "_scaled.jpg").replace(".png", "_scaled.png")
    img.save(temp_path)

    clip = ImageClip(temp_path)
    window_h = 1920

    if new_h <= window_h:
        clip = clip.set_duration(3).margin(top=(window_h - new_h)//2, opacity=0)
        return clip

    scroll_distance = new_h - window_h
    duration = scroll_distance / scroll_speed
    duration = max(min(duration, 15), 2)

    clip = clip.set_duration(duration)
    clip = clip.set_position(lambda t: ('center', -int((t/duration) * scroll_distance)))

    background = ColorClip(size=(target_width, window_h), color=(0, 0, 0)).set_duration(duration)
    final_clip = CompositeVideoClip([background, clip])
    return final_clip

# Legacy function for backward compatibility
def build_video(image_paths, output_file='assets/final_video.mp4'):
    """Legacy function - use build_traditional_video instead"""
    return build_traditional_video(image_paths, output_file)

if __name__ == "__main__":
    import sys
    if len(sys.argv) > 1:
        script_file = sys.argv[1]
        output_file = sys.argv[2] if len(sys.argv) > 2 else 'assets/youtube_video.mp4'
        is_shorts = '--shorts' in sys.argv

        result = build_youtube_video(script_file, output_file, is_shorts)
        if result:
            print(f"Video created: {result}")
        else:
            print("Video creation failed")
    else:
        print("Usage: python video_builder.py <script_file> [output_file] [--shorts]")
