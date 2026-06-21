#!/usr/bin/env python3
"""Generate a class diagram PNG for the project."""

import binascii
import struct
import zlib
from pathlib import Path

FONT = {
    "A": ["010", "101", "111", "101", "101"],
    "B": ["110", "101", "110", "101", "110"],
    "C": ["011", "100", "100", "100", "011"],
    "D": ["110", "101", "101", "101", "110"],
    "E": ["111", "100", "110", "100", "111"],
    "F": ["111", "100", "110", "100", "100"],
    "G": ["011", "100", "101", "101", "011"],
    "H": ["101", "101", "111", "101", "101"],
    "I": ["111", "010", "010", "010", "111"],
    "J": ["001", "001", "001", "101", "010"],
    "K": ["101", "110", "100", "110", "101"],
    "L": ["100", "100", "100", "100", "111"],
    "M": ["101", "111", "111", "101", "101"],
    "N": ["101", "111", "111", "111", "101"],
    "O": ["010", "101", "101", "101", "010"],
    "P": ["110", "101", "110", "100", "100"],
    "Q": ["010", "101", "101", "111", "011"],
    "R": ["110", "101", "110", "110", "101"],
    "S": ["011", "100", "010", "001", "110"],
    "T": ["111", "010", "010", "010", "010"],
    "U": ["101", "101", "101", "101", "011"],
    "V": ["101", "101", "101", "101", "010"],
    "W": ["101", "101", "111", "111", "101"],
    "X": ["101", "101", "010", "101", "101"],
    "Y": ["101", "101", "010", "010", "010"],
    "Z": ["111", "001", "010", "100", "111"],
    "0": ["111", "101", "101", "101", "111"],
    "1": ["010", "110", "010", "010", "111"],
    "2": ["111", "001", "111", "100", "111"],
    "3": ["111", "001", "111", "001", "111"],
    "4": ["101", "101", "111", "001", "001"],
    "5": ["111", "100", "111", "001", "111"],
    "6": ["111", "100", "111", "101", "111"],
    "7": ["111", "001", "010", "010", "010"],
    "8": ["111", "101", "111", "101", "111"],
    "9": ["111", "101", "111", "001", "111"],
    "_": ["000", "000", "000", "000", "111"],
    " ": ["000", "000", "000", "000", "000"],
}


def png_chunk(chunk_type, data):
    chunk = chunk_type + data
    return struct.pack('>I', len(data)) + chunk + struct.pack('>I', binascii.crc32(chunk) & 0xffffffff)


class PngCanvas:
    def __init__(self, width, height, background=(255, 255, 255)):
        self.width = width
        self.height = height
        self.pixels = [bytearray(background) for _ in range(width * height)]

    def set_pixel(self, x, y, color):
        if 0 <= x < self.width and 0 <= y < self.height:
            self.pixels[y * self.width + x][:] = color

    def draw_rect(self, x, y, w, h, border_color=(0, 0, 0), fill_color=None):
        if fill_color is not None:
            for iy in range(y + 1, y + h - 1):
                for ix in range(x + 1, x + w - 1):
                    self.set_pixel(ix, iy, fill_color)
        for ix in range(x, x + w):
            self.set_pixel(ix, y, border_color)
            self.set_pixel(ix, y + h - 1, border_color)
        for iy in range(y, y + h):
            self.set_pixel(x, iy, border_color)
            self.set_pixel(x + w - 1, iy, border_color)

    def draw_line(self, x1, y1, x2, y2, color=(0, 0, 0)):
        dx = abs(x2 - x1)
        dy = -abs(y2 - y1)
        sx = 1 if x1 < x2 else -1
        sy = 1 if y1 < y2 else -1
        err = dx + dy
        while True:
            self.set_pixel(x1, y1, color)
            if x1 == x2 and y1 == y2:
                break
            e2 = 2 * err
            if e2 >= dy:
                err += dy
                x1 += sx
            if e2 <= dx:
                err += dx
                y1 += sy

    def draw_arrow(self, x1, y1, x2, y2, color=(0, 0, 0)):
        self.draw_line(x1, y1, x2, y2, color)
        dx = x2 - x1
        dy = y2 - y1
        if dx == 0 and dy == 0:
            return
        length = max(abs(dx), abs(dy))
        ax = x2 - int(round(dx / max(length, 1)))
        ay = y2 - int(round(dy / max(length, 1)))
        self.draw_line(ax, ay, x2, y2, color)
        self.draw_line(ax + (1 if dy > 0 else -1), ay, x2, y2, color)

    def draw_text(self, text, x, y, scale=2, color=(0, 0, 0)):
        text = text.upper()
        orig_x = x
        for char in text:
            glyph = FONT.get(char, FONT[' '])
            for row_index, row in enumerate(glyph):
                for col_index, pixel in enumerate(row):
                    if pixel == '1':
                        for sy in range(scale):
                            for sx in range(scale):
                                self.set_pixel(x + col_index * scale + sx, y + row_index * scale + sy, color)
            x += (len(glyph[0]) + 1) * scale
        return x - orig_x

    def save_png(self, filename):
        raw_data = bytearray()
        for y in range(self.height):
            raw_data.append(0)
            row = self.pixels[y * self.width:(y + 1) * self.width]
            for pixel in row:
                raw_data.extend(pixel)
        compressed = zlib.compress(bytes(raw_data), level=9)
        with open(filename, 'wb') as file:
            file.write(b'\x89PNG\r\n\x1a\n')
            file.write(png_chunk(b'IHDR', struct.pack('>IIBBBBB', self.width, self.height, 8, 2, 0, 0, 0)))
            file.write(png_chunk(b'IDAT', compressed))
            file.write(png_chunk(b'IEND', b''))


