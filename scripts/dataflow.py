#!/usr/bin/env python3
"""Generate data flow diagrams for the project."""

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
        if length == 0:
            return
        ax = x2 - int(round(dx / length))
        ay = y2 - int(round(dy / length))
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


def draw_box(canvas, x, y, label, width=320, height=140):
    canvas.draw_rect(x, y, width, height, border_color=(0, 0, 0), fill_color=(240, 248, 255))
    canvas.draw_text(label, x + 10, y + 10, scale=3)
    return x, y, width, height


def draw_level0(filename='level0.png'):
    base_dir = Path(__file__).resolve().parent
    output_path = base_dir / filename
    width, height = 1200, 700
    canvas = PngCanvas(width, height)

    frontend = draw_box(canvas, 80, 220, 'Frontend', width=320, height=140)
    backend = draw_box(canvas, 440, 220, 'Backend API', width=320, height=140)
    ai_service = draw_box(canvas, 800, 220, 'Python AI Service', width=320, height=140)
    database = draw_box(canvas, 440, 440, 'MySQL Database', width=320, height=120)

    canvas.draw_arrow(frontend[0] + frontend[2], frontend[1] + 70, backend[0], backend[1] + 70)
    canvas.draw_arrow(backend[0] + backend[2], backend[1] + 40, ai_service[0], ai_service[1] + 40)
    canvas.draw_arrow(backend[0] + 160, backend[1] + backend[3], database[0] + 160, database[1])
    canvas.draw_arrow(database[0] + 160, database[1], backend[0] + 160, backend[1] + backend[3])

    canvas.draw_text('HTTP / REST', 340, 190, scale=2)
    canvas.draw_text('AI Proxy / Prediction', 620, 170, scale=2)
    canvas.draw_text('ORM / SQL', 560, 520, scale=2)

    canvas.save_png(output_path)
    print(f'Generated {output_path}')


def draw_level1(filename='level1.png'):
    base_dir = Path(__file__).resolve().parent
    output_path = base_dir / filename
    width, height = 1400, 950
    canvas = PngCanvas(width, height)

    frontend = draw_box(canvas, 80, 120, 'React UI', width=280, height=120)
    webrtc = draw_box(canvas, 80, 280, 'WebRTC', width=280, height=120)
    socket = draw_box(canvas, 80, 440, 'Socket.IO Client', width=280, height=120)

    auth = draw_box(canvas, 520, 80, 'Auth Service', width=260, height=120)
    meetings = draw_box(canvas, 520, 240, 'Meeting Service', width=260, height=120)
    ai_proxy = draw_box(canvas, 520, 400, 'AI Proxy', width=260, height=120)
    sql_db = draw_box(canvas, 520, 560, 'Sequelize / MySQL', width=260, height=120)

    ai = draw_box(canvas, 980, 220, 'Flask AI Service', width=320, height=120)
    model = draw_box(canvas, 980, 380, 'MediaPipe + TensorFlow', width=320, height=120)

    canvas.draw_arrow(frontend[0] + frontend[2], frontend[1] + 60, auth[0], auth[1] + 60)
    canvas.draw_arrow(frontend[0] + frontend[2], webrtc[1] + 60, webrtc[0], webrtc[1] + 60)
    canvas.draw_arrow(frontend[0] + frontend[2], socket[1] + 60, socket[0], socket[1] + 60)

    canvas.draw_arrow(auth[0] + auth[2], auth[1] + 60, meetings[0], meetings[1] + 60)
    canvas.draw_arrow(meetings[0] + meetings[2], meetings[1] + 60, ai_proxy[0], ai_proxy[1] + 60)
    canvas.draw_arrow(ai_proxy[0] + ai_proxy[2], ai_proxy[1] + 60, ai[0], ai[1] + 60)

    canvas.draw_arrow(meetings[0] + meetings[2], meetings[1] + 60, sql_db[0], sql_db[1] + 60)
    canvas.draw_arrow(sql_db[0] + sql_db[2], sql_db[1] + 60, meetings[0], meetings[1] + 60)
    canvas.draw_arrow(ai[0] + ai[2], ai[1] + 60, model[0], model[1] + 60)

    canvas.draw_text('JWT / REST', 440, 145, scale=2)
    canvas.draw_text('Peer signaling', 430, 345, scale=2)
    canvas.draw_text('Events / Chat', 410, 505, scale=2)
    canvas.draw_text('Sign prediction', 760, 330, scale=2)
    canvas.draw_text('Video / landmarks', 1010, 325, scale=2)
    canvas.draw_text('Model inference', 1110, 470, scale=2)

    canvas.save_png(output_path)
    print(f'Generated {output_path}')


if __name__ == '__main__':
    draw_level0()
    draw_level1()
