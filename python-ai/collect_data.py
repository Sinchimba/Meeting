import cv2
import argparse
from pathlib import Path
import os
import time

def main():
    parser = argparse.ArgumentParser(description="Record a custom sign language gesture video.")
    parser.add_argument('--sign', required=True, help="Name of the sign you are recording (e.g., 'apple', 'hello').")
    parser.add_argument('--samples', type=int, default=5, help="Number of videos to record for this sign.")
    parser.add_argument('--duration', type=int, default=2, help="Duration of each video in seconds.")
    args = parser.parse_args()

    data_dir = Path('data') / args.sign
    data_dir.mkdir(parents=True, exist_ok=True)
    
    # Check existing files to avoid overwriting
    existing_files = len(list(data_dir.glob('*.mp4')))
    
    print(f"=========================================")
    print(f"Teaching AI the sign for: '{args.sign}'")
    print(f"We will record {args.samples} video samples of {args.duration} seconds each.")
    print(f"Press 'r' to start recording a sample.")
    print(f"Press 'q' to quit.")
    print(f"=========================================\n")

    cap = cv2.VideoCapture(0)
    if not cap.isOpened():
        print("Error: Could not open webcam.")
        return

    # Basic configurations
    fps = 30.0
    width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    fourcc = cv2.VideoWriter_fourcc(*'mp4v')

    sample_idx = existing_files
    target_samples = sample_idx + args.samples

    while sample_idx < target_samples:
        ret, frame = cap.read()
        if not ret:
            print("Failed to grab frame.")
            break

        # Display instructions
        display_frame = frame.copy()
        cv2.putText(display_frame, f"Sign: {args.sign} | Sample: {sample_idx}/{target_samples}", 
                    (10, 30), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (255, 255, 255), 2)
        cv2.putText(display_frame, "Press 'r' to Record | 'q' to Quit", 
                    (10, 60), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 255, 0), 2)

        cv2.imshow('AI Teaching Mode', display_frame)

        key = cv2.waitKey(1) & 0xFF
        if key == ord('q'):
            break
        elif key == ord('r'):
            # Start recording
            print(f"Recording sample {sample_idx + 1}...")
            out_file = str(data_dir / f"{args.sign}_{sample_idx:03d}.mp4")
            out = cv2.VideoWriter(out_file, fourcc, fps, (width, height))
            
            start_time = time.time()
            while (time.time() - start_time) < args.duration:
                ret, frame = cap.read()
                if not ret:
                    break
                
                # Write original frame
                out.write(frame)
                
                # Display recording status
                cv2.putText(frame, "* RECORDING *", (10, 30), cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 0, 255), 2)
                cv2.imshow('AI Teaching Mode', frame)
                cv2.waitKey(1)
            
            out.release()
            print(f"Saved: {out_file}")
            sample_idx += 1
            time.sleep(1) # Pause between recordings

    cap.release()
    cv2.destroyAllWindows()
    print("\nData collection complete! You can now run `python train.py --data-dir data` to teach the AI.")

if __name__ == "__main__":
    main()