def render_class_diagram(filename='classdiagram.png'):
    base_dir = Path(__file__).resolve().parent
    output_path = base_dir / filename
    width, height = 1200, 800
    canvas = PngCanvas(width, height)

    classes = [
        {'name': 'User', 'fields': ['id', 'email', 'passwordHash', 'role']},
        {'name': 'Meeting', 'fields': ['meetingId', 'hostId', 'shareToken', 'participants', 'status']},
        {'name': 'Message', 'fields': ['meetingId', 'userId', 'username', 'message', 'createdAt']},
        {'name': 'AIServiceManager', 'fields': ['checkHealth()', 'predictSign()', 'detectHands()', 'processVideo()']},
        {'name': 'SignLanguagePredictor', 'fields': ['predict_from_frame()', 'predict_from_video()', 'predict_from_landmarks()']},
        {'name': 'RealTimeSignRecognizer', 'fields': ['stream_recognition()', 'confidence_threshold']},
        {'name': 'HandLandmarkExtractor', 'fields': ['extract_landmarks_from_image()']},
    ]

    positions = [
        (80, 80),
        (420, 80),
        (760, 80),
        (80, 400),
        (420, 400),
        (760, 400),
        (420, 620),
    ]

    boxes = []
    for class_def, (x, y) in zip(classes, positions):
        w, h = 320, 180
        canvas.draw_rect(x, y, w, h, border_color=(0, 0, 0), fill_color=(245, 245, 245))
        title_x = x + 10
        title_y = y + 10
        canvas.draw_text(class_def['name'], title_x, title_y, scale=3)
        text_y = title_y + 22
        for field in class_def['fields']:
            canvas.draw_text(field, title_x, text_y, scale=2)
            text_y += 16
        boxes.append((x, y, w, h))

    # Draw relationships
    canvas.draw_arrow(240, 260, 580, 260)
    canvas.draw_arrow(560, 260, 900, 260)
    canvas.draw_arrow(240, 430, 580, 430)
    canvas.draw_arrow(560, 430, 900, 430)
    canvas.draw_arrow(580, 530, 580, 620)
    canvas.draw_arrow(240, 510, 500, 510)
    canvas.draw_arrow(900, 510, 640, 510)

    canvas.draw_text('uses', 470, 254, scale=2)
    canvas.draw_text('uses', 810, 254, scale=2)
    canvas.draw_text('depends', 470, 424, scale=2)
    canvas.draw_text('stores', 610, 560, scale=2)
    canvas.draw_text('extracts', 245, 504, scale=2)
    canvas.draw_text('streams', 810, 504, scale=2)

    canvas.save_png(output_path)
    print(f'Generated {output_path}')


if __name__ == '__main__':
    render_class_diagram()
