#!/usr/bin/env python3
"""
Convert ANSI terminal output to PNG image.

This script renders terminal output with ANSI colors to an actual image file,
providing true visual evidence of the TUI state.

Requirements:
    pip install pillow

Usage:
    python ansi_to_image.py input.txt output.png
"""

import sys
import re
from PIL import Image, ImageDraw, ImageFont

# ANSI color codes mapping to RGB
ANSI_COLORS = {
    # Standard colors (30-37)
    30: (0, 0, 0),          # Black
    31: (205, 49, 49),      # Red
    32: (13, 188, 121),     # Green
    33: (229, 229, 16),     # Yellow
    34: (36, 114, 200),     # Blue
    35: (188, 63, 188),     # Magenta
    36: (17, 168, 205),     # Cyan
    37: (229, 229, 229),    # White
    # Bright colors (90-97)
    90: (102, 102, 102),    # Bright Black
    91: (241, 76, 76),      # Bright Red
    92: (35, 209, 139),     # Bright Green
    93: (245, 245, 67),     # Bright Yellow
    94: (59, 142, 234),     # Bright Blue
    95: (214, 112, 214),    # Bright Magenta
    96: (41, 184, 219),     # Bright Cyan
    97: (255, 255, 255),    # Bright White
}

# Default terminal colors
DEFAULT_BG = (26, 26, 26)  # Dark background
DEFAULT_FG = (240, 240, 240)  # Light foreground

def parse_ansi(text):
    """Parse ANSI escape sequences and return styled text segments."""
    # Remove cursor escape sequences
    text = re.sub(r'\x1b\[\?25[hl]', '', text)
    text = re.sub(r'\x1b\[2J\x3b\[3J\x1b\[H', '\n', text)
    text = re.sub(r'\x1b\[2K', '', text)
    text = re.sub(r'\x1b\[1A', '', text)
    text = re.sub(r'\x1b\[G', '', text)

    lines = []
    for line in text.split('\n'):
        segments = []
        current_pos = 0

        # Pattern for ANSI SGR codes (colors, styles)
        ansi_pattern = r'\x1b\[([0-9;]*)m'

        parts = re.split(ansi_pattern, line)

        current_fg = DEFAULT_FG
        current_bg = None
        bold = False

        for i, part in enumerate(parts):
            if i % 2 == 0:
                # Text content
                if part:
                    segments.append({
                        'text': part,
                        'fg': current_fg,
                        'bg': current_bg,
                        'bold': bold
                    })
            else:
                # ANSI code
                codes = part.split(';') if part else ['0']
                for code in codes:
                    try:
                        code_num = int(code)
                    except ValueError:
                        continue

                    if code_num == 0:
                        # Reset
                        current_fg = DEFAULT_FG
                        current_bg = None
                        bold = False
                    elif code_num == 1:
                        bold = True
                    elif code_num == 22:
                        bold = False
                    elif 30 <= code_num <= 37:
                        current_fg = ANSI_COLORS.get(code_num, DEFAULT_FG)
                    elif 90 <= code_num <= 97:
                        current_fg = ANSI_COLORS.get(code_num, DEFAULT_FG)
                    elif code_num == 39:
                        current_fg = DEFAULT_FG

        lines.append(segments)

    return lines

def render_to_image(lines, output_path, cols=100, rows=30):
    """Render parsed ANSI lines to a PNG image."""
    # Terminal character dimensions
    char_width = 8
    char_height = 16
    padding = 10

    # Image dimensions
    width = cols * char_width + (padding * 2)
    height = rows * char_height + (padding * 2)

    # Create image with dark background
    img = Image.new('RGB', (width, height), DEFAULT_BG)
    draw = ImageDraw.Draw(img)

    # Try to load a monospace font, fallback to default
    try:
        font = ImageFont.truetype("/System/Library/Fonts/Menlo.ttc", 13)
    except:
        try:
            font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf", 13)
        except:
            font = ImageFont.load_default()

    # Render each line
    y = padding
    for line_segments in lines[:rows]:
        x = padding
        for segment in line_segments:
            text = segment['text']
            fg = segment['fg']
            bg = segment['bg']

            # Draw background if set
            if bg:
                text_width = len(text) * char_width
                draw.rectangle([x, y, x + text_width, y + char_height], fill=bg)

            # Draw text
            draw.text((x, y), text, fill=fg, font=font)
            x += len(text) * char_width

        y += char_height

    # Save image
    img.save(output_path, 'PNG')
    print(f"Rendered {len(lines)} lines to {output_path}")
    return img

def main():
    if len(sys.argv) < 3:
        print("Usage: python ansi_to_image.py input.txt output.png [cols] [rows]")
        sys.exit(1)

    input_file = sys.argv[1]
    output_file = sys.argv[2]
    cols = int(sys.argv[3]) if len(sys.argv) > 3 else 100
    rows = int(sys.argv[4]) if len(sys.argv) > 4 else 30

    # Read input
    with open(input_file, 'r', encoding='utf-8', errors='ignore') as f:
        content = f.read()

    # Parse ANSI
    lines = parse_ansi(content)

    # Render to image
    render_to_image(lines, output_file, cols, rows)
    print(f"✅ Image saved: {output_file}")

if __name__ == '__main__':
    main()
