import os
import uuid
import logging
import ffmpeg

logger = logging.getLogger(__name__)

VIDEO_DIR  = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'static', 'videos')
THUMB_DIR  = os.path.join(VIDEO_DIR, 'thumbs')
MAX_OUTPUT_BYTES = 20 * 1024 * 1024   # 20 MB hard cap
AUDIO_BITRATE    = 128_000            # 128k AAC
MAX_DURATION_SEC = 60


def _get_probe(path):
    try:
        return ffmpeg.probe(path)
    except ffmpeg.Error as e:
        raise RuntimeError(f"ffmpeg probe failed: {e.stderr.decode(errors='replace')}")


def _detect_orientation(probe):
    for stream in probe.get('streams', []):
        if stream.get('codec_type') == 'video':
            w = int(stream.get('width', 0))
            h = int(stream.get('height', 0))
            # Check rotation tag
            rotation = abs(int(stream.get('tags', {}).get('rotate', 0)))
            if rotation in (90, 270):
                w, h = h, w
            if w == h:
                return 'square', w, h
            return ('landscape', w, h) if w > h else ('portrait', w, h)
    raise RuntimeError("No video stream found in file.")


def _build_video_filter(orientation, src_w, src_h):
    target_w, target_h = 1080, 1920

    if orientation == 'portrait':
        # Scale to fill 1080x1920, crop centre
        scale_w = target_w
        scale_h = int(src_h * target_w / src_w)
        if scale_h < target_h:
            scale_h = target_h
            scale_w = int(src_w * target_h / src_h)
        return (
            f"scale={scale_w}:{scale_h},"
            f"crop={target_w}:{target_h}:(iw-{target_w})/2:(ih-{target_h})/2"
        )
    elif orientation == 'landscape':
        # Blur background + overlay centred
        return (
            f"[0:v]scale={target_w}:{target_h}:force_original_aspect_ratio=increase,"
            f"crop={target_w}:{target_h},boxblur=20:5[bg];"
            f"[0:v]scale={target_w}:-2[fg];"
            f"[bg][fg]overlay=(W-w)/2:(H-h)/2"
        )
    else:
        # Square — pad with black
        return (
            f"scale={target_w}:-2,"
            f"pad={target_w}:{target_h}:(ow-iw)/2:(oh-ih)/2:black"
        )


def process_video(input_path):
    os.makedirs(VIDEO_DIR, exist_ok=True)
    os.makedirs(THUMB_DIR, exist_ok=True)

    uid          = uuid.uuid4().hex
    output_name  = f"{uid}.mp4"
    thumb_name   = f"{uid}.jpg"
    output_path  = os.path.join(VIDEO_DIR, output_name)
    thumb_path   = os.path.join(THUMB_DIR, thumb_name)

    try:
        probe       = _get_probe(input_path)
        orientation, src_w, src_h = _detect_orientation(probe)

        # Raw duration — cap at MAX_DURATION_SEC
        raw_duration = float(probe['format'].get('duration', 0))
        duration     = min(raw_duration, MAX_DURATION_SEC)

        vf = _build_video_filter(orientation, src_w, src_h)

        # First pass: encode with crf=23
        _encode(input_path, output_path, vf, duration, crf=23)

        output_size = os.path.getsize(output_path)

        # If output exceeds 20 MB, re-encode with calculated bitrate
        if output_size > MAX_OUTPUT_BYTES:
            os.remove(output_path)
            audio_bits  = AUDIO_BITRATE * duration
            video_bits  = (MAX_OUTPUT_BYTES * 8) - audio_bits
            target_vbr  = max(int(video_bits / duration), 200_000)   # floor 200k
            _encode(input_path, output_path, vf, duration, vbr=target_vbr)
            output_size = os.path.getsize(output_path)

        # Extract thumbnail at 1 second (or 0 if shorter)
        thumb_ts = min(1.0, duration * 0.1)
        _extract_thumb(output_path, thumb_path, thumb_ts)

        size_mb = round(output_size / (1024 * 1024), 2)
        logger.info("Video processed: %s  %.2f MB  %s", output_name, size_mb, orientation)

        return {
            'video_url':  f'/static/videos/{output_name}',
            'thumb_url':  f'/static/videos/thumbs/{thumb_name}',
            'duration':   round(duration, 2),
            'style_used': orientation,
            'size_mb':    size_mb,
        }

    except Exception:
        # Clean up partial outputs on any failure
        for path in (output_path, thumb_path):
            if os.path.exists(path):
                try:
                    os.remove(path)
                except OSError:
                    pass
        raise


def _encode(input_path, output_path, vf, duration, crf=None, vbr=None):
    try:
        input_stream = ffmpeg.input(input_path, t=duration)

        if '|' in vf or ';' in vf:
            # Complex filter (landscape blur)
            stream = (
                ffmpeg
                .input(input_path, t=duration)
                .output(
                    output_path,
                    filter_complex=vf,
                    vcodec='libx264',
                    acodec='aac',
                    audio_bitrate='128k',
                    r=30,
                    movflags='faststart',
                    preset='fast',
                    **({'crf': crf} if crf else {'b:v': vbr}),
                )
                .overwrite_output()
            )
        else:
            audio = input_stream.audio
            video = input_stream.video.filter('fps', fps=30).filter_multi_output(0) if False else input_stream.video
            stream = (
                ffmpeg
                .input(input_path, t=duration)
                .output(
                    output_path,
                    vf=vf,
                    vcodec='libx264',
                    acodec='aac',
                    audio_bitrate='128k',
                    r=30,
                    movflags='faststart',
                    preset='fast',
                    **({'crf': crf} if crf else {'b:v': vbr}),
                )
                .overwrite_output()
            )

        stream.run(capture_stdout=True, capture_stderr=True)

    except ffmpeg.Error as e:
        stderr = e.stderr.decode(errors='replace') if e.stderr else ''
        logger.error("ffmpeg encode error: %s", stderr)
        raise RuntimeError(f"Video encoding failed: {stderr[-300:]}")
    except FileNotFoundError:
        raise RuntimeError("ffmpeg binary not found. Run: apt-get install ffmpeg")


def _extract_thumb(video_path, thumb_path, timestamp):
    try:
        (
            ffmpeg
            .input(video_path, ss=timestamp)
            .output(thumb_path, vframes=1, format='image2', vcodec='mjpeg')
            .overwrite_output()
            .run(capture_stdout=True, capture_stderr=True)
        )
    except ffmpeg.Error as e:
        stderr = e.stderr.decode(errors='replace') if e.stderr else ''
        raise RuntimeError(f"Thumbnail extraction failed: {stderr[-200:]}")
    except FileNotFoundError:
        raise RuntimeError("ffmpeg binary not found. Run: apt-get install ffmpeg")
