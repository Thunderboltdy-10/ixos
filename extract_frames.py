import cv2
import os
import glob

videos = ['lando.mp4', 'convex.mp4', 'graphite.mp4', 'greptile.mp4', 'vercel.mp4', 'site 5.mp4', 'superhuman.mp4', 'cashapp.mp4', 'augment.mp4']
output_base = os.path.join('ixos-site', '.inspo_frames')

os.makedirs(output_base, exist_ok=True)

for video_path in videos:
    name = os.path.splitext(os.path.basename(video_path))[0]
    out_dir = os.path.join(output_base, name)
    os.makedirs(out_dir, exist_ok=True)
    
    cap = cv2.VideoCapture(video_path)
    if not cap.isOpened():
        print(f"Failed to open {video_path}")
        continue
        
    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    
    if total_frames == 0:
        print(f"No frames found in {video_path}")
        continue
        
    # We want 24 frames
    num_frames_to_extract = 24
    step = max(1, total_frames // num_frames_to_extract)
    
    frame_idx = 0
    extracted = 0
    
    while True:
        ret, frame = cap.read()
        if not ret:
            break
            
        if frame_idx % step == 0 and extracted < num_frames_to_extract:
            out_path = os.path.join(out_dir, f"frame_{extracted+1:02d}.jpg")
            cv2.imwrite(out_path, frame)
            extracted += 1
            
        frame_idx += 1
        
        if extracted >= num_frames_to_extract:
            break
            
    cap.release()
    print(f"Extracted {extracted} frames from {video_path}")
